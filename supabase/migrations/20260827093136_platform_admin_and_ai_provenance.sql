create type public.platform_role as enum ('owner', 'administrator', 'workflow_designer', 'support');

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.platform_role not null default 'administrator',
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table public.feature_catalog (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique check (feature_key ~ '^[a-z0-9_]+$'),
  name text not null,
  description text,
  category text not null default 'core',
  status text not null default 'active' check (status in ('active', 'beta', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_features (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  feature_id uuid not null references public.feature_catalog(id) on delete cascade,
  enabled boolean not null default false,
  configuration jsonb not null default '{}',
  enabled_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, feature_id)
);

alter table public.workflow_definitions
  add column creation_source text not null default 'manual'
    check (creation_source in ('manual', 'template', 'ai_assisted', 'ai_generated')),
  add column ai_generation jsonb,
  add column published_by_platform uuid references auth.users(id);

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.platform_admins
    where user_id = (select auth.uid())
      and status = 'active'
  );
$$;

revoke all on function private.is_platform_admin() from public;
grant execute on function private.is_platform_admin() to authenticated;

alter table public.platform_admins enable row level security;
alter table public.feature_catalog enable row level security;
alter table public.tenant_features enable row level security;

create policy platform_admins_self_select on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy feature_catalog_authenticated_select on public.feature_catalog
  for select to authenticated
  using (private.is_platform_admin() or status in ('active', 'beta'));

create policy feature_catalog_platform_manage on public.feature_catalog
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy tenant_features_member_select on public.tenant_features
  for select to authenticated
  using (private.is_tenant_member(tenant_id) or private.is_platform_admin());

create policy tenant_features_platform_manage on public.tenant_features
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'tenants', 'tenant_members', 'google_resources', 'forms', 'form_submissions',
    'workflow_definitions', 'workflow_instances', 'workflow_tasks', 'workflow_events',
    'sync_mappings', 'sync_jobs', 'reports'
  ] loop
    execute format(
      'create policy %I_platform_select on public.%I for select to authenticated using (private.is_platform_admin())',
      table_name, table_name
    );
  end loop;
end $$;

create policy tenants_platform_manage on public.tenants
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy tenant_members_platform_manage on public.tenant_members
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy workflow_definitions_platform_manage on public.workflow_definitions
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

grant select on public.platform_admins to authenticated;
grant select, insert, update, delete on public.feature_catalog, public.tenant_features to authenticated;

-- Google refresh tokens are server-only, even in encrypted form.
revoke select on public.google_connections from authenticated;
