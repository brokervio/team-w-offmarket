-- ============================================================
-- 002: LISTING AGENT, COMMISSION, MLS, PHOTO LINK + EDIT RIGHTS
-- Paste this entire file into Supabase SQL Editor and Run.
-- ============================================================

alter table public.listings
  add column if not exists listing_agent_id uuid references public.profiles,
  add column if not exists is_open_listing boolean not null default false,
  add column if not exists commission text,
  add column if not exists mls_number text,
  add column if not exists photos_url text;

-- Existing listings get assigned to the first admin account
update public.listings
set created_by = coalesce(created_by,
      (select id from public.profiles where role = 'admin' order by created_at limit 1)),
    listing_agent_id = coalesce(listing_agent_id,
      (select id from public.profiles where role = 'admin' order by created_at limit 1));

-- Agents may only edit their own listings. Admins edit everything.
drop policy if exists "staff update listings" on public.listings;
drop policy if exists "own or admin updates listings" on public.listings;
create policy "own or admin updates listings" on public.listings
  for update using (
    public.current_user_role() = 'admin'
    or (public.is_staff() and created_by = auth.uid())
  );

-- Inserts must be stamped with the creating agent
drop policy if exists "staff insert listings" on public.listings;
drop policy if exists "staff insert own listings" on public.listings;
create policy "staff insert own listings" on public.listings
  for insert with check (
    public.is_staff()
    and (created_by = auth.uid() or public.current_user_role() = 'admin')
  );
