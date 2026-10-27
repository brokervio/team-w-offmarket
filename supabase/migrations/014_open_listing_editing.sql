-- 014: who can edit a listing (same rule as lib/permissions.ts)
--   admin                       everything
--   open listing                any Team W agent
--   Team W listing agent set    only that agent
--   other brokerage / no agent  the agent who added it

create or replace function public.can_edit_listing(
  is_open boolean, agent_id uuid, creator uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.current_user_role() = 'admin' then true
    when public.current_user_role() <> 'agent' or public.current_user_role() is null then false
    when coalesce(is_open, false) then true
    when agent_id is not null then agent_id = auth.uid()
    else creator = auth.uid()
  end
$$;

drop policy if exists "own or admin updates listings" on public.listings;
drop policy if exists "who can edit listings" on public.listings;
create policy "who can edit listings" on public.listings
  for update
  using (public.can_edit_listing(is_open_listing, listing_agent_id, created_by))
  with check ((select public.is_staff()));

-- An agent editing someone else's open listing can update the details,
-- but can't claim it or hand it to another agent.
create or replace function public.guard_open_listing_representation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for server jobs (e.g. reassigning a removed agent's listings)
  if auth.uid() is not null
     and coalesce(old.is_open_listing, false)
     and public.current_user_role() is distinct from 'admin'
     and old.created_by is distinct from auth.uid()
     and (new.is_open_listing is distinct from old.is_open_listing
          or new.is_outside_listing is distinct from old.is_outside_listing
          or new.listing_agent_id is distinct from old.listing_agent_id
          or new.created_by is distinct from old.created_by)
  then
    raise exception 'Only the agent who added this open listing, or an admin, can change who represents it.';
  end if;
  return new;
end $$;

drop trigger if exists listings_guard_open_rep on public.listings;
create trigger listings_guard_open_rep
  before update on public.listings
  for each row execute procedure public.guard_open_listing_representation();
