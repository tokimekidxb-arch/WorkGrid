create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.tenant_role as enum ('owner', 'admin', 'manager', 'member', 'viewer');
create type public.record_status as enum ('draft', 'active', 'archived');
create type public.workflow_instance_status as enum ('pending', 'active', 'completed', 'rejected', 'cancelled');
create type public.job_status as enum ('queued', 'running', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_role not null default 'member',
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create or replace function private.is_tenant_member(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.tenant_members
    where tenant_id = target_tenant
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create or replace function private.has_tenant_role(target_tenant uuid, allowed_roles public.tenant_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.tenant_members
    where tenant_id = target_tenant
      and user_id = (select auth.uid())
      and status = 'active'
      and role = any(allowed_roles)
  );
$$;

revoke all on function private.is_tenant_member(uuid) from public;
revoke all on function private.has_tenant_role(uuid, public.tenant_role[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_tenant_member(uuid) to authenticated;
grant execute on function private.has_tenant_role(uuid, public.tenant_role[]) to authenticated;

create table public.google_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  connected_by uuid not null references auth.users(id),
  google_account_id text not null,
  google_email text not null,
  account_type text not null default 'unknown' check (account_type in ('personal', 'workspace', 'unknown')),
  scopes text[] not null default '{}',
  encrypted_refresh_token text not null,
  access_token_expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, google_account_id)
);

create table public.google_resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  connection_id uuid not null references public.google_connections(id) on delete cascade,
  resource_type text not null check (resource_type in ('drive_folder', 'spreadsheet', 'sheet_tab', 'drive_file')),
  logical_name text not null,
  google_id text not null,
  parent_google_id text,
  metadata jsonb not null default '{}',
  status text not null default 'active' check (status in ('active', 'missing', 'inaccessible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, google_id)
);

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  status public.record_status not null default 'draft',
  schema jsonb not null default '{"fields":[]}',
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  form_id uuid not null references public.forms(id),
  submitted_by uuid references auth.users(id),
  values jsonb not null default '{}',
  drive_folder_resource_id uuid references public.google_resources(id),
  created_at timestamptz not null default now()
);

create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  owner_scope text not null check (owner_scope in ('system', 'tenant')),
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  definition jsonb not null default '{}',
  version integer not null default 1 check (version > 0),
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((owner_scope = 'system' and tenant_id is null) or (owner_scope = 'tenant' and tenant_id is not null))
);

create table public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  template_id uuid references public.workflow_templates(id),
  name text not null,
  description text,
  status public.record_status not null default 'draft',
  definition jsonb not null default '{"trigger":null,"stages":[],"integrations":{},"completion":{"generate_pdf":true}}',
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id),
  workflow_version integer not null,
  source_form_submission_id uuid references public.form_submissions(id),
  reference_number text not null,
  status public.workflow_instance_status not null default 'pending',
  current_stage_key text,
  data jsonb not null default '{}',
  started_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_reason text,
  unique (tenant_id, reference_number)
);

create table public.workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  stage_key text not null,
  assigned_to uuid references auth.users(id),
  assigned_role public.tenant_role,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'skipped')),
  decision text,
  comment text,
  completed_by uuid references auth.users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  event_type text not null,
  actor_id uuid references auth.users(id),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.sync_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  google_resource_id uuid not null references public.google_resources(id),
  mapping_type text not null check (mapping_type in ('append', 'update', 'read_only')),
  column_mapping jsonb not null default '{}',
  conflict_policy text not null default 'manual_review' check (conflict_policy in ('workgrid_wins', 'google_wins', 'manual_review')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  resource_id uuid references public.google_resources(id),
  direction text not null check (direction in ('push', 'pull', 'bidirectional')),
  status public.job_status not null default 'queued',
  idempotency_key text not null unique,
  payload jsonb not null default '{}',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  report_type text not null default 'workflow_close',
  google_drive_file_id text,
  file_name text not null,
  generated_at timestamptz,
  status public.job_status not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  unique (workflow_instance_id, report_type)
);

create index tenant_members_user_idx on public.tenant_members(user_id, status);
create index forms_tenant_idx on public.forms(tenant_id, status);
create index submissions_tenant_idx on public.form_submissions(tenant_id, created_at desc);
create index workflow_definitions_tenant_idx on public.workflow_definitions(tenant_id, status);
create index workflow_instances_tenant_idx on public.workflow_instances(tenant_id, status, started_at desc);
create index workflow_tasks_assignee_idx on public.workflow_tasks(tenant_id, assigned_to, status);
create index workflow_events_instance_idx on public.workflow_events(workflow_instance_id, created_at);
create index sync_jobs_status_idx on public.sync_jobs(tenant_id, status, created_at);

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.google_connections enable row level security;
alter table public.google_resources enable row level security;
alter table public.forms enable row level security;
alter table public.form_submissions enable row level security;
alter table public.workflow_templates enable row level security;
alter table public.workflow_definitions enable row level security;
alter table public.workflow_instances enable row level security;
alter table public.workflow_tasks enable row level security;
alter table public.workflow_events enable row level security;
alter table public.sync_mappings enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.reports enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_self_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy tenants_member_select on public.tenants for select to authenticated using (private.is_tenant_member(id));
create policy tenant_members_member_select on public.tenant_members for select to authenticated using (private.is_tenant_member(tenant_id));

create policy google_connections_admin_select on public.google_connections for select to authenticated using (private.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role[]));
create policy google_resources_member_select on public.google_resources for select to authenticated using (private.is_tenant_member(tenant_id));
create policy workflow_templates_select on public.workflow_templates for select to authenticated using ((owner_scope = 'system' and is_published) or private.is_tenant_member(tenant_id));

do $$
declare table_name text;
begin
  foreach table_name in array array['forms','workflow_definitions','sync_mappings'] loop
    execute format('create policy %I_member_select on public.%I for select to authenticated using (private.is_tenant_member(tenant_id))', table_name, table_name);
    execute format('create policy %I_admin_insert on public.%I for insert to authenticated with check (private.has_tenant_role(tenant_id, array[''owner'',''admin'',''manager'']::public.tenant_role[]))', table_name, table_name);
    execute format('create policy %I_admin_update on public.%I for update to authenticated using (private.has_tenant_role(tenant_id, array[''owner'',''admin'',''manager'']::public.tenant_role[])) with check (private.has_tenant_role(tenant_id, array[''owner'',''admin'',''manager'']::public.tenant_role[]))', table_name, table_name);
    execute format('create policy %I_admin_delete on public.%I for delete to authenticated using (private.has_tenant_role(tenant_id, array[''owner'',''admin'']::public.tenant_role[]))', table_name, table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['form_submissions','workflow_instances','workflow_tasks','workflow_events','sync_jobs','reports'] loop
    execute format('create policy %I_member_select on public.%I for select to authenticated using (private.is_tenant_member(tenant_id))', table_name, table_name);
    execute format('create policy %I_member_insert on public.%I for insert to authenticated with check (private.is_tenant_member(tenant_id))', table_name, table_name);
    execute format('create policy %I_member_update on public.%I for update to authenticated using (private.is_tenant_member(tenant_id)) with check (private.is_tenant_member(tenant_id))', table_name, table_name);
  end loop;
end $$;

grant select, insert, update, delete on table public.profiles, public.tenants, public.tenant_members,
  public.google_connections, public.google_resources, public.forms, public.form_submissions,
  public.workflow_templates, public.workflow_definitions, public.workflow_instances,
  public.workflow_tasks, public.workflow_events, public.sync_mappings, public.sync_jobs,
  public.reports to authenticated;

revoke all on all tables in schema public from anon;
