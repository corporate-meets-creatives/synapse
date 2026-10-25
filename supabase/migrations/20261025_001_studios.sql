create table if not exists studios (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists instructors (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists instructors_studio_id_idx on instructors(studio_id);

alter table studios enable row level security;
alter table instructors enable row level security;
