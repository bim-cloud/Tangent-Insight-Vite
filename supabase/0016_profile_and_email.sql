-- 0016_profile_and_email.sql
-- Enables user profile self-editing (role/dept/discipline) and the email-based
-- upsert used when a signed-in user has no people row yet. Safe to re-run.

-- 1) Ensure email is unique so upsert on_conflict=email works.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'people_email_key') then
    -- de-dupe any existing duplicate emails first (keep lowest id)
    delete from public.people a using public.people b
      where a.email is not null and lower(a.email) = lower(b.email) and a.id > b.id;
    alter table public.people add constraint people_email_key unique (email);
  end if;
end $$;

-- 2) RLS policies: allow authenticated users to read everyone and to
--    insert/update their OWN row (matched by email = their JWT email).
alter table public.people enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='people' and policyname='people_read_all') then
    create policy people_read_all on public.people for select using (true);
  end if;
  -- update own row
  if not exists (select 1 from pg_policies where tablename='people' and policyname='people_update_self') then
    create policy people_update_self on public.people for update to authenticated
      using (lower(email) = lower(auth.jwt() ->> 'email'))
      with check (lower(email) = lower(auth.jwt() ->> 'email'));
  end if;
  -- insert own row (for first-time profile creation)
  if not exists (select 1 from pg_policies where tablename='people' and policyname='people_insert_self') then
    create policy people_insert_self on public.people for insert to authenticated
      with check (lower(email) = lower(auth.jwt() ->> 'email'));
  end if;
end $$;
