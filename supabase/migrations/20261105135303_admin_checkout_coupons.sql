-- Definitions and capacity are server-owned. Never expose these tables to clients.
create table private.coupons (
 id text primary key default gen_random_uuid()::text,
 code text not null unique check(code ~ '^[A-Z0-9_-]{3,32}$'),
 discount_type text not null check(discount_type in ('percentage','fixed')),
 value_hundredths bigint not null check(value_hundredths between 1 and 100000000),
 min_spend_paise bigint not null check(min_spend_paise between 0 and 100000000),
 max_discount_paise bigint check(max_discount_paise between 1 and 100000000),
 starts_at timestamptz, expires_at timestamptz not null,
 usage_limit integer not null check(usage_limit between 1 and 1000000),
 enabled boolean not null default false,
 version integer not null default 1,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 check(discount_type<>'percentage' or value_hundredths<=10000),
 check(discount_type<>'fixed' or max_discount_paise is null),
 check(starts_at is null or starts_at<expires_at)
);
create table private.coupon_redemptions (
 order_id text primary key references public.store_orders(id),
 coupon_id text not null references private.coupons(id),
 firebase_uid text not null, mode text not null check(mode in ('test','live')),
 state text not null check(state in ('held','used','released')),
 created_at timestamptz not null default clock_timestamp()
);
create unique index coupon_customer_once on private.coupon_redemptions(coupon_id,mode,firebase_uid) where state in ('held','used');
create index coupon_capacity on private.coupon_redemptions(coupon_id,mode,state);
alter table private.coupons enable row level security;
alter table private.coupon_redemptions enable row level security;
revoke all on private.coupons,private.coupon_redemptions from public,anon,authenticated,service_role;
alter table public.store_orders add column coupon_id text references private.coupons(id),
 add column coupon_code text,
 add column discount_paise bigint not null default 0 check(discount_paise>=0);

create function private.coupon_document(c private.coupons) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',c.id,'code',c.code,'type',c.discount_type,'value',c.value_hundredths::numeric/100,
  'minSpendPaise',c.min_spend_paise,'maxDiscountPaise',c.max_discount_paise,'startsAt',c.starts_at,'expiresAt',c.expires_at,
  'usageLimit',c.usage_limit,'enabled',c.enabled,'version',c.version,'createdAt',c.created_at,'updatedAt',c.updated_at,
  'usedCount',counts.used,'reservedCount',counts.held,'remainingCount',greatest(0,c.usage_limit-counts.used-counts.held))
 from (select count(*) filter(where state='used') as used,count(*) filter(where state='held') as held
  from private.coupon_redemptions where coupon_id=c.id and mode='live') counts
$$;

create function private.coupon_manage(p_uid text,p_action text,p_payload jsonb) returns jsonb language plpgsql set search_path='' as $$
declare c private.coupons; code_value text; value_scaled numeric; minimum numeric; maximum numeric; limit_value numeric; start_value timestamptz; expiry_value timestamptz;
begin
 if not exists(select 1 from private.staff_memberships where firebase_uid=p_uid) then raise exception 'Staff access required';end if;
 if p_action='coupon.adminList' then
  if length(coalesce(p_payload->>'search',''))>100 then raise exception 'Invalid coupon settings';end if;
  return jsonb_build_object('coupons',coalesce((select jsonb_agg(private.coupon_document(row) order by row.created_at desc,row.id)
   from private.coupons row where position(upper(trim(coalesce(p_payload->>'search',''))) in row.code)>0),'[]'::jsonb));
 end if;
 code_value:=upper(trim(p_payload->>'code'));
 if coalesce(code_value,'') !~ '^[A-Z0-9_-]{3,32}$' or coalesce(p_payload->>'type','') not in ('percentage','fixed')
  or jsonb_typeof(p_payload->'value') is distinct from 'number' or jsonb_typeof(p_payload->'minSpendPaise') is distinct from 'number'
  or jsonb_typeof(p_payload->'usageLimit') is distinct from 'number' or jsonb_typeof(p_payload->'enabled') is distinct from 'boolean'
  or jsonb_typeof(p_payload->'expiresAt') is distinct from 'string'
  or (p_payload->'startsAt' is not null and p_payload->'startsAt'<>'null'::jsonb and jsonb_typeof(p_payload->'startsAt')<>'string')
  or (p_payload->'maxDiscountPaise' is not null and p_payload->'maxDiscountPaise'<>'null'::jsonb and jsonb_typeof(p_payload->'maxDiscountPaise')<>'number')
  then raise exception 'Invalid coupon settings';end if;
 begin
  value_scaled:=(p_payload->>'value')::numeric*100;minimum:=(p_payload->>'minSpendPaise')::numeric;
  maximum:=(p_payload->>'maxDiscountPaise')::numeric;limit_value:=(p_payload->>'usageLimit')::numeric;
  if coalesce(p_payload->>'expiresAt','') !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$'
   or (p_payload->>'startsAt' is not null and p_payload->>'startsAt' !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$') then raise exception 'Invalid coupon settings';end if;
  start_value:=(p_payload->>'startsAt')::timestamptz;expiry_value:=(p_payload->>'expiresAt')::timestamptz;
 exception when others then raise exception 'Invalid coupon settings';end;
 if value_scaled<>trunc(value_scaled) or value_scaled not between 1 and 100000000
  or (p_payload->>'type'='percentage' and value_scaled>10000) or minimum<>trunc(minimum) or minimum not between 0 and 100000000
  or maximum<>trunc(maximum) or maximum not between 1 and 100000000 or (p_payload->>'type'='fixed' and maximum is not null)
  or limit_value<>trunc(limit_value) or limit_value not between 1 and 1000000 or start_value>=expiry_value then raise exception 'Invalid coupon settings';end if;
 if exists(select 1 from private.coupons where code=code_value and id is distinct from p_payload->>'id') then raise exception 'Coupon code already exists';end if;
 if p_payload->>'id' is not null then
  select * into c from private.coupons where id=p_payload->>'id' for update;
  if not found then raise exception 'Coupon not found';end if;
  if exists(select 1 from private.coupon_redemptions where coupon_id=c.id and state in ('held','used') group by mode having count(*)>limit_value)
   then raise exception 'Coupon limit cannot be below existing uses and reservations';end if;
  -- A code remains attached to its identity and audit history even when renamed.
  update private.coupons set code=code_value,discount_type=p_payload->>'type',value_hundredths=value_scaled,min_spend_paise=minimum,
   max_discount_paise=maximum,starts_at=start_value,expires_at=expiry_value,usage_limit=limit_value,enabled=(p_payload->>'enabled')::boolean,
   version=version+1,updated_at=clock_timestamp() where id=c.id returning * into c;
 else
  insert into private.coupons(code,discount_type,value_hundredths,min_spend_paise,max_discount_paise,starts_at,expires_at,usage_limit,enabled)
  values(code_value,p_payload->>'type',value_scaled,minimum,maximum,start_value,expiry_value,limit_value,(p_payload->>'enabled')::boolean) returning * into c;
 end if;
 insert into private.audit_events(actor_uid,action,resource_id) values(p_uid,p_action,c.id);
 return private.coupon_document(c);
end $$;

-- Caller holds the same transaction lock as inventory/order mutations.
create function private.coupon_has_capacity(p_coupon text,p_uid text,p_mode text,p_order text default '') returns boolean language sql stable set search_path='' as $$
 select not exists(select 1 from private.coupon_redemptions where coupon_id=p_coupon and mode=p_mode and firebase_uid=p_uid and state in ('held','used') and order_id<>p_order)
 and (select count(*) from private.coupon_redemptions where coupon_id=p_coupon and mode=p_mode and state in ('held','used') and order_id<>p_order)
  < (select usage_limit from private.coupons where id=p_coupon)
$$;
create function private.coupon_discount(p_uid text,p_code text,p_mode text,p_subtotal bigint) returns jsonb language plpgsql set search_path='' as $$
declare c private.coupons; discount bigint;
begin
 select * into c from private.coupons where code=upper(trim(p_code));
 if not found then raise exception 'Coupon not found';end if;
 if not c.enabled or (c.starts_at is not null and c.starts_at>clock_timestamp()) then raise exception 'Coupon is not active';end if;
 if c.expires_at<=clock_timestamp() then raise exception 'Coupon has expired';end if;
 if p_subtotal<c.min_spend_paise then raise exception 'Coupon minimum spend is not met';end if;
 if exists(select 1 from private.coupon_redemptions where coupon_id=c.id and mode=p_mode and firebase_uid=p_uid and state in ('held','used')) then raise exception 'Coupon already used or reserved by your account';end if;
 if not private.coupon_has_capacity(c.id,p_uid,p_mode) then raise exception 'Coupon usage limit reached';end if;
 discount:=case when c.discount_type='fixed' then c.value_hundredths else floor(p_subtotal::numeric*c.value_hundredths/10000)::bigint end;
 discount:=least(discount,coalesce(c.max_discount_paise,discount),greatest(0,p_subtotal-100));
 if discount<=0 then raise exception 'Coupon minimum spend is not met';end if;
 return jsonb_build_object('couponId',c.id,'couponCode',c.code,'discountPaise',discount);
end $$;

create or replace function private.order_summary(o public.store_orders) returns jsonb language sql stable set search_path='' as $$
 select jsonb_strip_nulls(jsonb_build_object('id',o.id,'status',o.status,'mode',o.mode,'paymentMethod',o.payment_method,
 'currency',o.currency,'subtotalPaise',o.subtotal_paise,'shippingPaise',o.shipping_paise,'codFeePaise',o.cod_fee_paise,
 'totalPaise',o.total_paise,'items',o.items,'createdAt',o.created_at,'tracking',o.tracking))
 ||case when o.coupon_id is not null then jsonb_build_object('couponCode',o.coupon_code,'discountPaise',o.discount_paise,'discountedSubtotalPaise',o.subtotal_paise-o.discount_paise) else '{}'::jsonb end
$$;

create or replace function private.expire_reservations() returns void language plpgsql set search_path='' as $$
declare o public.store_orders;
begin
 if not exists(select 1 from public.store_orders where reservation_state='held' and reservation_expires_at<=clock_timestamp())
  and not exists(select 1 from private.coupon_redemptions r join public.store_orders orders on orders.id=r.order_id where r.state='held' and orders.reservation_expires_at<=clock_timestamp()) then return;end if;
 perform pg_advisory_xact_lock(764392010);
 for o in select * from public.store_orders where reservation_state='held' and reservation_expires_at<=clock_timestamp() order by id for update loop
  perform private.touch_inventory(o.items,1);
  update public.store_orders set reservation_state='released',status=case when status='payment_review' then status else 'payment_expired' end where id=o.id;
 end loop;
 -- Test-mode coupon holds expire too, without touching live stock.
 update public.store_orders orders set status='payment_expired' where orders.status='payment_pending' and orders.reservation_expires_at<=clock_timestamp()
  and exists(select 1 from private.coupon_redemptions r where r.order_id=orders.id and r.state='held');
 update private.coupon_redemptions r set state='released' from public.store_orders orders where orders.id=r.order_id and r.state='held'
  and orders.reservation_expires_at<=clock_timestamp();
end $$;

create or replace function private.checkout_context(p_uid text,p_payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare a jsonb; item jsonb; variant_doc jsonb; v public.store_variants; p public.store_products;
 lines jsonb:='[]'; qty integer; subtotal bigint:=0; shipping integer; codfee integer;
 grams numeric:=0; packed_grams numeric; ship jsonb; coupon jsonb; discount bigint:=0;
begin
 if p_payload->>'mode' not in ('test','live') or p_payload->>'paymentMethod' not in ('razorpay','cod') then raise exception 'Invalid checkout'; end if;
 select payload into a from public.delivery_addresses where id=p_payload->>'addressId' and firebase_uid=p_uid;
 if not found then raise exception 'Address not found'; end if;
 if coalesce(p_payload->>'customerEmail','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_payload->>'customerEmail')>254 then raise exception 'Your signed-in account needs a valid email address to check delivery.';end if;
 if p_payload->>'paymentMethod'='cod' and coalesce((p_payload->>'customerEmailVerified')::boolean,false) is not true then raise exception 'Verify your email address before choosing cash on delivery.';end if;
 -- The Edge passes only signed Firebase claims. Saved-address/body email never wins.
 a:=a||jsonb_build_object('email',p_payload->>'customerEmail');
 if jsonb_typeof(p_payload->'items') is distinct from 'array' or jsonb_array_length(p_payload->'items') not between 1 and 20 then raise exception 'Invalid cart'; end if;
 if (select count(*)<>count(distinct x->>'variantId') from jsonb_array_elements(p_payload->'items') x) then raise exception 'Duplicate product option'; end if;
 for item in select * from jsonb_array_elements(p_payload->'items') order by value->>'variantId' loop
  if coalesce(item->>'quantity','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid quantity'; end if;
  qty:=(item->>'quantity')::integer;
  if qty not between 1 and 99 then raise exception 'Invalid quantity'; end if;
  select * into v from public.store_variants where id=item->>'variantId' and product_id=item->>'productId';
  if not found or v.stock<qty then raise exception 'A product is unavailable or has insufficient stock'; end if;
  select * into p from public.store_products where id=v.product_id and status='active';
  if not found then raise exception 'A product is unavailable'; end if;
  select x into variant_doc from jsonb_array_elements(p.payload->'variants') x where x->>'id'=v.id;
  ship:=variant_doc->'shipping';
  -- Older products have net weight only. Add a conservative packaging allowance.
  if ship is null or ship='null'::jsonb then
   if jsonb_typeof(variant_doc->'weightGrams') is distinct from 'number' then raise exception 'Packed shipping weight is missing. Please contact the store.'; end if;
   if (variant_doc->>'weightGrams')::numeric not between 1 and 100000 then raise exception 'Packed shipping weight is invalid. Please contact the store.'; end if;
   ship:=jsonb_build_object('weightGrams',ceil((variant_doc->>'weightGrams')::numeric*1.1)+100);
  end if;
  if jsonb_typeof(ship->'weightGrams') is distinct from 'number' then raise exception 'Packed shipping weight is missing. Please contact the store.'; end if;
  packed_grams:=(ship->>'weightGrams')::numeric;
  if packed_grams not between 1 and 100000 then raise exception 'Packed shipping weight is invalid. Please contact the store.'; end if;
  grams:=grams+packed_grams*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('productId',p.id,'variantId',v.id,'productName',p.payload->>'name','sku',v.sku,
   'quantity',qty,'unitPricePaise',v.price_paise,'shipping',ship));
  subtotal:=subtotal+qty::bigint*v.price_paise;
 end loop;
 if grams>100000 or subtotal>100000000 then raise exception 'This cart exceeds one parcel. Please contact the store.'; end if;
 if nullif(trim(p_payload->>'couponCode'),'') is not null then
  coupon:=private.coupon_discount(p_uid,p_payload->>'couponCode',p_payload->>'mode',subtotal);
  discount:=(coupon->>'discountPaise')::bigint;
 end if;
 shipping:=case when subtotal-discount>99900 then 0 else 5000 end;
 codfee:=case when p_payload->>'paymentMethod'='cod' then 20000 else 0 end;
 return jsonb_build_object('mode',p_payload->>'mode','paymentMethod',p_payload->>'paymentMethod','addressId',p_payload->>'addressId',
  'customerEmail',p_payload->>'customerEmail','customerEmailVerified',coalesce((p_payload->>'customerEmailVerified')::boolean,false),
  'address',a,'items',lines,'subtotalPaise',subtotal,'shippingPaise',shipping,'codFeePaise',codfee,'totalPaise',subtotal-discount+shipping+codfee,'currency','INR',
  'parcel',jsonb_build_object('weightGrams',grams))
  ||coalesce(coupon||jsonb_build_object('discountedSubtotalPaise',subtotal-discount),'{}'::jsonb);
end $$;


create or replace function public.checkout_action(p_uid text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb; q private.checkout_quotes; o public.store_orders; pay jsonb; item jsonb; can_reserve boolean; shipment jsonb;
begin
 if p_action in ('context','quote.store','order.begin','order.get','order.provider','shipment.get','shipment.begin') and coalesce(length(p_uid),0) not between 1 and 128 then raise exception 'Invalid identity'; end if;
 perform pg_advisory_xact_lock(764392010);
 perform private.expire_reservations();
 if p_action in ('coupon.adminList','coupon.save') then return private.coupon_manage(p_uid,p_action,p_payload);
 elsif p_action='context' then return private.checkout_context(p_uid,p_payload);
 elsif p_action='quote.store' then
  c:=private.checkout_context(p_uid,p_payload->'context');
  if c is distinct from p_payload->'context' then raise exception 'Cart changed. Please check delivery again.'; end if;
  if coalesce(p_payload#>>'{delivery,courierId}','') !~ '^[0-9]+$' or coalesce(length(p_payload->>'pickupLocation'),0) not between 1 and 100 then raise exception 'Delivery is unavailable'; end if;
  insert into private.checkout_quotes(firebase_uid,context,delivery,pickup_location) values(p_uid,c,p_payload->'delivery',p_payload->>'pickupLocation') returning * into q;
  return jsonb_build_object('quoteId',q.id,'mode',c->>'mode','currency','INR','subtotalPaise',c->'subtotalPaise','shippingPaise',c->'shippingPaise','codFeePaise',c->'codFeePaise',
   'totalPaise',c->'totalPaise','couponCode',c->'couponCode','discountPaise',coalesce(c->'discountPaise','0'::jsonb),'discountedSubtotalPaise',coalesce(c->'discountedSubtotalPaise',c->'subtotalPaise'),'expiresAt',q.expires_at,'items',(select jsonb_agg(x-'shipping'-'sku') from jsonb_array_elements(c->'items') x),'delivery',q.delivery);
 elsif p_action='order.begin' then
  if coalesce(p_payload->>'requestKey','') !~ '^[a-zA-Z0-9_-]{8,100}$' then raise exception 'Invalid checkout request'; end if;
  select * into q from private.checkout_quotes where id=p_payload->>'quoteId' and firebase_uid=p_uid for update;
  if not found then raise exception 'Quote not found'; end if;
  select * into o from public.store_orders where firebase_uid=p_uid and (request_key=p_payload->>'requestKey' or quote_id=q.id) order by created_at limit 1 for update;
  if found then
   if o.quote_id<>q.id then raise exception 'Checkout request is already used'; end if;
   return jsonb_build_object('order',private.order_summary(o),'providerOrderId',o.razorpay_order_id,'performCreate',false);
  end if;
  if q.context->>'mode' is distinct from p_payload->>'mode' then raise exception 'Payment mode changed. Please check delivery again.'; end if;
  if q.expires_at<=clock_timestamp() then raise exception 'Quote expired. Please check delivery again.'; end if;
  c:=private.checkout_context(p_uid,q.context);
  if c is distinct from q.context then raise exception 'Cart changed. Please check delivery again.'; end if;
  if c->>'mode'='live' then perform private.touch_inventory(c->'items',-1); end if;
  insert into public.store_orders(id,firebase_uid,status,total_paise,items,address,mode,payment_method,subtotal_paise,shipping_paise,cod_fee_paise,
   quote_id,request_key,provider_state,reservation_state,reservation_expires_at,parcel,pickup_location,delivery,coupon_id,coupon_code,discount_paise)
  values(gen_random_uuid()::text,p_uid,case when c->>'paymentMethod'='cod' then 'cod_confirmed' else 'payment_pending' end,
   (c->>'totalPaise')::bigint,c->'items',c->'address',c->>'mode',c->>'paymentMethod',(c->>'subtotalPaise')::bigint,(c->>'shippingPaise')::integer,(c->>'codFeePaise')::integer,
   q.id,p_payload->>'requestKey',case when c->>'paymentMethod'='razorpay' then 'creating' else 'none' end,
   case when c->>'mode'='test' then 'none' when c->>'paymentMethod'='cod' then 'committed' else 'held' end,
   case when (c->>'mode'='live' or c->>'couponId' is not null) and c->>'paymentMethod'='razorpay' then clock_timestamp()+interval '15 minutes' else null end,c->'parcel',q.pickup_location,q.delivery,
   c->>'couponId',c->>'couponCode',coalesce((c->>'discountPaise')::bigint,0)) returning * into o;
  if o.coupon_id is not null then
   insert into private.coupon_redemptions(order_id,coupon_id,firebase_uid,mode,state)
   values(o.id,o.coupon_id,p_uid,o.mode,case when o.payment_method='cod' then 'used' else 'held' end);
  end if;
  return jsonb_build_object('order',private.order_summary(o),'performCreate',o.payment_method='razorpay');
 elsif p_action='receipt.lookup' then
  select * into o from public.store_orders where mode=p_payload->>'mode' and razorpay_order_id=p_payload->>'providerOrderId';
  if not found then return null; end if;
  return jsonb_build_object('id',o.id,'mode',o.mode,'totalPaise',o.total_paise,'providerOrderId',o.razorpay_order_id);
 elsif p_action='receipt.mark' then
  if p_payload->>'state' not in ('processed','unmatched','failed') then raise exception 'Invalid receipt state'; end if;
  update private.payment_webhook_receipts set processing_state=p_payload->>'state' where mode=p_payload->>'mode' and account_id=p_payload->>'accountId' and event_id=p_payload->>'eventId';return '{}';
 end if;
 select * into o from public.store_orders where id=coalesce(p_payload->>'orderId',p_payload->>'id') for update;
 if not found then raise exception 'Order not found'; end if;
 if p_action='order.provider' and o.firebase_uid<>p_uid then raise exception 'Order not found'; end if;
 if p_action in ('order.get','shipment.get') and o.firebase_uid<>p_uid and not exists(select 1 from private.staff_memberships where firebase_uid=p_uid) then raise exception 'Order not found'; end if;
 if p_action in ('order.get','order.provider') then
  if p_action='order.get' then return private.order_summary(o); end if;
  return jsonb_build_object('order',private.order_summary(o),'providerOrderId',o.razorpay_order_id,'providerState',o.provider_state);
 elsif p_action='order.attach' then
  if o.mode is distinct from p_payload->>'mode' or o.total_paise is distinct from (p_payload->>'amountPaise')::bigint or p_payload->>'currency' is distinct from 'INR'
   or coalesce(p_payload->>'providerOrderId','') !~ '^order_[a-zA-Z0-9]+$' or o.payment_method<>'razorpay' then raise exception 'Payment does not match order'; end if;
  if o.razorpay_order_id is not null and o.razorpay_order_id<>p_payload->>'providerOrderId' then raise exception 'Provider order already attached'; end if;
  if o.provider_state not in ('creating','unknown','attached') then raise exception 'Invalid payment state'; end if;
  update public.store_orders set razorpay_order_id=p_payload->>'providerOrderId',provider_state='attached' where id=o.id;
  return private.order_summary(o);
 elsif p_action='order.createFailed' then
  if o.provider_state='attached' then return private.order_summary(o); end if;
  if coalesce((p_payload->>'ambiguous')::boolean,true) then
   update public.store_orders set provider_state='unknown' where id=o.id;
  else
   if o.reservation_state='held' then perform private.touch_inventory(o.items,1);end if;
   update private.coupon_redemptions set state='released' where order_id=o.id and state='held';
   update public.store_orders set provider_state='failed',status='payment_failed',reservation_state=case when reservation_state='held' then 'released' else reservation_state end where id=o.id;
  end if;
  select * into o from public.store_orders where id=o.id;return private.order_summary(o);
 elsif p_action='payment.settle' then
  pay:=p_payload->'payment';
  if o.payment_method<>'razorpay' or o.mode is distinct from p_payload->>'mode' or o.razorpay_order_id is null or o.razorpay_order_id is distinct from pay->>'order_id'
   or o.total_paise is distinct from (pay->>'amount')::bigint or pay->>'currency' is distinct from 'INR' or coalesce(pay->>'id','') !~ '^pay_[a-zA-Z0-9]+$'
   then raise exception 'Payment does not match order'; end if;
  if o.razorpay_payment_id is not null and o.razorpay_payment_id<>pay->>'id' then raise exception 'Payment does not match order'; end if;
  -- Confirmed money consumes the coupon once, including refunds. Late captures
  -- reacquire capacity atomically or enter review; they cannot exceed a cap.
  if o.coupon_id is not null and ((pay->>'status'='captured' and coalesce((pay->>'captured')::boolean,false))
   or coalesce((pay->>'amount_refunded')::bigint,0)>0 or pay->>'refund_status' in ('partial','full')) then
   if not exists(select 1 from private.coupon_redemptions where order_id=o.id and state in ('held','used'))
    and not private.coupon_has_capacity(o.coupon_id,o.firebase_uid,o.mode,o.id) then
    update public.store_orders set status='payment_review',razorpay_payment_id=pay->>'id',
     refund_review=refund_review or coalesce((pay->>'amount_refunded')::bigint,0)>0 or coalesce(pay->>'refund_status' in ('partial','full'),false) where id=o.id;
    select * into o from public.store_orders where id=o.id;return private.order_summary(o);
   end if;
   update private.coupon_redemptions set state='used' where order_id=o.id;
  end if;
  if coalesce((pay->>'amount_refunded')::bigint,0)>0 or pay->>'refund_status' in ('partial','full') then
   -- Refund evidence applies even after payment/fulfillment, and is never cleared by
   -- an older captured response racing the refund webhook. No stock is restocked.
   update public.store_orders set status='payment_review',refund_review=true,razorpay_payment_id=pay->>'id' where id=o.id;
   select * into o from public.store_orders where id=o.id;return private.order_summary(o);
  end if;
  if o.refund_review then return private.order_summary(o);end if;
  if pay->>'status'<>'captured' or coalesce((pay->>'captured')::boolean,false) is not true then return private.order_summary(o); end if;
  if o.status in ('paid','processing','shipped','delivered','refunded') then return private.order_summary(o); end if;
  if o.mode='live' and o.reservation_state<>'held' and o.reservation_state<>'committed' then
   -- Late capture never oversells: all rows are checked while inventory lock is held.
   can_reserve:=true;
   for item in select * from jsonb_array_elements(o.items) loop
    if not exists(select 1 from public.store_variants v join public.store_products p on p.id=v.product_id where v.id=item->>'variantId' and v.product_id=item->>'productId' and v.stock>=(item->>'quantity')::integer and p.status='active') then can_reserve:=false;end if;
   end loop;
   if not can_reserve then
    update public.store_orders set status='payment_review',razorpay_payment_id=pay->>'id' where id=o.id;
    select * into o from public.store_orders where id=o.id;return private.order_summary(o);
   end if;
   perform private.touch_inventory(o.items,-1);
  end if;
  update public.store_orders set status='paid',razorpay_payment_id=pay->>'id',reservation_state=case when mode='live' then 'committed' else 'none' end where id=o.id;
  select * into o from public.store_orders where id=o.id;return private.order_summary(o);
 elsif p_action='shipment.begin' then
  if not exists(select 1 from private.staff_memberships where firebase_uid=p_uid) then raise exception 'Staff access required'; end if;
  if o.mode<>'live' then raise exception 'Test orders cannot ship'; end if;
  if o.status not in ('paid','cod_confirmed','processing') or o.reservation_state<>'committed' then raise exception 'Order is not ready for shipment'; end if;
  if coalesce(o.address->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(o.address->>'email')>254 then raise exception 'This order needs a valid billing email before creating a shipment.';end if;
  if o.shipment_state in ('none','failed') then
   update public.store_orders set shipment_state='creating' where id=o.id;
   insert into private.audit_events(actor_uid,action,resource_id) values(p_uid,'shipment.create',o.id);
   return jsonb_build_object('performCreate',true,'order',to_jsonb(o));
  end if;
  return jsonb_build_object('performCreate',false,'order',to_jsonb(o));
 elsif p_action='shipment.attach' then
  if o.mode<>'live' or o.shipment_state not in ('creating','unknown','created') or (p_payload->>'shipmentId')::bigint<=0 or (p_payload->>'shiprocketOrderId')::bigint<=0 then raise exception 'Invalid shipment'; end if;
  if o.shiprocket_shipment_id is not null and o.shiprocket_shipment_id<>(p_payload->>'shipmentId')::bigint then raise exception 'Shipment already attached';end if;
  update public.store_orders set shipment_state='created',shiprocket_order_id=(p_payload->>'shiprocketOrderId')::bigint,shiprocket_shipment_id=(p_payload->>'shipmentId')::bigint,
   tracking=jsonb_build_object('shipmentId',(p_payload->>'shipmentId')::bigint,'status','Shipment created; awaiting courier allocation') where id=o.id;
 elsif p_action='shipment.failed' then
  if o.shipment_state='creating' then update public.store_orders set shipment_state=case when coalesce((p_payload->>'ambiguous')::boolean,true) then 'unknown' else 'failed' end where id=o.id;end if;
 elsif p_action='shipment.get' then
  if o.mode<>'live' then raise exception 'Test orders cannot ship';end if;
  return jsonb_build_object('order',private.order_summary(o),'shipmentId',o.shiprocket_shipment_id);
 elsif p_action='shipment.sync' then
  if o.mode<>'live' or o.shiprocket_shipment_id is null or o.shiprocket_shipment_id is distinct from (p_payload->>'shipmentId')::bigint then raise exception 'Invalid shipment';end if;
  shipment:=p_payload->'tracking';
  if o.status='delivered' and shipment->>'fulfillmentStatus' is distinct from 'delivered' then return private.order_summary(o);end if;
  update public.store_orders set tracking=shipment||jsonb_build_object('shipmentId',o.shiprocket_shipment_id),
   status=case when refund_review then status when shipment->>'fulfillmentStatus'='delivered' then 'delivered' when shipment->>'fulfillmentStatus'='shipped' then 'shipped' else status end where id=o.id;
 else raise exception 'Unknown checkout action';
 end if;
 select * into o from public.store_orders where id=o.id;return private.order_summary(o);
end $$;

revoke all on function private.coupon_document(private.coupons),private.coupon_manage(text,text,jsonb),
 private.coupon_has_capacity(text,text,text,text),private.coupon_discount(text,text,text,bigint) from public,anon,authenticated,service_role;
revoke all on function public.checkout_action(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.checkout_action(text,text,jsonb) to service_role;
