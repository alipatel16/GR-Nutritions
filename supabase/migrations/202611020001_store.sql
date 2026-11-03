create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.staff_memberships (
  firebase_uid text primary key check(length(firebase_uid) between 1 and 128),
  created_at timestamptz not null default now()
);
create table public.store_products (
  id text primary key,
  slug text not null unique,
  status text not null check(status in ('draft','active','archived')),
  payload jsonb not null,
  updated_at timestamptz not null default clock_timestamp()
);
create table public.store_variants (
  id text primary key,
  product_id text not null references public.store_products(id) on delete cascade,
  sku text not null unique check(sku = upper(trim(sku))),
  price_paise integer not null check(price_paise between 1 and 100000000),
  mrp_paise integer not null check(mrp_paise >= price_paise),
  stock integer not null check(stock between 0 and 1000000)
);
create index on public.store_variants(product_id);
create table public.delivery_addresses (
  id text primary key default gen_random_uuid()::text,
  firebase_uid text not null,
  payload jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.delivery_addresses(firebase_uid);
create unique index one_default_address on public.delivery_addresses(firebase_uid) where is_default;
create table public.store_orders (
  id text primary key,
  firebase_uid text not null,
  status text not null check(status in ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  total_paise bigint not null check(total_paise > 0),
  currency text not null default 'INR' check(currency = 'INR'),
  items jsonb not null,
  address jsonb not null,
  created_at timestamptz not null default now()
);
create index on public.store_orders(firebase_uid,created_at desc);
create table private.product_media (
  path text primary key,
  product_id text not null,
  mime text not null check(mime in ('image/jpeg','image/png','image/webp')),
  size_bytes integer not null check(size_bytes between 1 and 6291456),
  uploaded_by text not null,
  created_at timestamptz not null default now()
);
create table private.audit_events (
  id bigint generated always as identity primary key,
  actor_uid text not null,
  action text not null,
  resource_id text not null,
  created_at timestamptz not null default now()
);
create table private.request_limits (
  uid text not null,
  window_start timestamptz not null,
  requests integer not null default 1,
  primary key(uid,window_start)
);

alter table public.store_products enable row level security;
alter table public.store_variants enable row level security;
alter table public.delivery_addresses enable row level security;
alter table public.store_orders enable row level security;
revoke all on public.store_products, public.store_variants, public.delivery_addresses, public.store_orders from public, anon, authenticated;
-- No client table policies: authenticated private operations go through verified Edge requests.

create function private.product_document(p public.store_products) returns jsonb
language sql stable set search_path = '' as $$
  select p.payload || jsonb_build_object('updatedAt',p.updated_at,
    'variants',coalesce((select jsonb_agg(v.value || jsonb_build_object(
      'stockAvailable',s.stock,'price',jsonb_build_object('currency','INR','amountPaise',s.price_paise),
      'mrp',jsonb_build_object('currency','INR','amountPaise',s.mrp_paise)) order by v.ordinality)
      from jsonb_array_elements(p.payload->'variants') with ordinality v(value,ordinality)
      join public.store_variants s on s.id = v.value->>'id' and s.product_id = p.id),'[]'::jsonb))
$$;

create function public.catalog_products() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(private.product_document(p) order by (p.payload->>'featuredRank')::int,p.id),'[]'::jsonb)
  from public.store_products p where p.status = 'active'
$$;

create function public.customer_action(p_uid text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.delivery_addresses; aid text; body jsonb; lines jsonb := '[]'; item jsonb;
  v public.store_variants; p public.store_products; qty integer; total bigint := 0; result jsonb;
begin
  if coalesce(length(p_uid),0) not between 1 and 128 and p_action <> 'media.allowed' then raise exception 'Invalid identity'; end if;
  if p_action = 'role.get' then
    return jsonb_build_object('isAdmin',exists(select 1 from private.staff_memberships where firebase_uid=p_uid));
  elsif p_action = 'media.allowed' then
    return to_jsonb(exists(select 1 from private.staff_memberships where firebase_uid=p_uid) or exists(
      select 1 from public.store_products sp,jsonb_array_elements(sp.payload->'media') m
      where sp.status='active' and m->>'storagePath'=p_payload->>'path'));
  elsif p_action = 'addresses.list' then
    return coalesce((select jsonb_agg(payload || jsonb_build_object('id',id,'isDefault',is_default) order by created_at,id)
      from public.delivery_addresses where firebase_uid=p_uid),'[]');
  elsif p_action in ('address.save','address.default','address.remove') then
    -- Serialize per customer so two simultaneous requests cannot create two defaults.
    perform pg_advisory_xact_lock(hashtextextended(p_uid,0));
    aid := p_payload->>'id';
    if aid is not null then
      select * into a from public.delivery_addresses where id=aid and firebase_uid=p_uid for update;
      if not found then raise exception 'Address not found'; end if;
    elsif p_action <> 'address.save' then raise exception 'Address not found';
    end if;
    if p_action='address.remove' then
      delete from public.delivery_addresses where id=aid and firebase_uid=p_uid;
      if a.is_default then
        update public.delivery_addresses set is_default=true where id=(
          select id from public.delivery_addresses where firebase_uid=p_uid order by created_at,id limit 1);
      end if;
      return '{}';
    elsif p_action='address.default' then
      update public.delivery_addresses set is_default=false where firebase_uid=p_uid and is_default;
      update public.delivery_addresses set is_default=true where id=aid and firebase_uid=p_uid;
      return '{}';
    end if;
    body := p_payload->'address';
    if jsonb_typeof(body)<>'object' or length(body->>'fullName') not between 2 and 100
      or coalesce(body->>'phone','') !~ '^[6-9][0-9]{9}$' or coalesce(body->>'pincode','') !~ '^[1-9][0-9]{5}$'
      or coalesce(length(body->>'line1'),0) not between 5 and 200
      or coalesce(length(body->>'label'),0) not between 1 and 40
      or coalesce(length(body->>'city'),0) not between 2 and 100 then raise exception 'Invalid delivery address'; end if;
    if aid is null and (select count(*) from public.delivery_addresses where firebase_uid=p_uid)>=20 then raise exception 'Maximum 20 saved addresses'; end if;
    if coalesce((body->>'isDefault')::boolean,false) or not exists(select 1 from public.delivery_addresses where firebase_uid=p_uid and is_default) then
      update public.delivery_addresses set is_default=false where firebase_uid=p_uid and is_default;
      body := body || '{"isDefault":true}';
    end if;
    aid := coalesce(aid,gen_random_uuid()::text);
    insert into public.delivery_addresses(id,firebase_uid,payload,is_default) values(aid,p_uid,body-'id'-'isDefault',coalesce((body->>'isDefault')::boolean,false))
      on conflict(id) do update set payload=excluded.payload,is_default=excluded.is_default;
    -- Editing the existing default with the checkbox cleared preserves a usable default.
    if not exists(select 1 from public.delivery_addresses where firebase_uid=p_uid and is_default) then
      update public.delivery_addresses set is_default=true where id=aid;
    end if;
    return jsonb_build_object('id',aid);
  elsif p_action='orders.list' then
    return coalesce((select jsonb_agg(jsonb_build_object('id',id,'status',status,'totalPaise',total_paise,
      'currency',currency,'items',items,'createdAt',created_at) order by created_at desc)
      from public.store_orders where firebase_uid=p_uid),'[]');
  elsif p_action='checkout.quote' then
    if not exists(select 1 from public.delivery_addresses where id=p_payload->>'addressId' and firebase_uid=p_uid) then raise exception 'Address not found'; end if;
    if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items') not between 1 and 20 then raise exception 'Invalid cart'; end if;
    if (select count(*)<>count(distinct x->>'variantId') from jsonb_array_elements(p_payload->'items') x) then raise exception 'Duplicate product option'; end if;
    for item in select * from jsonb_array_elements(p_payload->'items') loop
      if coalesce(item->>'quantity','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid quantity'; end if;
      qty := (item->>'quantity')::integer;
      if qty not between 1 and 99 then raise exception 'Invalid quantity'; end if;
      select * into v from public.store_variants where id=item->>'variantId' and product_id=item->>'productId';
      if not found or v.stock<qty then raise exception 'A product is unavailable or has insufficient stock'; end if;
      select * into p from public.store_products where id=v.product_id and status='active';
      if not found then raise exception 'A product is unavailable'; end if;
      lines := lines || jsonb_build_array(jsonb_build_object('productId',p.id,'variantId',v.id,'productName',p.payload->>'name',
        'quantity',qty,'unitPricePaise',v.price_paise));
      total := total + qty::bigint*v.price_paise;
    end loop;
    return jsonb_build_object('currency','INR','totalPaise',total,'items',lines,'expiresAt',clock_timestamp()+interval '5 minutes');
  end if;
  raise exception 'Unknown action';
end $$;

create function public.admin_action(p_uid text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare existing public.store_products; doc jsonb; variant jsonb; medium jsonb; stamp timestamptz; current_status text; result jsonb;
begin
  if not exists(select 1 from private.staff_memberships where firebase_uid=p_uid) then raise exception 'Staff access required'; end if;
  if p_action='products.list' then
    return coalesce((select jsonb_agg(private.product_document(p) order by p.updated_at desc) from public.store_products p),'[]');
  elsif p_action='orders.list' then
    return coalesce((select jsonb_agg(jsonb_build_object('id',id,'userId',firebase_uid,'status',status,'totalPaise',total_paise,
      'items',items,'address',address,'createdAt',created_at) order by created_at desc) from public.store_orders),'[]');
  elsif p_action='product.save' then
    if coalesce(p_payload->>'id','') !~ '^[a-zA-Z0-9_-]{1,100}$' or coalesce(p_payload->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or coalesce(length(p_payload->>'name'),0)<2 or jsonb_typeof(p_payload->'variants')<>'array'
      or jsonb_array_length(p_payload->'variants') not between 1 and 30 then raise exception 'Invalid product'; end if;
    perform pg_advisory_xact_lock(hashtextextended(p_payload->>'id',1));
    select * into existing from public.store_products where id=p_payload->>'id' for update;
    if found and (p_payload->>'updatedAt' is null or (p_payload->>'updatedAt')::timestamptz<>existing.updated_at) then
      raise exception 'Product changed since you opened it. Reload before saving.';
    elsif not found and p_payload->>'updatedAt' is not null then raise exception 'Product no longer exists'; end if;
    doc := p_payload-'updatedAt';
    doc := jsonb_set(doc,'{media}','[]');
    for medium in select * from jsonb_array_elements(coalesce(p_payload->'media','[]')) loop
      if medium->>'storagePath' is null or not exists(select 1 from private.product_media where path=medium->>'storagePath' and product_id=p_payload->>'id') then
        raise exception 'Product image must be uploaded and verified first';
      end if;
      doc := jsonb_set(doc,'{media}',(doc->'media') || jsonb_build_array(medium-'uri'));
    end loop;
    stamp := clock_timestamp();
    insert into public.store_products(id,slug,status,payload,updated_at) values(doc->>'id',doc->>'slug',doc->>'status',doc,stamp)
      on conflict(id) do update set slug=excluded.slug,status=excluded.status,payload=excluded.payload,updated_at=excluded.updated_at;
    delete from public.store_variants where product_id=doc->>'id';
    for variant in select * from jsonb_array_elements(doc->'variants') loop
      insert into public.store_variants(id,product_id,sku,price_paise,mrp_paise,stock) values(variant->>'id',doc->>'id',upper(trim(variant->>'sku')),
        (variant#>>'{price,amountPaise}')::integer,(variant#>>'{mrp,amountPaise}')::integer,(variant->>'stockAvailable')::integer);
    end loop;
    insert into private.audit_events(actor_uid,action,resource_id) values(p_uid,p_action,doc->>'id');
    select private.product_document(p) into result from public.store_products p where id=doc->>'id';
    return result;
  elsif p_action='order.advance' then
    select status into current_status from public.store_orders where id=p_payload->>'id' for update;
    if not found then raise exception 'Order not found'; end if;
    if not ((current_status='paid' and p_payload->>'status'='processing') or (current_status='processing' and p_payload->>'status'='shipped')
      or (current_status='shipped' and p_payload->>'status'='delivered')) then raise exception 'Invalid order transition'; end if;
    update public.store_orders set status=p_payload->>'status' where id=p_payload->>'id';
    insert into private.audit_events(actor_uid,action,resource_id) values(p_uid,p_action,p_payload->>'id');
    return jsonb_build_object('status',p_payload->>'status');
  elsif p_action='media.register' then
    insert into private.product_media(path,product_id,mime,size_bytes,uploaded_by) values(p_payload->>'path',p_payload->>'productId',p_payload->>'mime',(p_payload->>'size')::int,p_uid)
      on conflict(path) do nothing;
    return '{}';
  end if;
  raise exception 'Unknown action';
end $$;

create function public.consume_store_request(p_uid text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare count_now int;
begin
  insert into private.request_limits(uid,window_start) values(p_uid,date_trunc('minute',clock_timestamp()))
    on conflict(uid,window_start) do update set requests=private.request_limits.requests+1 returning requests into count_now;
  delete from private.request_limits where window_start<now()-interval '1 hour';
  return count_now<=60;
end $$;

revoke all on function public.catalog_products() from public;
grant execute on function public.catalog_products() to anon,authenticated,service_role;
revoke all on function public.customer_action(text,text,jsonb), public.admin_action(text,text,jsonb),public.consume_store_request(text) from public,anon,authenticated;
grant execute on function public.customer_action(text,text,jsonb), public.admin_action(text,text,jsonb),public.consume_store_request(text) to service_role;
revoke all on all functions in schema private from public,anon,authenticated;
