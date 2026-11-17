create table if not exists public.job_seeker_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  professional_headline text not null default '',
  location text not null default '',
  skills text[] not null default '{}',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_seeker_profiles_full_name_length
    check (char_length(full_name) <= 100),
  constraint job_seeker_profiles_headline_length
    check (char_length(professional_headline) <= 140),
  constraint job_seeker_profiles_location_length
    check (char_length(location) <= 120),
  constraint job_seeker_profiles_summary_length
    check (char_length(summary) <= 1200),
  constraint job_seeker_profiles_skills_count
    check (cardinality(skills) <= 30)
);

alter table public.job_seeker_profiles enable row level security;

revoke all on table public.job_seeker_profiles from anon;
grant select, insert, update on table public.job_seeker_profiles to authenticated;

drop policy if exists "Job seekers can read their own profile" on public.job_seeker_profiles;
create policy "Job seekers can read their own profile"
on public.job_seeker_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Job seekers can create their own profile" on public.job_seeker_profiles;
create policy "Job seekers can create their own profile"
on public.job_seeker_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Job seekers can update their own profile" on public.job_seeker_profiles;
create policy "Job seekers can update their own profile"
on public.job_seeker_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
