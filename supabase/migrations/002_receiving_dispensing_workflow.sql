-- =============================================
-- MIGRATION 002 — Receiving/Dispensing Workflow
-- Run this AFTER the first migration
-- =============================================

-- Add QR code to profiles (for staff identification)
alter table profiles add column if not exists qr_code text unique;

-- Add remarks field to inventory items (current notes about the set)
alter table inventory_items add column if not exists current_remarks text;

-- =============================================
-- SET CONTENTS — Editable list of instruments per set
-- =============================================
create table if not exists set_contents (
  id uuid primary key default uuid_generate_v4(),
  set_id uuid references inventory_items(id) on delete cascade not null,
  instrument_name text not null,
  quantity int default 1,
  sort_order int default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table set_contents enable row level security;
create policy "Authenticated users can view set contents" on set_contents
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can modify set contents" on set_contents
  for all using (auth.role() = 'authenticated');

-- =============================================
-- INSPECTIONS — Record of each inspection at receiving
-- =============================================
create table if not exists inspections (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references inventory_items(id) on delete cascade not null,
  item_name text not null,
  inspected_by_id uuid references profiles(id),
  inspected_by_name text not null,
  completeness_passed boolean default true,
  functionality_passed boolean default true,
  cleanliness_passed boolean default true,
  remarks text,
  missing_items text,
  created_at timestamptz default now()
);

alter table inspections enable row level security;
create policy "Authenticated users can view inspections" on inspections
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert inspections" on inspections
  for insert with check (auth.role() = 'authenticated');

-- =============================================
-- DISPENSE RECORDS — Who received what, where
-- =============================================
create table if not exists dispense_records (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references inventory_items(id) on delete cascade not null,
  item_name text not null,
  item_qr_code text not null,
  dispensed_by_id uuid references profiles(id),
  dispensed_by_name text not null,
  received_by_id uuid references profiles(id),
  received_by_name text not null,
  received_by_qr text,
  or_room text not null,
  remarks text,
  contents_snapshot text,
  created_at timestamptz default now()
);

alter table dispense_records enable row level security;
create policy "Authenticated users can view dispense records" on dispense_records
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert dispense records" on dispense_records
  for insert with check (auth.role() = 'authenticated');

-- =============================================
-- Updated dashboard view for new workflow
-- =============================================
drop view if exists dashboard_stats;
create or replace view dashboard_stats as
select
  (select count(*) from inventory_items where status = 'sterile') as sterile_count,
  (select count(*) from inventory_items where status = 'dispensed') as dispensed_count,
  (select count(*) from inventory_items where status = 'received') as received_count,
  (select count(*) from inventory_items where status = 'packed') as packed_count,
  (select count(*) from inventory_items where status = 'in_or') as in_or_count,
  (select count(*) from inventory_items where status = 'missing') as missing_count,
  (select count(*) from inventory_items where status = 'damaged') as damaged_count,
  (select count(*) from inventory_items where expiry_date between now() and now() + interval '7 days' and status != 'expired') as expiring_soon_count,
  (select count(*) from alerts where is_resolved = false) as active_alerts_count;

-- =============================================
-- Seed example set contents for demo items
-- =============================================
insert into set_contents (set_id, instrument_name, quantity, sort_order) 
select id, name, qty, ord from inventory_items, (values
  ('Mayo Scissors, Straight 6"', 2, 1),
  ('Mayo Scissors, Curved 6"', 2, 2),
  ('Metzenbaum Scissors 7"', 1, 3),
  ('Adson Forceps with Teeth', 2, 4),
  ('Adson Forceps without Teeth', 2, 5),
  ('Allis Forceps', 4, 6),
  ('Babcock Forceps', 2, 7),
  ('Kelly Forceps, Curved', 6, 8),
  ('Mosquito Forceps', 8, 9),
  ('Needle Holder, Mayo-Hegar', 2, 10),
  ('Scalpel Handle #3', 1, 11),
  ('Scalpel Handle #4', 1, 12),
  ('Sponge Forceps', 2, 13),
  ('Towel Clips', 6, 14),
  ('Suction Tip, Yankauer', 1, 15)
) as defaults(instrument_name, qty, ord)
where qr_code = 'MAJOR-001'
on conflict do nothing;

insert into set_contents (set_id, instrument_name, quantity, sort_order)
select id, name, qty, ord from inventory_items, (values
  ('Bone Curette, Small', 1, 1),
  ('Bone Curette, Medium', 1, 2),
  ('Bone Curette, Large', 1, 3),
  ('Periosteal Elevator', 2, 4),
  ('Bone Rongeur', 1, 5),
  ('Bone Cutting Forceps', 1, 6),
  ('Drill Bits Set (assorted)', 1, 7),
  ('Drill Guide', 1, 8),
  ('Bone Plate Holder', 2, 9),
  ('Screwdrivers (Hex, Phillips)', 2, 10),
  ('Bone Hooks', 2, 11),
  ('Self-Retaining Retractor', 1, 12)
) as defaults(instrument_name, qty, ord)
where qr_code = 'ORTHO-001'
on conflict do nothing;
