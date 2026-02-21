create extension if not exists pgcrypto;

create table if not exists pilots (
  id uuid primary key,
  name text not null,
  one_liner text not null,
  record_mode text not null check (record_mode in ('capture', 'describe', 'prompt')),
  record jsonb not null,
  inputs jsonb not null,
  steps jsonb not null,
  credits integer not null default 50 check (credits >= 0),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists run_logs (
  id uuid primary key,
  pilot_id uuid not null references pilots(id) on delete cascade,
  created_at timestamptz not null default now(),
  actor text not null default 'anonymous',
  input_values jsonb not null,
  output_preview text not null,
  total_tokens integer,
  status text not null check (status in ('success', 'error'))
);

create index if not exists idx_run_logs_pilot_created_at_desc
  on run_logs (pilot_id, created_at desc);

create table if not exists app_meta (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function commit_run_log(
  p_pilot_id uuid,
  p_run_log_id uuid,
  p_created_at timestamptz,
  p_actor text,
  p_input_values jsonb,
  p_output_preview text,
  p_total_tokens integer,
  p_status text
)
returns table(ok boolean, reason text, credits_left integer)
language plpgsql
as $$
declare
  v_credits integer;
begin
  if not exists (select 1 from pilots where id = p_pilot_id) then
    return query select false, 'not_found', null::integer;
    return;
  end if;

  update pilots
  set credits = credits - 1,
      updated_at = now()
  where id = p_pilot_id
    and credits > 0
  returning credits into v_credits;

  if v_credits is null then
    return query select false, 'insufficient_credits', null::integer;
    return;
  end if;

  insert into run_logs (
    id,
    pilot_id,
    created_at,
    actor,
    input_values,
    output_preview,
    total_tokens,
    status
  ) values (
    p_run_log_id,
    p_pilot_id,
    coalesce(p_created_at, now()),
    coalesce(nullif(p_actor, ''), 'anonymous'),
    coalesce(p_input_values, '{}'::jsonb),
    coalesce(p_output_preview, ''),
    p_total_tokens,
    p_status
  );

  return query select true, 'ok', v_credits;
end;
$$;
