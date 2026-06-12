-- 0015_clear_agent_metrics.sql
-- Remove project_metrics rows that were NOT reported by the Revit plugin.
-- After the plugin's IsLinked guard + the dashboard going plugin-strict, any
-- lingering agent-sourced rows (which may be linked models like ...000002)
-- should be cleared. The plugin will re-report real opened models.
-- Safe to re-run.

-- Delete everything not from the plugin.
delete from public.project_metrics
 where source is distinct from 'revit_plugin';

-- Also clear people.project so the agent's last window-title guess (possibly a
-- link) doesn't linger in the UI. The plugin/session data drives project views.
update public.people set project = '—'
 where project is not null and project <> '—';

-- Remove any assignments that point at files which are not plugin-confirmed
-- AND were never manually re-confirmed. (Keep manual assignments intact.)
-- This is conservative: it only removes assignments whose file has no
-- plugin-sourced metrics row. Comment out if you want to keep all assignments.
-- delete from public.project_files pf
--  where not exists (
--    select 1 from public.project_metrics pm
--     where regexp_replace(pm.project,'\.(rvt|rfa|rte)$','') = pf.file_name
--       and pm.source = 'revit_plugin');
