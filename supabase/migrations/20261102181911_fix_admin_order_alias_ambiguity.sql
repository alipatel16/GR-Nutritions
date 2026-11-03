-- Keep deployed migrations immutable. Fix PL/pgSQL row-variable/table-alias
-- ambiguity without changing ownership, staff authority or fulfillment rules.
create or replace function public.customer_action(p_uid text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict error
begin
 if p_action='orders.list' then
  perform private.expire_reservations();
  return coalesce((select jsonb_agg(private.order_summary(order_row) order by order_row.created_at desc)
   from public.store_orders as order_row where order_row.firebase_uid=p_uid),'[]');
 end if;
 return public.customer_action_before_checkout(p_uid,p_action,p_payload);
end $$;

create or replace function public.admin_action(p_uid text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict error
declare current_order public.store_orders;
begin
 if not exists(select 1 from private.staff_memberships where firebase_uid=p_uid) then raise exception 'Staff access required';end if;
 if p_action='product.save' then
  perform pg_advisory_xact_lock(764392010);
  perform private.expire_reservations();
  if exists(select 1 from public.store_orders as reserved_order,jsonb_array_elements(reserved_order.items) item_row where reserved_order.reservation_state='held'
   and item_row->>'productId'=p_payload->>'id' and not exists(select 1 from jsonb_array_elements(p_payload->'variants') variant_row where variant_row->>'id'=item_row->>'variantId')) then
   raise exception 'This variant is reserved by a pending order. Please retry after its payment expires.';
  end if;
 end if;
 if p_action='products.list' then
  perform private.expire_reservations();
  return public.admin_action_before_checkout(p_uid,p_action,p_payload);
 elsif p_action='orders.list' then
  perform private.expire_reservations();
  return coalesce((select jsonb_agg(private.order_summary(order_row)||jsonb_build_object('userId',order_row.firebase_uid,'address',order_row.address) order by order_row.created_at desc)
   from public.store_orders as order_row),'[]');
 elsif p_action='order.advance' then
  select order_row.* into current_order from public.store_orders as order_row where order_row.id=p_payload->>'id' for update;
  if not found then raise exception 'Order not found';end if;
  if p_payload->>'status'<>'processing' or current_order.status not in ('paid','cod_confirmed') or current_order.mode<>'live' then raise exception 'Invalid order transition';end if;
  update public.store_orders as order_row set status='processing' where order_row.id=current_order.id;
  insert into private.audit_events(actor_uid,action,resource_id) values(p_uid,p_action,current_order.id);
  return jsonb_build_object('status','processing');
 end if;
 return public.admin_action_before_checkout(p_uid,p_action,p_payload);
end $$;

revoke all on function public.customer_action(text,text,jsonb),public.admin_action(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.customer_action(text,text,jsonb),public.admin_action(text,text,jsonb) to service_role;
