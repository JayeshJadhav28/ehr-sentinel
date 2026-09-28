-- EHR SENTINEL :: core schema (synthetic demo data only)
create extension if not exists pgcrypto with schema extensions;

create table public.departments (
  id uuid primary key,
  name text not null unique
);

create table public.roles (
  id uuid primary key,
  name text not null unique,
  label text not null
);

create table public.permissions (
  id uuid primary key,
  action text not null,
  resource_type text not null,
  unique (action, resource_type)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.users (
  id uuid primary key,
  username text not null unique,
  display_name text not null,
  password_hash text not null,
  role_id uuid not null references public.roles(id),
  department_id uuid references public.departments(id),
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key,
  synthetic_mrn text not null unique,
  display_name text not null,
  department_id uuid not null references public.departments(id),
  demographic_band text not null,
  created_at timestamptz not null default now()
);

create table public.patient_records (
  id uuid primary key,
  patient_id uuid not null references public.patients(id) on delete cascade,
  record_type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.care_assignments (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  unique (user_id, patient_id)
);

create table public.sessions (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source_ip text,
  revoked_at timestamptz
);

create table public.access_events (
  id uuid primary key,
  seq bigserial,
  ts timestamptz not null default now(),
  event_type text not null,
  user_id uuid references public.users(id) on delete set null,
  username text,
  role text,
  department_id uuid references public.departments(id),
  action text not null,
  target_type text,
  target_id uuid,
  result text not null,
  reason_code text,
  records_returned integer not null default 0,
  source_ip text,
  session_id uuid,
  correlation_id uuid not null,
  scenario_tag text,
  metadata jsonb not null default '{}'::jsonb
);
create index access_events_ts_idx on public.access_events (ts desc);
create index access_events_user_idx on public.access_events (user_id, ts desc);
create index access_events_scenario_idx on public.access_events (scenario_tag);

create table public.behavior_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  window_days integer not null default 14,
  login_rate numeric not null default 0,
  avg_records_per_action numeric not null default 0,
  std_records_per_action numeric not null default 0,
  avg_records_per_hour numeric not null default 0,
  unique_patients_per_session numeric not null default 0,
  dept_entropy numeric not null default 0,
  common_hours integer[] not null default '{}',
  failed_login_rate numeric not null default 0,
  sample_size integer not null default 0,
  model_version text not null default 'demo-v1',
  updated_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key,
  created_at timestamptz not null default now(),
  type text not null,
  severity text not null,
  user_id uuid references public.users(id) on delete set null,
  status text not null default 'OPEN',
  rule_ids text[] not null default '{}',
  risk_score integer not null default 0,
  ml_score numeric,
  summary text not null,
  evidence_json jsonb not null default '{}'::jsonb,
  scenario_tag text,
  updated_at timestamptz not null default now()
);
create index alerts_created_idx on public.alerts (created_at desc);

create table public.alert_events (
  alert_id uuid not null references public.alerts(id) on delete cascade,
  event_id uuid not null references public.access_events(id) on delete cascade,
  relation_type text not null default 'SUPPORTING',
  primary key (alert_id, event_id)
);

create table public.alert_timeline (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  ts timestamptz not null default now(),
  actor text,
  action text not null,
  note text
);

grant all on public.departments, public.roles, public.permissions,
  public.role_permissions, public.users, public.patients, public.patient_records,
  public.care_assignments, public.sessions, public.access_events,
  public.behavior_profiles, public.alerts, public.alert_events, public.alert_timeline
  to service_role;
grant usage, select on all sequences in schema public to service_role;

alter table public.departments enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.users enable row level security;
alter table public.patients enable row level security;
alter table public.patient_records enable row level security;
alter table public.care_assignments enable row level security;
alter table public.sessions enable row level security;
alter table public.access_events enable row level security;
alter table public.behavior_profiles enable row level security;
alter table public.alerts enable row level security;
alter table public.alert_events enable row level security;
alter table public.alert_timeline enable row level security;

create or replace function public.verify_credentials(p_username text, p_password text)
returns table (user_id uuid)
language sql
security definer
set search_path = public, extensions
as $$
  select u.id
  from public.users u
  where u.username = p_username
    and u.status = 'ACTIVE'
    and u.password_hash = extensions.crypt(p_password, u.password_hash);
$$;
revoke all on function public.verify_credentials(text, text) from public, anon, authenticated;
grant execute on function public.verify_credentials(text, text) to service_role;