-- 005: agent profile fields + share links hide the address by default
alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists contact_email text;

alter table public.listing_shares
  add column if not exists show_address boolean not null default false;
