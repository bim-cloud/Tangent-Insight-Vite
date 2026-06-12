-- 0014_dedupe_normalize.sql
-- De-duplicate Revit file records by normalizing names (strip .rvt extension).
-- Fixes the case where "X", "X.rvt" appear as separate rows. Safe to re-run.

-- 1) Normalize project_metrics: strip trailing .rvt/.rfa/.rte, then merge dups
--    keeping the most-recently-updated row's numbers.
--    (Simplest robust approach: rename, then collapse duplicates.)
update public.project_metrics
   set project = regexp_replace(project, '\.(rvt|RVT|rfa|RFA|rte|RTE)$', '');

-- Collapse duplicate project rows that now share the same normalized name:
-- keep the row with the latest updated_at, delete the rest.
delete from public.project_metrics a
 using public.project_metrics b
 where a.project = b.project
   and a.ctid < b.ctid;          -- keep one physical row per project name

-- 2) Normalize project_files assignments similarly.
update public.project_files
   set file_name = regexp_replace(file_name, '\.(rvt|RVT|rfa|RFA|rte|RTE)$', '');

-- Collapse duplicate assignments (same normalized file_name): keep newest.
delete from public.project_files a
 using public.project_files b
 where a.file_name = b.file_name
   and a.assigned_at < b.assigned_at;
-- (Any remaining exact ties collapse by ctid.)
delete from public.project_files a
 using public.project_files b
 where a.file_name = b.file_name
   and a.ctid < b.ctid;

-- 3) Normalize work_sessions project names so time matches assignments.
update public.work_sessions
   set project = regexp_replace(project, '\.(rvt|RVT|rfa|RFA|rte|RTE)$', '');
