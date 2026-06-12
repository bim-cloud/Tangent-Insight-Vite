-- 0010_projects.sql  (clean rebuild)
-- Seeds the real Tangent projects and a Revit-file→project mapping table.
--
-- This DROPS and recreates both tables, so it always lands in a known-good
-- state regardless of any partial/failed earlier attempts. Re-runnable.
-- NOTE: dropping project_files clears existing file assignments. Since earlier
-- runs failed, there is nothing to preserve; if you HAD assignments, re-add
-- them in Projects → Manage file assignments after running this.

-- 1) Remove any prior versions completely (order matters: child first).
drop table if exists public.project_files cascade;
drop table if exists public.projects cascade;

-- 2) Projects table (the "folders" from the Excel list).
create table public.projects (
  id          bigint generated always as identity primary key,
  code        text not null,
  name        text not null,
  full_label  text not null,
  client      text,
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  constraint projects_code_name_key unique (code, name)
);

-- 3) File→project mapping. One row per central Revit file.
create table public.project_files (
  id          bigint generated always as identity primary key,
  file_name   text not null unique,
  project_id  bigint references public.projects(id) on delete set null,
  assigned_by text,
  assigned_at timestamptz not null default now()
);
create index idx_project_files_project on public.project_files(project_id);

-- 4) RLS: readable by anon (dashboard), writable by authenticated users.
alter table public.projects enable row level security;
alter table public.project_files enable row level security;

create policy projects_read  on public.projects      for select using (true);
create policy projects_write on public.projects      for all to authenticated using (true) with check (true);
create policy pf_read        on public.project_files for select using (true);
create policy pf_write       on public.project_files for all to authenticated using (true) with check (true);

-- 5) Seed projects.
insert into public.projects (code, name, full_label) values
  ('4232', 'ADEK School at Jabal Hafeet', '4232- ADEK School at Jabal Hafeet'),
  ('3931', 'Wadi Al Safa-WASL RESIDENTIAL TOWERS', '3931- Wadi Al Safa-WASL RESIDENTIAL TOWERS'),
  ('4180', 'BNW - Branded Residences & Hotel Apartment on Plot R-03D & R-03E at RAK Central', '4180- BNW - Branded Residences & Hotel Apartment on Plot R-03D & R-03E at RAK Central'),
  ('3735', 'Dubai South - AGD Residential - Plot RF-48,49 & 50', '3735- Dubai South - AGD Residential - Plot RF-48,49 & 50'),
  ('4057', 'Dubai South - Plot No. RB-7 - Meraki', '4057- Dubai South - Plot No. RB-7 - Meraki'),
  ('3118', 'District One West (Clubhouse 2)', '3118-District One West (Clubhouse 2)'),
  ('4067', 'ALEF - The Palace Branded Residences', '4067- ALEF - The Palace Branded Residences'),
  ('3788', 'LAC 718-719 - City View Bu Kadra', '3788-LAC 718-719 - City View Bu Kadra'),
  ('4157', 'Dubai Islands - The Bay Apartments–Plot C', '4157- Dubai Islands - The Bay Apartments–Plot C'),
  ('3941', 'EMAAR - Dubai Hills Estate- Plot F12-12', '3941- EMAAR - Dubai Hills Estate- Plot F12-12'),
  ('3247', 'ESD-PLOT GA12', '3247-ESD-PLOT GA12'),
  ('3027', 'Khalifa University Accommodation-Abu Dhabi', '3027-Khalifa University Accommodation-Abu Dhabi'),
  ('3166', 'Marina Residential Apartments, Island B PLOT 10', '3166-Marina Residential Apartments, Island B PLOT 10'),
  ('3356', 'Commercial Building Dubai Hills', '3356- Commercial Building Dubai Hills'),
  ('3227', 'Lehbab Staff Accommodation', '3227-Lehbab Staff Accommodation'),
  ('3948', 'EMAAR - DHE- Plot F12-04', '3948- EMAAR - DHE- Plot F12-04'),
  ('3797', 'Meraki-Production City', '3797- Meraki-Production City'),
  ('4003', 'Dubai Islands - Landscape and Pool', '4003- Dubai Islands - Landscape and Pool'),
  ('3291', 'Emirates Palace Development-Abu Dhabi', '3291- Emirates Palace Development-Abu Dhabi'),
  ('3243', 'ESD-PLOT GA07', '3243-ESD-PLOT GA07'),
  ('3302', 'RYM-P2-Plot B8.01.05', '3302-RYM-P2-Plot B8.01.05'),
  ('3303', 'RYM-P2-Plot B8.01.07', '3303-RYM-P2-Plot B8.01.07'),
  ('1928', 'GA11 Emaar South', '1928-GA11 Emaar South'),
  ('3317', 'Eaton Warehouse & Production', '3317-Eaton Warehouse & Production'),
  ('1949', 'PA9B.007-Awaj', '1949-PA9B.007-Awaj'),
  ('1990', 'SAAS Mixed Used Towers', '1990-SAAS Mixed Used Towers'),
  ('3109', 'RYM-Plot B7.01.08', '3109-RYM-Plot B7.01.08'),
  ('3046', 'MRA 19-22 at Marjan RAK', '3046-MRA 19-22 at Marjan RAK'),
  ('1948', 'PA 9B003-AWAJ', '1948-PA 9B003-AWAJ'),
  ('1768', 'EMAAR_PA18.0007', '1768-EMAAR_PA18.0007'),
  ('2054', 'Mamsha Garden Residence', '2054-Mamsha Garden Residence'),
  ('3202', 'Falcon City-Ellington', '3202-Falcon City-Ellington'),
  ('3416', 'Meydan District 11', '3416- Meydan District 11'),
  ('3401', 'Avenue Development', '3401- Avenue Development'),
  ('3574', 'City View-Sofitel Project', '3574-City View-Sofitel Project'),
  ('3521', 'Plot GB 19 at Emaar South Development', '3521- Plot GB 19 at Emaar South Development'),
  ('3522', 'Plot GB 20 at Emaar South Development', '3522- Plot GB 20 at Emaar South Development'),
  ('3762', 'DID-Plot DIB-MU-0005', '3762- DID-Plot DIB-MU-0005'),
  ('4059', 'Dubai South - Beachfront Plot- RN-795', '4059- Dubai South - Beachfront Plot- RN-795'),
  ('3096', 'Dalma Mens Club', '3096-Dalma Mens Club'),
  ('3347', 'PA9B.008', '3347-PA9B.008'),
  ('2014', 'Al Dhafra Sports Club', '2014-Al Dhafra Sports Club'),
  ('3655', 'EMAAR-GB03', '3655- EMAAR-GB03'),
  ('3656', 'EMAAR-GB04', '3656- EMAAR-GB04'),
  ('3665', 'Emaar - Plot 19.0001C Tower', '3665- Emaar - Plot 19.0001C Tower'),
  ('3609', 'EMAAR DCH - Plot H13', '3609- EMAAR DCH - Plot H13'),
  ('3835', 'Canal Living - Aldar Manarat - Phase 02', '3835- Canal Living - Aldar Manarat - Phase 02'),
  ('3569', 'Residential Dev''t on Plot 3466891, Business Bay, Dubai', '3569- Residential Dev''t on Plot 3466891, Business Bay, Dubai'),
  ('3923', 'EMAAR - Dubai Creek Harbour - Plot F13', '3923- EMAAR - Dubai Creek Harbour - Plot F13'),
  ('3920', 'EMAAR - Dubai Creek Harbour - Plot F6', '3920- EMAAR - Dubai Creek Harbour - Plot F6'),
  ('3310', 'Plot GA15', '3310- Plot GA15'),
  ('2043', 'PA15.0001', '2043-PA15.0001'),
  ('3166', 'Marina Residential Apartments, Island B PLOT 11', '3166-Marina Residential Apartments, Island B PLOT 11'),
  ('3993', 'New Shakhbout School', '3993-New Shakhbout School'),
  ('3935', 'Mirasol II, Mina Al Arab, RAK', '3935- Mirasol II, Mina Al Arab, RAK'),
  ('3946', 'ADEK Schools Lagoons', '3946- ADEK Schools Lagoons'),
  ('4124', 'Damac Islands-Plot 1 & 2', '4124- Damac Islands-Plot 1 & 2');
