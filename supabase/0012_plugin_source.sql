-- 0012_plugin_source.sql
-- Make the Revit PLUGIN the authoritative source of "opened model" data, and
-- wipe the link-polluted data for a clean restart.
--
-- Root cause of the 111 link files: the desktop AGENT reads window titles and
-- cannot tell a host model from a linked one, so it reports link names. The
-- PLUGIN reports only the host document the user opened. We tag plugin data
-- with source='revit_plugin' and the dashboard trusts ONLY that for the
-- project list — no filename guessing.

-- 1) Add a source column to project_metrics (defaults to 'agent').
alter table public.project_metrics add column if not exists source text default 'agent';

-- 2) FRESH START: clear all captured models + assignments. The plugin will
--    repopulate real opened models (source='revit_plugin') as users work.
truncate table public.project_metrics;
truncate table public.project_files;

-- 3) Update the metrics RPC to accept and store p_source.
create or replace function public.upsert_project_metrics(
  p_project       text,
  p_worksets      int  default null,
  p_open_views    int  default null,
  p_warnings      int  default null,
  p_linked_models int  default null,
  p_size_mb       numeric default null,
  p_revit_version text default null,
  p_user          text default null,
  p_machine       text default null,
  p_source        text default 'agent'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_project is null or p_project = '' then return; end if;

  insert into public.project_metrics
    (project, worksets, open_views, warnings, linked_models, size_mb, revit_version, last_user, last_machine, source, updated_at)
  values
    (p_project, p_worksets, p_open_views, p_warnings, p_linked_models, p_size_mb, p_revit_version, p_user, p_machine, p_source, now())
  on conflict (project) do update set
    worksets      = coalesce(excluded.worksets,      project_metrics.worksets),
    open_views    = coalesce(excluded.open_views,    project_metrics.open_views),
    warnings      = coalesce(excluded.warnings,      project_metrics.warnings),
    linked_models = coalesce(excluded.linked_models, project_metrics.linked_models),
    size_mb       = coalesce(excluded.size_mb,       project_metrics.size_mb),
    revit_version = coalesce(excluded.revit_version, project_metrics.revit_version),
    last_user     = coalesce(excluded.last_user,     project_metrics.last_user),
    last_machine  = coalesce(excluded.last_machine,  project_metrics.last_machine),
    source        = case when excluded.source = 'revit_plugin' then 'revit_plugin'
                         else coalesce(project_metrics.source, excluded.source) end,
    updated_at    = now();
end $$;

grant execute on function public.upsert_project_metrics(text,int,int,int,int,numeric,text,text,text,text)
  to anon, authenticated;

-- 4) Stop the agent's window-title guess from OVERWRITING people.project with a
--    possibly-linked model name. We don't rewrite the whole ingestion trigger
--    (it has open/workset/teams logic); we just blank out project assignment
--    coming from the agent by clearing it post-hoc is unsafe, so instead we
--    neutralise it at the column: set people.project back to '—' for everyone
--    now, and the dashboard will rely on plugin-reported files for association.
update public.people set project = '—' where project is not null;
