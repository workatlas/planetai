-- Atomic server-side rate limiting for authenticated marketplace Edge Functions.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.edge_rate_limits (
  scope text not null,
  subject text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (scope, subject),
  check (char_length(scope) between 1 and 80),
  check (char_length(subject) between 1 and 160)
);

alter table private.edge_rate_limits enable row level security;
revoke all on table private.edge_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table private.edge_rate_limits to service_role;

create or replace function public.consume_edge_rate_limit(
  p_scope text,
  p_subject text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_scope is null or char_length(p_scope) not between 1 and 80
     or p_subject is null or char_length(p_subject) not between 1 and 160
     or p_window_seconds is null or p_window_seconds not between 1 and 86400
     or p_max_requests is null or p_max_requests not between 1 and 10000 then
    raise exception 'Invalid rate-limit parameters' using errcode = '22023';
  end if;

  insert into private.edge_rate_limits (scope, subject, window_started_at, request_count)
  values (p_scope, p_subject, now(), 1)
  on conflict (scope, subject) do update
    set window_started_at = case
          when private.edge_rate_limits.window_started_at
               + make_interval(secs => p_window_seconds) <= now()
          then now()
          else private.edge_rate_limits.window_started_at
        end,
        request_count = case
          when private.edge_rate_limits.window_started_at
               + make_interval(secs => p_window_seconds) <= now()
          then 1
          else private.edge_rate_limits.request_count + 1
        end
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_edge_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text, text, integer, integer)
  to service_role;
