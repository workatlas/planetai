-- Ensure one employer workspace per owner. The current data was checked for
-- duplicate owners before this index was prepared; if duplicates are introduced
-- before deployment, this migration fails safely rather than deleting data.
create unique index if not exists employer_accounts_owner_user_id_unique
  on public.employer_accounts(owner_user_id);
