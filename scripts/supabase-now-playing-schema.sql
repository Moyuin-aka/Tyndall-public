-- Fresh installation bootstrap; then apply the upstream additive migration below.
create table if not exists public.switch_now_playing (
  id text primary key check (id = 'me'), game text, image text,
  updated_at timestamptz not null default now()
);
alter table public.switch_now_playing enable row level security;
revoke all on public.switch_now_playing from anon, authenticated;
grant select, insert, update on public.switch_now_playing to service_role;

-- switch_now_playing: 「现在在做」状态表。
-- 历史上只有 game 列，代码后来泛化为 kind/title/source/image 但表没跟着迁移，
-- 导致 API 的 upsert 写入不存在的列而 500（2026-07-05 发现并修复）。
-- 此文件记录当时补的迁移，供以后重建/核对表结构用。

alter table public.switch_now_playing
  add column if not exists kind   text,
  add column if not exists title  text,
  add column if not exists source text;
