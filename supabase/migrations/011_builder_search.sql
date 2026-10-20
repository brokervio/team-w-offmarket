-- ============================================================
-- 011: BUILDER PICKER + SEARCH BY BUILDER / OPEN LISTING
-- Builders table already exists (001). This adds a CRM link,
-- a digits-only seller phone for matching, and imports the
-- Team W CRM contacts tagged "builder".
-- ============================================================

alter table public.builders
  add column if not exists ghl_contact_id text unique;

-- Digits-only copy of the seller phone so "347-642-2024",
-- "(347) 642-2024" and "3476422024" all match the same builder.
alter table public.listings
  add column if not exists seller_phone_digits text
  generated always as (regexp_replace(coalesce(seller_phone, ''), '\D', '', 'g')) stored;

create index if not exists listings_builder_id_idx on public.listings (builder_id);
create index if not exists listings_open_idx on public.listings (is_open_listing);

-- Import from Team W CRM (tag: builder), pulled 2026-10-20.
insert into public.builders (ghl_contact_id, name, contact_phone, contact_email, notes) values
  ('Uonxai52YrKOjXzQvZZ8', 'N Sharf', '718-812-2880', '202beach@gmail.com', 'Imported from Team W CRM'),
  ('LyJTCnaV3ZhQgVVDOz7z', 'Motty Waldman', '845-222-8837', null, 'Imported from Team W CRM'),
  ('IuS3eiYyRpquLUKrFEIq', 'office@websterequities.com', null, 'office@websterequities.com', 'Imported from Team W CRM. No name on file.'),
  ('XvGWdvMO88yKGVXhm8E0', 'Mayer Weber', '347-374-1767', 'mayer@astrongrp.com', 'Imported from Team W CRM. Work: 845-307-0046'),
  ('jZzn07lzJ5nAtgTuI7hI', 'ba@arrowub.com', null, 'ba@arrowub.com', 'Imported from Team W CRM. No name on file. Email bounced.'),
  ('BaxZdDjloQYHmBkZuc2l', 'spschik@gmail.com', null, 'spschik@gmail.com', 'Imported from Team W CRM. No name on file. Opted out of all contact in CRM.'),
  ('4QbWtuaJGk8nRNu8ZZRg', 'sam@monseybuilders.com', null, 'sam@monseybuilders.com', 'Imported from Team W CRM. No name on file.'),
  ('2nJK5suHGtAlJT0VvdDT', 'isac@hyltllc.com', null, 'isac@hyltllc.com', 'Imported from Team W CRM. No name on file.'),
  ('bxqRbV1hUKB7yOD7Bzo5', 'joel@salamonsbuilders.com', null, 'joel@salamonsbuilders.com', 'Imported from Team W CRM. No name on file.'),
  ('EZC2j7iTUid1LWAYGAXx', 'Isaac Rosenberger', null, 'isaac@roseimprovement.com', 'Imported from Team W CRM'),
  ('kNmd4EIAuz9mwrwSKgpy', 'Aba Grunhut', '845-388-1400', 'aba@arrowub.com', 'Imported from Team W CRM'),
  ('figqrWX69lv3EcqQzSkH', 'Avraham Frieder', null, 'avrahamfrieder@gmail.com', 'Imported from Team W CRM'),
  ('2czZvVuMkkXyNJ7nb87J', 'David Slomiuc', '845-587-4467', 'david@prestigeequities.com', 'Imported from Team W CRM'),
  ('xEjZkW49mW0cKBoaxofW', 'Sam Oshry', null, 'sam@selectbuildersny.com', 'Imported from Team W CRM'),
  ('mMl8CGhFeSnbqpovNqo2', 'Kalmish Fleischman', null, 'kalmish@trodale.com', 'Imported from Team W CRM'),
  ('AXwG27QS718Qkp1AwEy5', 'Akiva Herzog', null, 'akivaherzog1@gmail.com', 'Imported from Team W CRM'),
  ('tYgEA2ck15JZQFE7qWVm', 'Joel Fekete', '347-661-4274', 'joel@solidbuildersusa.com', 'Imported from Team W CRM'),
  ('MMMxm5dJmAtrM8YXB5qG', 'Zelig Friedman', null, 'zelig1872@gmail.com', 'Imported from Team W CRM'),
  ('OtSHSerQP8HClLQ1Dqe7', 'Isaac Berkovic', '845-596-0659', 'ybcontracting@gmail.com', 'Imported from Team W CRM. Opted out of all contact in CRM.'),
  ('PDAS8fW6bP8OkfVfOmKW', 'Berish Feldman', '845-222-2913', 'berishfeldman@gmail.com', 'Imported from Team W CRM'),
  ('Bh367yZ8nKYbpjkZJmWn', 'Jonah Herzog', '845-659-7799', 'jonah@ucorc.com', 'Imported from Team W CRM'),
  ('OTv242dIK6ESNxAa1Vmi', 'Joseph (Yossi) Spitzer', '347-642-2024', 'josephspitzerinc@gmail.com', 'Imported from Team W CRM'),
  ('oQrAij9HTFMWBVIfquSd', 'Yossi Kohn', '845-499-9926', '4999926@gmail.com', 'Imported from Team W CRM. Texted STOP, do not text.')
on conflict (ghl_contact_id) do nothing;
