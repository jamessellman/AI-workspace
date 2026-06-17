-- ===========================================================================
-- Personal AI Workspace — database schema, RLS policies, and storage setup
-- ---------------------------------------------------------------------------
-- Run this once against your Supabase project (SQL Editor → New query → paste
-- → Run). It is idempotent-ish: safe to re-run, but DROP statements at the top
-- let you reset cleanly during development.
--
-- Single-user app: every row is scoped to the authenticated user via RLS
-- (user_id = auth.uid()). Auth users are created via the Supabase dashboard
-- or `supabase auth` — there is no in-app signup.
-- ===========================================================================

-- Required for gen_random_uuid().
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- tasks
-- ===========================================================================
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'backlog'
              check (status in ('backlog', 'todo', 'in_progress', 'complete')),
  order_index integer not null default 0,
  due_date    date,
  document_id uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_status_order_idx
  on public.tasks (user_id, status, order_index);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- notes  (full-text search over title + body via generated tsvector)
-- ===========================================================================
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default '',
  body       text not null default '',
  category   text not null default 'general',
  search     tsvector generated always as (
               to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
             ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_search_idx on public.notes using gin (search);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- timesheets
-- ===========================================================================
create table if not exists public.timesheets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  project    text not null,
  hours      numeric(6, 2) not null check (hours >= 0),
  summary    text not null default '',
  worked_on  date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists timesheets_user_id_idx on public.timesheets (user_id);
create index if not exists timesheets_project_idx on public.timesheets (user_id, project);
create index if not exists timesheets_worked_on_idx on public.timesheets (user_id, worked_on);

drop trigger if exists timesheets_set_updated_at on public.timesheets;
create trigger timesheets_set_updated_at
  before update on public.timesheets
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- documents  (metadata; files live in the private `documents` storage bucket)
-- ===========================================================================
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  mime_type    text not null default 'application/octet-stream',
  size_bytes   bigint not null default 0,
  category     text not null default 'general',
  summary      text,
  task_id      uuid references public.tasks (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);
create index if not exists documents_task_id_idx on public.documents (task_id);
create index if not exists documents_category_idx on public.documents (user_id, category);

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- Link tasks.document_id back to documents now that both tables exist.
alter table public.tasks
  drop constraint if exists tasks_document_id_fkey;
alter table public.tasks
  add constraint tasks_document_id_fkey
  foreign key (document_id) references public.documents (id) on delete set null;

-- ===========================================================================
-- Row Level Security — every table scoped to the authenticated user
-- ===========================================================================
alter table public.tasks      enable row level security;
alter table public.notes      enable row level security;
alter table public.timesheets enable row level security;
alter table public.documents  enable row level security;

-- tasks
drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (user_id = auth.uid());
drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert with check (user_id = auth.uid());
drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete using (user_id = auth.uid());

-- notes
drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select using (user_id = auth.uid());
drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (user_id = auth.uid());
drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (user_id = auth.uid());

-- timesheets
drop policy if exists "timesheets_select_own" on public.timesheets;
create policy "timesheets_select_own" on public.timesheets
  for select using (user_id = auth.uid());
drop policy if exists "timesheets_insert_own" on public.timesheets;
create policy "timesheets_insert_own" on public.timesheets
  for insert with check (user_id = auth.uid());
drop policy if exists "timesheets_update_own" on public.timesheets;
create policy "timesheets_update_own" on public.timesheets
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "timesheets_delete_own" on public.timesheets;
create policy "timesheets_delete_own" on public.timesheets
  for delete using (user_id = auth.uid());

-- documents
drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select using (user_id = auth.uid());
drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert with check (user_id = auth.uid());
drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete using (user_id = auth.uid());

-- ===========================================================================
-- Storage — private `documents` bucket, objects scoped per user by path prefix
-- File paths are stored as `{user_id}/{uuid}-{filename}`. Access via signed URLs.
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_storage_select_own" on storage.objects;
create policy "documents_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_storage_insert_own" on storage.objects;
create policy "documents_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_storage_update_own" on storage.objects;
create policy "documents_storage_update_own" on storage.objects
  for update using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_storage_delete_own" on storage.objects;
create policy "documents_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
