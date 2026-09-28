-- EHR SENTINEL :: deterministic synthetic seed. No real people, no real data.
insert into public.departments (id, name) values
  ('d0000000-0000-4000-8000-000000000001','Cardiology'),
  ('d0000000-0000-4000-8000-000000000002','Emergency'),
  ('d0000000-0000-4000-8000-000000000003','Oncology'),
  ('d0000000-0000-4000-8000-000000000004','Neurology'),
  ('d0000000-0000-4000-8000-000000000005','General Medicine');

insert into public.roles (id, name, label) values
  ('c0000000-0000-4000-8000-000000000001','PHYSICIAN','Physician'),
  ('c0000000-0000-4000-8000-000000000002','NURSE','Nurse'),
  ('c0000000-0000-4000-8000-000000000003','SPECIALIST','Specialist'),
  ('c0000000-0000-4000-8000-000000000004','SECURITY_REVIEWER','Security Reviewer'),
  ('c0000000-0000-4000-8000-000000000005','ADMINISTRATOR','Administrator');

insert into public.permissions (id, action, resource_type) values
  ('e0000000-0000-4000-8000-000000000001','VIEW','PATIENT'),
  ('e0000000-0000-4000-8000-000000000002','SEARCH','PATIENT'),
  ('e0000000-0000-4000-8000-000000000003','VIEW','RECORD'),
  ('e0000000-0000-4000-8000-000000000004','VIEW','SECURITY_ALERT'),
  ('e0000000-0000-4000-8000-000000000005','UPDATE','SECURITY_ALERT'),
  ('e0000000-0000-4000-8000-000000000006','VIEW','AUDIT_EVENT'),
  ('e0000000-0000-4000-8000-000000000007','VIEW','BEHAVIOR_PROFILE'),
  ('e0000000-0000-4000-8000-000000000008','VIEW','AGGREGATE_ANALYTICS'),
  ('e0000000-0000-4000-8000-000000000009','UPDATE','SCENARIO');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on true
where (r.name in ('PHYSICIAN','NURSE','SPECIALIST') and p.resource_type in ('PATIENT','RECORD'))
   or (r.name = 'SECURITY_REVIEWER' and p.resource_type in ('SECURITY_ALERT','AUDIT_EVENT','BEHAVIOR_PROFILE','SCENARIO'))
   or (r.name = 'ADMINISTRATOR' and p.resource_type in ('AGGREGATE_ANALYTICS','AUDIT_EVENT','SCENARIO'));

insert into public.users (id, username, display_name, password_hash, role_id, department_id) values
  ('a0000000-0000-4000-8000-000000000001','physician.demo','Dr. A. Kumar', extensions.crypt('Sentinel#2026', extensions.gen_salt('bf')),'c0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002','nurse.demo','N. Pereira', extensions.crypt('Sentinel#2026', extensions.gen_salt('bf')),'c0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000005'),
  ('a0000000-0000-4000-8000-000000000003','specialist.demo','Dr. S. Iyer', extensions.crypt('Sentinel#2026', extensions.gen_salt('bf')),'c0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000004','security.demo','R. Fernandes', extensions.crypt('Sentinel#2026', extensions.gen_salt('bf')),'c0000000-0000-4000-8000-000000000004',null),
  ('a0000000-0000-4000-8000-000000000005','admin.demo','M. Dsouza', extensions.crypt('Sentinel#2026', extensions.gen_salt('bf')),'c0000000-0000-4000-8000-000000000005',null),
  ('a0000000-0000-4000-8000-000000000006','emergency.demo','Dr. R. Mehta', extensions.crypt('Sentinel#2026', extensions.gen_salt('bf')),'c0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002');

-- 50 synthetic patients
insert into public.patients (id, synthetic_mrn, display_name, department_id, demographic_band)
select
  ('b0000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'MRN-DEMO-' || (10400 + i)::text,
  (array['Ava','Noel','Kiran','Rhea','Dev','Mira','Omar','Tara','Ilya','Sana'])[((i-1) % 10) + 1]
    || ' ' || (array['Demo','Sample','Synth','Mock','Test'])[((i-1) % 5) + 1] || '-' || lpad(i::text,3,'0'),
  ('d0000000-0000-4000-8000-' || lpad((((i-1) % 5) + 1)::text, 12, '0'))::uuid,
  (array['18-29','30-44','45-59','60-74','75+'])[((i * 3 - 1) % 5) + 1]
from generate_series(1, 50) as i;

insert into public.patient_records (id, patient_id, record_type, title, payload, created_at)
select
  (md5('rec-' || i::text || '-' || k::text))::uuid,
  ('b0000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  (array['VISIT','MEDICATION','HISTORY','NOTE'])[k],
  (array['Routine follow-up visit','Active prescription','Past medical history','Clinical note'])[k],
  jsonb_build_object(
    'summary', (array[
      'Scheduled review; vitals stable, no acute findings recorded in this synthetic record.',
      'Synthetic medication entry for demonstration. Dosage values are illustrative only.',
      'Synthetic history entry describing prior encounters within this demo dataset.',
      'Synthetic clinician note generated for the EHR Sentinel demonstration dataset.'])[k],
    'synthetic', true),
  now() - ((i * 7 + k * 3) || ' days')::interval
from generate_series(1, 50) as i, generate_series(1, 4) as k;

-- Care assignments: clinicians own their department cohort.
insert into public.care_assignments (id, user_id, patient_id, valid_from)
select (md5('asg-' || u.id::text || '-' || p.id::text))::uuid, u.id, p.id, now() - interval '60 days'
from public.users u
join public.patients p on p.department_id = u.department_id
where u.username in ('physician.demo','nurse.demo','specialist.demo','emergency.demo');

-- Emergency physician also covers General Medicine overflow (historically elevated workload).
insert into public.care_assignments (id, user_id, patient_id, valid_from)
select (md5('asg-ov-' || p.id::text))::uuid,
       'a0000000-0000-4000-8000-000000000006'::uuid, p.id, now() - interval '60 days'
from public.patients p
where p.department_id = 'd0000000-0000-4000-8000-000000000005'
on conflict do nothing;

-- Baseline normal activity (14 days) used for behavioral baselines.
insert into public.access_events
  (id, ts, event_type, user_id, username, role, department_id, action, target_type, target_id,
   result, reason_code, records_returned, source_ip, session_id, correlation_id, scenario_tag)
select
  (md5('norm-' || u.username || '-' || d::text || '-' || k::text))::uuid,
  date_trunc('day', now()) - (d || ' days')::interval
    + ((case when u.username = 'emergency.demo' then 8 else 9 end + ((k * 2) % 9)) || ' hours')::interval
    + (((k * 13) % 60) || ' minutes')::interval,
  'RECORD_ACCESS', u.id, u.username, r.name, u.department_id, 'VIEW', 'PATIENT',
  (select p.id from public.patients p where p.department_id = u.department_id
    order by p.synthetic_mrn offset ((d * 3 + k) % 10) limit 1),
  'SUCCESS', null,
  case when u.username = 'emergency.demo' then 14 + ((d * 5 + k * 3) % 12)
       else 5 + ((d * 3 + k * 2) % 8) end,
  '10.20.4.' || (10 + (d % 5))::text,
  (md5('sess-' || u.username || '-' || d::text))::uuid,
  (md5('corr-' || u.username || '-' || d::text || '-' || k::text))::uuid,
  'BASELINE'
from public.users u
join public.roles r on r.id = u.role_id
cross join generate_series(1, 14) as d
cross join generate_series(1, 6) as k
where u.username in ('physician.demo','nurse.demo','specialist.demo','emergency.demo');

insert into public.access_events
  (id, ts, event_type, user_id, username, role, department_id, action, target_type, target_id,
   result, reason_code, records_returned, source_ip, session_id, correlation_id, scenario_tag)
select
  (md5('login-' || u.username || '-' || d::text))::uuid,
  date_trunc('day', now()) - (d || ' days')::interval + interval '8 hours' + ((d % 20) || ' minutes')::interval,
  'AUTH', u.id, u.username, r.name, u.department_id, 'LOGIN', 'SESSION', null,
  'SUCCESS', null, 0, '10.20.4.' || (10 + (d % 5))::text,
  (md5('sess-' || u.username || '-' || d::text))::uuid,
  (md5('corrlogin-' || u.username || '-' || d::text))::uuid,
  'BASELINE'
from public.users u
join public.roles r on r.id = u.role_id
cross join generate_series(1, 14) as d
where u.username in ('physician.demo','nurse.demo','specialist.demo','emergency.demo','security.demo','admin.demo');

-- Initial behavior profiles derived from benign baseline activity only.
insert into public.behavior_profiles
  (user_id, window_days, login_rate, avg_records_per_action, std_records_per_action,
   avg_records_per_hour, unique_patients_per_session, dept_entropy, common_hours,
   failed_login_rate, sample_size, model_version)
select
  e.user_id, 14,
  round(count(*) filter (where e.action = 'LOGIN')::numeric / 14, 2),
  round(coalesce(avg(e.records_returned) filter (where e.records_returned > 0), 0), 2),
  round(coalesce(stddev_samp(e.records_returned) filter (where e.records_returned > 0), 0), 2),
  round(coalesce(sum(e.records_returned)::numeric / nullif(count(distinct date_trunc('hour', e.ts)), 0), 0), 2),
  round(count(distinct e.target_id)::numeric / nullif(count(distinct e.session_id), 0), 2),
  0,
  array(select distinct extract(hour from x.ts)::int from public.access_events x
        where x.user_id = e.user_id and x.records_returned > 0 order by 1),
  0,
  count(*)::int,
  'demo-v1'
from public.access_events e
where e.scenario_tag = 'BASELINE' and e.user_id is not null
group by e.user_id;