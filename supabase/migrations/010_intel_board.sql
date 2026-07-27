-- 010: team intel board (who is building that? is it for sale?)
create table if not exists public.intel_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles,
  location text not null,
  question text,
  status text not null default 'open' check (status in ('open','answered')),
  created_at timestamptz not null default now()
);

create table if not exists public.intel_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.intel_posts on delete cascade,
  author_id uuid not null references public.profiles,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.intel_posts enable row level security;
alter table public.intel_replies enable row level security;

create policy "staff read intel" on public.intel_posts
  for select using (public.is_staff());
create policy "staff post own intel" on public.intel_posts
  for insert with check (public.is_staff() and author_id = auth.uid());
create policy "own or admin update intel" on public.intel_posts
  for update using (public.current_user_role() = 'admin' or author_id = auth.uid());
create policy "own or admin delete intel" on public.intel_posts
  for delete using (public.current_user_role() = 'admin' or author_id = auth.uid());

create policy "staff read intel replies" on public.intel_replies
  for select using (public.is_staff());
create policy "staff reply own" on public.intel_replies
  for insert with check (public.is_staff() and author_id = auth.uid());
create policy "own or admin delete reply" on public.intel_replies
  for delete using (public.current_user_role() = 'admin' or author_id = auth.uid());
