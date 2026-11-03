-- GR Coach AI calls a paid model, so it gets a tighter budget than store actions:
-- 8 messages per minute and 60 per rolling hour per signed-in user or hashed IP.
create function public.consume_coach_request(p_key text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare k text; count_now int; hour_total int;
begin
  if coalesce(length(p_key),0) not between 1 and 128 then raise exception 'Invalid identity'; end if;
  k := 'coach:' || p_key;
  insert into private.request_limits(uid,window_start) values(k,date_trunc('minute',clock_timestamp()))
    on conflict(uid,window_start) do update set requests=private.request_limits.requests+1 returning requests into count_now;
  select coalesce(sum(requests),0) into hour_total from private.request_limits
    where uid=k and window_start>=clock_timestamp()-interval '1 hour';
  delete from private.request_limits where window_start<now()-interval '1 hour';
  return count_now<=8 and hour_total<=60;
end $$;

revoke all on function public.consume_coach_request(text) from public,anon,authenticated;
grant execute on function public.consume_coach_request(text) to service_role;
