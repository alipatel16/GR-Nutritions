-- Edge-only commerce: Firebase UID and merchant mode are verified/server-owned.
-- No new table is exposed to browser roles. Provider payloads are never customer input.
create table private.checkout_quotes (
 id text primary key default gen_random_uuid()::text,
 firebase_uid text not null,
 context jsonb not null,
 delivery jsonb not null,
 pickup_location text not null,
 expires_at timestamptz not null default clock_timestamp()+interval '5 minutes',
 created_at timestamptz not null default clock_timestamp()
);
alter table private.checkout_quotes enable row level security;
revoke all on private.checkout_quotes from public,anon,authenticated;
alter table public.store_orders drop constraint store_orders_status_check;
alter table public.store_orders add constraint store_orders_status_check check(status in
 ('pending','payment_pending','payment_expired','payment_review','payment_failed','cod_confirmed','paid','processing','shipped','delivered','cancelled','refunded'));
alter table public.store_orders add column mode text not null default 'test' check(mode in ('test','live')),
 add column payment_method text not null default 'razorpay' check(payment_method in ('razorpay','cod')),
 add column subtotal_paise bigint not null default 0 check(subtotal_paise>=0),
 add column shipping_paise integer not null default 0 check(shipping_paise>=0),
 add column cod_fee_paise integer not null default 0 check(cod_fee_paise>=0),
 add column quote_id text unique references private.checkout_quotes(id),
 add column request_key text,
 add column razorpay_order_id text,
 add column razorpay_payment_id text,
 add column refund_review boolean not null default false,
 add column provider_state text not null default 'none' check(provider_state in ('none','creating','attached','unknown','failed')),
 add column reservation_state text not null default 'none' check(reservation_state in ('none','held','committed','released')),
 add column reservation_expires_at timestamptz,
 add column parcel jsonb,
 add column pickup_location text,
 add column delivery jsonb,
 add column shipment_state text not null default 'none' check(shipment_state in ('none','creating','created','unknown','failed')),
 add column shiprocket_order_id bigint,
 add column shiprocket_shipment_id bigint,
 add column tracking jsonb;
create unique index store_request_idempotency on public.store_orders(firebase_uid,request_key) where request_key is not null;
create unique index store_razorpay_order_identity on public.store_orders(mode,razorpay_order_id) where razorpay_order_id is not null;
create unique index store_razorpay_payment_identity on public.store_orders(mode,razorpay_payment_id) where razorpay_payment_id is not null;
create unique index store_shiprocket_shipment_identity on public.store_orders(shiprocket_shipment_id) where shiprocket_shipment_id is not null;
create index store_reservation_expiry on public.store_orders(reservation_expires_at) where reservation_state='held';

create function private.order_summary(o public.store_orders) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_strip_nulls(jsonb_build_object('id',o.id,'status',o.status,'mode',o.mode,'paymentMethod',o.payment_method,
 'currency',o.currency,'subtotalPaise',o.subtotal_paise,'shippingPaise',o.shipping_paise,'codFeePaise',o.cod_fee_paise,
 'totalPaise',o.total_paise,'items',o.items,'createdAt',o.created_at,'tracking',o.tracking))
$$;

create function private.checkout_context(p_uid text,p_payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare a jsonb; item jsonb; variant_doc jsonb; v public.store_variants; p public.store_products;
 lines jsonb:='[]'; qty integer; subtotal bigint:=0; shipping integer; codfee integer;
 grams numeric:=0; len numeric:=0; wid numeric:=0; height numeric:=0; ship jsonb;
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
  if jsonb_typeof(ship) is distinct from 'object' then raise exception 'Shipping measurements are missing. Please contact the store.'; end if;
  for variant_doc in select to_jsonb(k) from unnest(array['weightGrams','lengthCm','widthCm','heightCm']) k loop
   if jsonb_typeof(ship->(variant_doc#>>'{}')) is distinct from 'number' or coalesce(ship->>(variant_doc#>>'{}'),'') !~ '^[0-9]+(\.[0-9]+)?$' then raise exception 'Shipping measurements are invalid. Please contact the store.'; end if;
  end loop;
  if (ship->>'weightGrams')::numeric not between 1 and 100000 or
   (ship->>'lengthCm')::numeric not between 0.51 and 200 or (ship->>'widthCm')::numeric not between 0.51 and 200 or (ship->>'heightCm')::numeric not between 0.51 and 200 then raise exception 'Shipping measurements are invalid. Please contact the store.'; end if;
  grams:=grams+(ship->>'weightGrams')::numeric*qty;
  len:=greatest(len,(ship->>'lengthCm')::numeric);wid:=greatest(wid,(ship->>'widthCm')::numeric);height:=height+(ship->>'heightCm')::numeric*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('productId',p.id,'variantId',v.id,'productName',p.payload->>'name','sku',v.sku,
   'quantity',qty,'unitPricePaise',v.price_paise,'shipping',ship));
  subtotal:=subtotal+qty::bigint*v.price_paise;
 end loop;
 if grams>100000 or height>200 or subtotal>100000000 then raise exception 'This cart exceeds one parcel. Please contact the store.'; end if;
 shipping:=case when subtotal>99900 then 0 else 5000 end;
 codfee:=case when p_payload->>'paymentMethod'='cod' then 20000 else 0 end;
 return jsonb_build_object('mode',p_payload->>'mode','paymentMethod',p_payload->>'paymentMethod','addressId',p_payload->>'addressId',
  'customerEmail',p_payload->>'customerEmail','customerEmailVerified',coalesce((p_payload->>'customerEmailVerified')::boolean,false),
  'address',a,'items',lines,'subtotalPaise',subtotal,'shippingPaise',shipping,'codFeePaise',codfee,'totalPaise',subtotal+shipping+codfee,'currency','INR',
  'parcel',jsonb_build_object('weightGrams',grams,'lengthCm',len,'widthCm',wid,'heightCm',height));
end $$;

create function private.touch_inventory(p_items jsonb,p_direction integer) returns void
language plpgsql set search_path='' as $$
declare item jsonb; affected integer;
begin
 for item in select * from jsonb_array_elements(p_items) order by value->>'variantId' loop
  update public.store_variants set stock=stock+p_direction*(item->>'quantity')::integer
   where id=item->>'variantId' and product_id=item->>'productId' and (p_direction=1 or stock>=(item->>'quantity')::integer);
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'A product is unavailable or has insufficient stock'; end if;
  -- Stale staff forms cannot restore stock consumed by a checkout/reservation.
  update public.store_products set updated_at=clock_timestamp() where id=item->>'productId';
 end loop;
end $$;

create function private.expire_reservations() returns void language plpgsql set search_path='' as $$
declare o public.store_orders;
begin
 -- All stock writers acquire the same transaction lock, including admin product saves.
 if not exists(select 1 from public.store_orders where reservation_state='held' and reservation_expires_at<=clock_timestamp()) then return;end if;
 perform pg_advisory_xact_lock(764392010);
 for o in select * from public.store_orders where reservation_state='held' and reservation_expires_at<=clock_timestamp() order by id for update loop
  perform private.touch_inventory(o.items,1);
  update public.store_orders set reservation_state='released',status=case when status='payment_review' then status else 'payment_expired' end where id=o.id;
 end loop;
end $$;

-- Reclaim expired capacity before publishing availability, including anonymous catalog reads.
create or replace function public.catalog_products() returns jsonb
language plpgsql volatile security definer set search_path='' as $$
begin
 perform private.expire_reservations();
 return coalesce((select jsonb_agg(private.product_document(p) order by (p.payload->>'featuredRank')::int,p.id)
  from public.store_products p where p.status='active'),'[]'::jsonb);
end $$;

create function public.checkout_action(p_uid text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb; q private.checkout_quotes; o public.store_orders; pay jsonb; item jsonb; can_reserve boolean; shipment jsonb;
begin
 if p_action in ('context','quote.store','order.begin','order.get','order.provider','shipment.get','shipment.begin') and coalesce(length(p_uid),0) not between 1 and 128 then raise exception 'Invalid identity'; end if;
 perform pg_advisory_xact_lock(764392010);
 perform private.expire_reservations();
 if p_action='context' then return private.checkout_context(p_uid,p_payload);
 elsif p_action='quote.store' then
  c:=private.checkout_context(p_uid,p_payload->'context');
  if c is distinct from p_payload->'context' then raise exception 'Cart changed. Please check delivery again.'; end if;
  if coalesce(p_payload#>>'{delivery,courierId}','') !~ '^[0-9]+$' or coalesce(length(p_payload->>'pickupLocation'),0) not between 1 and 100 then raise exception 'Delivery is unavailable'; end if;
  insert into private.checkout_quotes(firebase_uid,context,delivery,pickup_location) values(p_uid,c,p_payload->'delivery',p_payload->>'pickupLocation') returning * into q;
  return jsonb_build_object('quoteId',q.id,'mode',c->>'mode','currency','INR','subtotalPaise',c->'subtotalPaise','shippingPaise',c->'shippingPaise','codFeePaise',c->'codFeePaise',
   'totalPaise',c->'totalPaise','expiresAt',q.expires_at,'items',(select jsonb_agg(x-'shipping'-'sku') from jsonb_array_elements(c->'items') x),'delivery',q.delivery);
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
   quote_id,request_key,provider_state,reservation_state,reservation_expires_at,parcel,pickup_location,delivery)
  values(gen_random_uuid()::text,p_uid,case when c->>'paymentMethod'='cod' then 'cod_confirmed' else 'payment_pending' end,
   (c->>'totalPaise')::bigint,c->'items',c->'address',c->>'mode',c->>'paymentMethod',(c->>'subtotalPaise')::bigint,(c->>'shippingPaise')::integer,(c->>'codFeePaise')::integer,
   q.id,p_payload->>'requestKey',case when c->>'paymentMethod'='razorpay' then 'creating' else 'none' end,
   case when c->>'mode'='test' then 'none' when c->>'paymentMethod'='cod' then 'committed' else 'held' end,
   case when c->>'mode'='live' and c->>'paymentMethod'='razorpay' then clock_timestamp()+interval '15 minutes' else null end,c->'parcel',q.pickup_location,q.delivery) returning * into o;
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
   update public.store_orders set provider_state='failed',status='payment_failed',reservation_state=case when reservation_state='held' then 'released' else reservation_state end where id=o.id;
  end if;
  select * into o from public.store_orders where id=o.id;return private.order_summary(o);
 elsif p_action='payment.settle' then
  pay:=p_payload->'payment';
  if o.payment_method<>'razorpay' or o.mode is distinct from p_payload->>'mode' or o.razorpay_order_id is null or o.razorpay_order_id is distinct from pay->>'order_id'
   or o.total_paise is distinct from (pay->>'amount')::bigint or pay->>'currency' is distinct from 'INR' or coalesce(pay->>'id','') !~ '^pay_[a-zA-Z0-9]+$'
   then raise exception 'Payment does not match order'; end if;
  if o.razorpay_payment_id is not null and o.razorpay_payment_id<>pay->>'id' then raise exception 'Payment does not match order'; end if;
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

-- Keep the existing catalog/address implementation while replacing order reads/transitions.
alter function public.customer_action(text,text,jsonb) rename to customer_action_before_checkout;
alter function public.admin_action(text,text,jsonb) rename to admin_action_before_checkout;
create function public.customer_action(p_uid text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if p_action='orders.list' then
  perform private.expire_reservations();
  return coalesce((select jsonb_agg(private.order_summary(o) order by o.created_at desc) from public.store_orders o where firebase_uid=p_uid),'[]');
 end if;
 return public.customer_action_before_checkout(p_uid,p_action,p_payload);
end $$;
create function public.admin_action(p_uid text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.store_orders;
begin
 if not exists(select 1 from private.staff_memberships where firebase_uid=p_uid) then raise exception 'Staff access required';end if;
 if p_action='product.save' then
  perform pg_advisory_xact_lock(764392010);
  perform private.expire_reservations();
  if exists(select 1 from public.store_orders orders,jsonb_array_elements(orders.items) i where orders.reservation_state='held'
   and i->>'productId'=p_payload->>'id' and not exists(select 1 from jsonb_array_elements(p_payload->'variants') v where v->>'id'=i->>'variantId')) then
   raise exception 'This variant is reserved by a pending order. Please retry after its payment expires.';
  end if;
 end if;
 if p_action='products.list' then
  perform private.expire_reservations();
  return public.admin_action_before_checkout(p_uid,p_action,p_payload);
 elsif p_action='orders.list' then
  perform private.expire_reservations();
  return coalesce((select jsonb_agg(private.order_summary(o)||jsonb_build_object('userId',o.firebase_uid,'address',o.address) order by o.created_at desc) from public.store_orders o),'[]');
 elsif p_action='order.advance' then
  select * into o from public.store_orders where id=p_payload->>'id' for update;
  if not found then raise exception 'Order not found';end if;
  if p_payload->>'status'<>'processing' or o.status not in ('paid','cod_confirmed') or o.mode<>'live' then raise exception 'Invalid order transition';end if;
  update public.store_orders set status='processing' where id=o.id;
  insert into private.audit_events(actor_uid,action,resource_id) values(p_uid,p_action,o.id);
  return jsonb_build_object('status','processing');
 end if;
 return public.admin_action_before_checkout(p_uid,p_action,p_payload);
end $$;
revoke all on function public.customer_action_before_checkout(text,text,jsonb),public.admin_action_before_checkout(text,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.checkout_action(text,text,jsonb),public.customer_action(text,text,jsonb),public.admin_action(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.checkout_action(text,text,jsonb),public.customer_action(text,text,jsonb),public.admin_action(text,text,jsonb) to service_role;
revoke all on all functions in schema private from public,anon,authenticated;

create function public.consume_checkout_request(p_uid text) returns boolean
language plpgsql security definer set search_path='' as $$
declare count_now integer;
begin
 insert into private.request_limits(uid,window_start) values('checkout:'||p_uid,date_trunc('minute',clock_timestamp()))
 on conflict(uid,window_start) do update set requests=private.request_limits.requests+1 returning requests into count_now;
 return count_now<=20;
end $$;
revoke all on function public.consume_checkout_request(text) from public,anon,authenticated;
grant execute on function public.consume_checkout_request(text) to service_role;
