-- 003: optional seller contact phone for open listings
alter table public.listings
  add column if not exists seller_phone text;
