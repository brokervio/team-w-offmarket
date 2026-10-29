-- Zillow FSBO: 5 Woodland Rd, New City, NY 10956 (open listing)
-- Run after 015_fsbo.sql. Skips itself if the address is already in the portal.
insert into public.listings
  (status, public_name, town, price, price_display, beds, baths, sqft, lot_desc,
   property_type, description_public, exact_address, exact_lat, exact_lng,
   is_open_listing, seller_phone, is_fsbo, source, photos_url, notes_internal, created_by)
select
  'active',
  'Renovated New City Home on 1 Acre',
  'New City',
  925000, 'exact', 3, 2, 2038, '1 acre',
  'off_market_resale',
  'Fully renovated 3 bedroom, 2 bath home on a full acre in New City. Open living and dining layout with hardwood floors and a fireplace, central air and gas heat. A new Trex deck overlooks the yard. Attached two-car garage plus an unfinished basement for storage or future space. Built in 1957, about 2,038 sq ft. Move-in ready.',
  '5 Woodland Rd, New City, NY 10956',
  41.156433, -74.00466,
  true, '(646) 627-5180', true, 'Zillow FSBO',
  'https://www.zillow.com/homedetails/5-Woodland-Rd-New-City-NY-10956/53395202_zpid/',
  'Owner listed it on Zillow 10/28/2026 at $925,000. Zillow shows taxes of $15,020 (2017 figure, verify current). Get photos from the owner and upload them here.',
  'a8a6d0db-be06-413f-8985-848b19a03b46'  -- Yisroel Weiss
where not exists (
  select 1 from public.listings where exact_address ilike '5 Woodland Rd%New City%'
);
