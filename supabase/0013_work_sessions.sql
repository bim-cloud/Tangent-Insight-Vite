-- 0013_work_sessions.sql
-- Cumulative per-user, per-project work-session tracking with full timestamps.
--
-- Each continuous stretch a user spends in a model = one session row
-- (started_at, ended_at, duration). Switching away closes the session;
-- returning opens a new one. PROJECT TOTAL = SUM of all session durations,
-- so A(2h) + B(1h) + A(3h) => Project A = 5h. Full audit trail preserved.

create table if not exists public.work_sessions (
  id             bigint generated always as identity primary key,
  person_id      text not null,
  project        text not null,          -- the central Revit file
  machine        text,
  started_at     timestamptz not null default now(),
  last_heartbeat timestamptz not null default now(),
  ended_at       timestamptz,
  duration_seconds integer not null default 0,
  status         text not null default 'active',   -- 'active' | 'closed'
  source         text default 'agent'
);
create index if not exists idx_ws_person   on public.work_sessions(person_id);
create index if not exists idx_ws_project  on public.work_sessions(project);
create index if not exists idx_ws_active   on public.work_sessions(status) where status = 'active';
create index if not exists idx_ws_started  on public.work_sessions(started_at);

alter table public.work_sessions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='work_sessions' and policyname='ws_read') then
    create policy ws_read on public.work_sessions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='work_sessions' and policyname='ws_write') then
    create policy ws_write on public.work_sessions for all using (true) with check (true);
  end if;
end $$;

-- Heartbeat RPC. Call every sample while a user is active in a model.
-- Handles: extend current session, close-on-switch, auto-close stale, accumulate.
create or replace function public.track_session(
  p_person   text,
  p_project  text,
  p_machine  text default null,
  p_source   text default 'agent'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active   record;
  v_person   text;
begin
  if p_person is null or p_project is null or p_project = '' or p_project = '—' then
    return;
  end if;

  -- Resolve to a people.id: accept either a person_id directly, or an
  -- Autodesk email (what the plugin/agent send), or a machine fallback.
  select id into v_person from public.people where id = p_person limit 1;
  if v_person is null then
    select id into v_person from public.people where lower(email) = lower(p_person) limit 1;
  end if;
  if v_person is null and p_machine is not null then
    select person_id into v_person from public.agent_machines where machine_id = p_machine limit 1;
  end if;
  if v_person is null then v_person := p_person; end if;  -- last resort: store raw

  -- 1) Close stale/other-project active sessions for this person.
  update public.work_sessions
     set status = 'closed',
         ended_at = last_heartbeat,
         duration_seconds = greatest(0, extract(epoch from (last_heartbeat - started_at))::int)
   where person_id = v_person
     and status = 'active'
     and ( project <> p_project
           or last_heartbeat < now() - interval '10 minutes' );

  -- 2) Extend existing active session for this project, or start a new one.
  select * into v_active
    from public.work_sessions
   where person_id = v_person and project = p_project and status = 'active'
   order by started_at desc limit 1;

  if found then
    update public.work_sessions
       set last_heartbeat = now(),
           duration_seconds = greatest(duration_seconds, extract(epoch from (now() - started_at))::int),
           machine = coalesce(p_machine, machine),
           source = case when p_source = 'revit_plugin' then 'revit_plugin' else source end
     where id = v_active.id;
  else
    insert into public.work_sessions (person_id, project, machine, started_at, last_heartbeat, status, source)
    values (v_person, p_project, p_machine, now(), now(), 'active', p_source);
  end if;
end $$;

grant execute on function public.track_session(text,text,text,text) to anon, authenticated;

-- Explicitly close a session (e.g. on Revit document close / app exit).
create or replace function public.close_session(p_person text, p_project text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.work_sessions
     set status='closed', ended_at = now(),
         duration_seconds = greatest(0, extract(epoch from (now() - started_at))::int)
   where person_id = p_person and project = p_project and status='active';
end $$;
grant execute on function public.close_session(text,text) to anon, authenticated;

-- ---- Reporting views -------------------------------------------------------

-- Per-project, per-user accumulated time (sums ALL sessions).
create or replace view public.v_project_user_time as
select
  project,
  person_id,
  count(*)                                   as session_count,
  sum(duration_seconds)                      as total_seconds,
  round(sum(duration_seconds)/3600.0, 2)     as total_hours,
  min(started_at)                            as first_started,
  max(coalesce(ended_at, last_heartbeat))    as last_active
from public.work_sessions
group by project, person_id;

-- Per-project totals across everyone.
create or replace view public.v_project_time as
select
  project,
  count(distinct person_id)                  as users,
  count(*)                                   as session_count,
  sum(duration_seconds)                      as total_seconds,
  round(sum(duration_seconds)/3600.0, 2)     as total_hours,
  max(coalesce(ended_at, last_heartbeat))    as last_active
from public.work_sessions
group by project;
