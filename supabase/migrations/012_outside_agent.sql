-- 012: listings held by an agent at another brokerage
alter table public.listings
  add column if not exists is_outside_listing boolean not null default false,
  add column if not exists outside_agent_name text,
  add column if not exists outside_brokerage text,
  add column if not exists outside_agent_phone text,
  add column if not exists outside_agent_email text;

create index if not exists listings_outside_idx on public.listings (is_outside_listing);
