create or replace function private.checkout_context(p_uid text,p_payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare a jsonb; item jsonb; variant_doc jsonb; v public.store_variants; p public.store_products;
 lines jsonb:='[]'; qty integer; subtotal bigint:=0; shipping integer; codfee integer;
 grams numeric:=0; packed_grams numeric; ship jsonb;
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
  if jsonb_typeof(ship->'weightGrams') is distinct from 'number' then raise exception 'Packed shipping weight is missing. Please contact the store.'; end if;
  packed_grams:=(ship->>'weightGrams')::numeric;
  if packed_grams not between 1 and 100000 then raise exception 'Packed shipping weight is invalid. Please contact the store.'; end if;
  grams:=grams+packed_grams*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('productId',p.id,'variantId',v.id,'productName',p.payload->>'name','sku',v.sku,
   'quantity',qty,'unitPricePaise',v.price_paise,'shipping',ship));
  subtotal:=subtotal+qty::bigint*v.price_paise;
 end loop;
 if grams>100000 or subtotal>100000000 then raise exception 'This cart exceeds one parcel. Please contact the store.'; end if;
 shipping:=case when subtotal>99900 then 0 else 5000 end;
 codfee:=case when p_payload->>'paymentMethod'='cod' then 20000 else 0 end;
 return jsonb_build_object('mode',p_payload->>'mode','paymentMethod',p_payload->>'paymentMethod','addressId',p_payload->>'addressId',
  'customerEmail',p_payload->>'customerEmail','customerEmailVerified',coalesce((p_payload->>'customerEmailVerified')::boolean,false),
  'address',a,'items',lines,'subtotalPaise',subtotal,'shippingPaise',shipping,'codFeePaise',codfee,'totalPaise',subtotal+shipping+codfee,'currency','INR',
  'parcel',jsonb_build_object('weightGrams',grams));
end $$;
