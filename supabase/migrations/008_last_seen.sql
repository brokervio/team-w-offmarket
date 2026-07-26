-- 008: track each agent's last visit so the dashboard can show what's new
alter table public.profiles
  add column if not exists last_seen_at timestamptz;
