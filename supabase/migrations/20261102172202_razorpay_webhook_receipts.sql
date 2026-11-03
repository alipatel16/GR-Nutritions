create schema if not exists private;
revoke all on schema private from public,anon,authenticated;

create table private.payment_webhook_receipts (
  mode text not null check(mode in ('test','live')),
  account_id text not null check(account_id ~ '^[a-zA-Z0-9_-]{1,150}$'),
  event_id text not null check(event_id ~ '^[a-zA-Z0-9_-]{1,150}$'),
  event_type text not null check(event_type in ('payment.captured','payment.failed','order.paid','refund.processed')),
  payment_id text,
  order_id text,
  refund_id text,
  amount_paise bigint not null check(amount_paise between 0 and 9007199254740991),
  currency text not null check(currency='INR'),
  provider_status text not null,
  body_sha256 text not null check(body_sha256 ~ '^[a-f0-9]{64}$'),
  processing_state text not null default 'pending_reconciliation' check(processing_state in ('pending_reconciliation','processed','unmatched','failed')),
  received_at timestamptz not null default clock_timestamp(),
  primary key(mode,account_id,event_id)
);
alter table private.payment_webhook_receipts enable row level security;
revoke all on private.payment_webhook_receipts from public,anon,authenticated;
create index payment_webhook_pending on private.payment_webhook_receipts(mode,received_at)
where processing_state='pending_reconciliation';

create function public.ingest_razorpay_receipt(p_receipt jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare inserted int; saved_hash text;
begin
  -- Only the service role can execute this RPC, after the Edge HMAC verifier.
  insert into private.payment_webhook_receipts(mode,account_id,event_id,event_type,payment_id,order_id,refund_id,
    amount_paise,currency,provider_status,body_sha256)
  values(p_receipt->>'mode',p_receipt->>'accountId',p_receipt->>'eventId',p_receipt->>'eventType',p_receipt->>'paymentId',
    p_receipt->>'orderId',p_receipt->>'refundId',(p_receipt->>'amountPaise')::bigint,p_receipt->>'currency',p_receipt->>'status',p_receipt->>'bodySha256')
  on conflict(mode,account_id,event_id) do nothing;
  get diagnostics inserted=row_count;
  select body_sha256 into saved_hash from private.payment_webhook_receipts
    where mode=p_receipt->>'mode' and account_id=p_receipt->>'accountId' and event_id=p_receipt->>'eventId';
  if saved_hash is distinct from p_receipt->>'bodySha256' then raise exception 'Event ID conflicts with an existing notification'; end if;
  return jsonb_build_object('duplicate',inserted=0);
end $$;
revoke all on function public.ingest_razorpay_receipt(jsonb) from public,anon,authenticated;
grant execute on function public.ingest_razorpay_receipt(jsonb) to service_role;
