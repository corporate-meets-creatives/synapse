create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  instructor_id uuid references instructors(id) on delete set null,
  provider_id text not null,
  form_version text not null,
  fields jsonb not null default '[]',
  status text not null default 'draft'
    check (status in ('draft', 'approved_for_copying', 'submitted_owner_reported')),
  version int not null default 1,
  approved_version int,
  approved_at timestamptz,
  submitted_at timestamptz,
  prefill_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_studio_id_idx on applications(studio_id);

alter table applications enable row level security;
-- No policies: only the backend (secret key) can read/write.
