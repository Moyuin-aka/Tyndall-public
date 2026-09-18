-- Run once in Supabase SQL Editor. Additive: legacy switch_now_playing is untouched.
-- Only the authenticated server API may access this table; no browser DB access.
begin;
create table if not exists public.nowcast_presence (
  id text primary key check (id = 'me'),
  payload jsonb not null,
  received_at timestamptz not null default now()
);
alter table public.nowcast_presence enable row level security;
revoke all on public.nowcast_presence from anon, authenticated;
grant select, insert, update on public.nowcast_presence to service_role;

create or replace function public.set_nowcast_presence(incoming jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  insert into public.nowcast_presence (id, payload, received_at)
  values ('me', incoming, clock_timestamp())
  on conflict (id) do update
    set payload = excluded.payload, received_at = excluded.received_at
    where (public.nowcast_presence.payload->>'observedAt')::timestamptz
      <= (excluded.payload->>'observedAt')::timestamptz;
  return found;
end;
$$;
revoke all on function public.set_nowcast_presence(jsonb) from public, anon, authenticated;
grant execute on function public.set_nowcast_presence(jsonb) to service_role;
commit;
