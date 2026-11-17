-- PLANETAI employer workspace onboarding
-- Authenticated users can create one private employer workspace for themselves.
-- No browser role receives direct INSERT/UPDATE privileges on employer tables.

create or replace function public.create_employer_workspace(p_company_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_name text := nullif(btrim(p_company_name), '');
  v_account_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if v_company_name is null or char_length(v_company_name) < 2 or char_length(v_company_name) > 100 then
    raise exception 'Company name must be between 2 and 100 characters' using errcode = '22023';
  end if;

  select a.id
    into v_account_id
    from public.employer_accounts a
   where a.owner_user_id = v_user_id
   order by a.created_at asc
   limit 1;

  if v_account_id is null then
    insert into public.employer_accounts (owner_user_id, company_name, contact_email)
    values (v_user_id, v_company_name, (select u.email from auth.users u where u.id = v_user_id))
    returning id into v_account_id;
  end if;

  insert into public.employer_members (employer_account_id, user_id, member_role, joined_at)
  values (v_account_id, v_user_id, 'owner', now())
  on conflict (employer_account_id, user_id) do nothing;

  return v_account_id;
end;
$$;

revoke all on function public.create_employer_workspace(text) from public, anon;
grant execute on function public.create_employer_workspace(text) to authenticated;

comment on function public.create_employer_workspace(text) is
  'Creates or returns the authenticated user’s employer workspace and ensures owner membership.';
