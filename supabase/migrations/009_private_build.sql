-- 009: "private build" status for construction that is not for sale
alter table public.listings drop constraint listings_status_check;
alter table public.listings add constraint listings_status_check
  check (status in ('draft','pending','coming_soon','available','in_contract','sold','archived','private_build'));
