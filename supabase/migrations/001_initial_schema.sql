-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (linked to Supabase Auth users)
-- =============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null default 'cssd_technician',
  department text,
  employee_id text unique,
  avatar_initials text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view all profiles"
  on profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admins can manage profiles"
  on profiles for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('system_admin', 'hospital_admin', 'cssd_supervisor')
    )
  );

-- =============================================
-- INVENTORY ITEMS
-- =============================================
create table inventory_items (
  id uuid primary key default uuid_generate_v4(),
  qr_code text unique not null,
  name text not null,
  item_type text not null,
  description text,
  status text not null default 'storage',
  location text,
  shelf_location text,
  sterilization_date timestamptz,
  expiry_date timestamptz,
  last_user_id uuid references profiles(id),
  last_user_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table inventory_items enable row level security;

create policy "Authenticated users can view inventory"
  on inventory_items for select using (auth.role() = 'authenticated');

create policy "CSSD staff can modify inventory"
  on inventory_items for all using (auth.role() = 'authenticated');

-- =============================================
-- AUDIT LOGS (immutable chain of custody)
-- =============================================
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references inventory_items(id) on delete restrict not null,
  item_name text not null,
  item_qr_code text not null,
  action text not null,
  performed_by_id uuid references profiles(id),
  performed_by_name text not null,
  department text,
  location text,
  device_used text,
  notes text,
  created_at timestamptz default now()
);

alter table audit_logs enable row level security;

-- Audit logs are INSERT only — no update or delete
create policy "Authenticated users can view audit logs"
  on audit_logs for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert audit logs"
  on audit_logs for insert with check (auth.role() = 'authenticated');

-- =============================================
-- STERILIZATION LOADS
-- =============================================
create table sterilization_loads (
  id uuid primary key default uuid_generate_v4(),
  load_number text unique not null,
  sterilizer_name text not null,
  cycle_start timestamptz,
  cycle_end timestamptz,
  status text not null default 'loading',
  biological_indicator boolean default false,
  bi_result text,
  chemical_indicator boolean default true,
  operator_id uuid references profiles(id),
  operator_name text,
  created_at timestamptz default now()
);

alter table sterilization_loads enable row level security;
create policy "Authenticated users can access sterilization loads"
  on sterilization_loads for all using (auth.role() = 'authenticated');

-- Items in a sterilization load
create table sterilization_load_items (
  id uuid primary key default uuid_generate_v4(),
  load_id uuid references sterilization_loads(id) on delete cascade not null,
  item_id uuid references inventory_items(id) on delete restrict not null,
  item_name text not null,
  added_at timestamptz default now()
);

alter table sterilization_load_items enable row level security;
create policy "Authenticated users can access load items"
  on sterilization_load_items for all using (auth.role() = 'authenticated');

-- =============================================
-- ALERTS
-- =============================================
create table alerts (
  id uuid primary key default uuid_generate_v4(),
  alert_type text not null,
  severity text not null default 'warning',
  title text not null,
  body text,
  item_id uuid references inventory_items(id),
  item_name text,
  is_resolved boolean default false,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

alter table alerts enable row level security;
create policy "Authenticated users can access alerts"
  on alerts for all using (auth.role() = 'authenticated');

-- =============================================
-- USEFUL VIEWS
-- =============================================
create or replace view dashboard_stats as
select
  (select count(*) from inventory_items where status = 'sterile') as sterile_count,
  (select count(*) from inventory_items where status = 'in_or') as in_or_count,
  (select count(*) from inventory_items where status = 'decontamination') as decon_count,
  (select count(*) from inventory_items where status = 'assembly') as assembly_count,
  (select count(*) from inventory_items where status = 'sterilization') as sterilization_count,
  (select count(*) from inventory_items where status = 'missing') as missing_count,
  (select count(*) from inventory_items where status = 'damaged') as damaged_count,
  (select count(*) from inventory_items where expiry_date between now() and now() + interval '7 days' and status != 'expired') as expiring_soon_count,
  (select count(*) from alerts where is_resolved = false) as active_alerts_count;

-- =============================================
-- SEED DATA (demo items)
-- =============================================
insert into inventory_items (qr_code, name, item_type, description, status, location, shelf_location, expiry_date) values
  ('MAJOR-001', 'Major Set 001', 'instrument_set', 'Standard major surgical set', 'sterile', 'Storage', 'Shelf A1', now() + interval '30 days'),
  ('MAJOR-002', 'Major Set 002', 'instrument_set', 'Standard major surgical set', 'in_or', 'OR 2', null, now() + interval '28 days'),
  ('ORTHO-001', 'Ortho Set 001', 'instrument_set', 'Orthopedic instrument set', 'decontamination', 'Decontamination Room', null, null),
  ('ORTHO-002', 'Ortho Set 002', 'instrument_set', 'Orthopedic instrument set', 'sterile', 'Storage', 'Shelf B2', now() + interval '14 days'),
  ('LAP-001', 'Laparoscopy Set 001', 'instrument_set', 'Laparoscopic cholecystectomy set', 'assembly', 'Assembly Room', null, null),
  ('THYROID-001', 'Thyroid Set A', 'instrument_set', 'Thyroidectomy instrument set', 'sterile', 'Storage', 'Shelf A2', now() + interval '21 days'),
  ('PACK-001', 'Draping Pack 001', 'sterile_pack', 'Standard draping pack', 'sterile', 'Storage', 'Shelf C1', now() + interval '5 days'),
  ('PACK-002', 'Suture Pack 001', 'sterile_pack', 'Suture pack set', 'sterile', 'Storage', 'Shelf C2', now() + interval '60 days'),
  ('IMPL-001', 'Hip Implant Set A', 'implant', 'Total hip replacement implant set', 'sterile', 'Implant Storage', 'Shelf D1', now() + interval '365 days'),
  ('CAUTERY-001', 'Electrocautery Unit 1', 'equipment', 'Electrosurgical unit', 'sterile', 'Equipment Bay', null, null);
