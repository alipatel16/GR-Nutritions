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
 shipping:=case when subtotal>99900 then 0 else 5000 end;
 codfee:=case when p_payload->>'paymentMethod'='cod' then 20000 else 0 end;
 return jsonb_build_object('mode',p_payload->>'mode','paymentMethod',p_payload->>'paymentMethod','addressId',p_payload->>'addressId',
  'customerEmail',p_payload->>'customerEmail','customerEmailVerified',coalesce((p_payload->>'customerEmailVerified')::boolean,false),
  'address',a,'items',lines,'subtotalPaise',subtotal,'shippingPaise',shipping,'codFeePaise',codfee,'totalPaise',subtotal+shipping+codfee,'currency','INR',
  'parcel',jsonb_build_object('weightGrams',grams));
end $$;

-- Repair existing options without changing prices or stock.
select pg_advisory_xact_lock(764392010);
update public.store_products p
set payload=jsonb_set(p.payload,'{variants}',(
 select jsonb_agg(case when v->'shipping' is null or v->'shipping'='null'::jsonb then
  v||jsonb_build_object('shipping',jsonb_build_object('weightGrams',ceil((v->>'weightGrams')::numeric*1.1)+100))
 else v end order by position)
 from jsonb_array_elements(p.payload->'variants') with ordinality as options(v,position)
)), updated_at=now()
where exists(select 1 from jsonb_array_elements(p.payload->'variants') v
 where (v->'shipping' is null or v->'shipping'='null'::jsonb) and jsonb_typeof(v->'weightGrams')='number');

create or replace function private.clean_catalog_text(value text) returns text
language sql immutable set search_path='' as $$
 select trim(regexp_replace(regexp_replace(coalesce(value,''),
 '(health[[:space:]]*kart|nutrabay|amazon|flipkart)([.]co[.]in|[.]com|[.]in)?',
 'GR Nutritions','gi'),'https?://[^[:space:]<>]+|www[.][^[:space:]<>]+','','gi'))
$$;
revoke all on function private.clean_catalog_text(text) from public,anon,authenticated;

do $$
declare p public.store_products; doc jsonb; field text; retailer_pattern text:='health[[:space:]]*kart|nutrabay|amazon|flipkart';
begin
 for p in select * from public.store_products where payload::text ~* retailer_pattern
  or concat_ws(' ',payload->>'summary',payload->>'description',payload->>'usage') ~* 'https?://|www[.]' for update loop
  doc:=p.payload;
  if coalesce(doc->>'summary','') ~* retailer_pattern then
   doc:=jsonb_set(doc,'{summary}',to_jsonb(regexp_replace(doc->>'name','[[:space:]]+',' ','g')||'. Available at GR Nutritions.'));
  end if;
  if coalesce(doc->>'description','') ~* retailer_pattern and doc->>'description' ~* '^buy ' then
   doc:=jsonb_set(doc,'{description}',to_jsonb(
    regexp_replace(doc->>'name','[[:space:]]+',' ','g')||E'\n\nBrand: '||(doc->>'brand')||
    E'\nProduct type: '||replace(doc->>'category','-',' ')||E'\nAvailable options: '||
    (select string_agg(v->>'label',', ') from jsonb_array_elements(doc->'variants') v)||
    E'\n\nCheck the product label for serving instructions, nutrition, ingredients and allergens.'));
  end if;
  foreach field in array array['summary','description','usage'] loop
   doc:=jsonb_set(doc,array[field],to_jsonb(coalesce(nullif(private.clean_catalog_text(doc->>field),''),doc->>'name')));
  end loop;
  doc:=jsonb_set(doc,'{warnings}',coalesce((select jsonb_agg(private.clean_catalog_text(w)) from jsonb_array_elements_text(doc->'warnings') w),'[]'::jsonb));
  update public.store_products set payload=doc,updated_at=now() where id=p.id;
 end loop;
end $$;

