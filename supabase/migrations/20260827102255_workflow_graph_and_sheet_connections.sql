create table public.workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  node_key text not null,
  node_type text not null check (node_type in ('form_input', 'approval', 'condition', 'action', 'google_drive', 'google_sheet', 'pdf_output', 'end')),
  name text not null,
  role_key text,
  configuration jsonb not null default '{}',
  position_x integer not null default 0,
  position_y integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_definition_id, node_key)
);

create table public.workflow_edges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  source_node_id uuid not null references public.workflow_nodes(id) on delete cascade,
  target_node_id uuid not null references public.workflow_nodes(id) on delete cascade,
  route_label text,
  condition jsonb not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (source_node_id, target_node_id, route_label)
);

create table public.workflow_role_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  role_key text not null,
  permission_key text not null check (permission_key in (
    'create_request', 'view_own', 'view_assigned', 'view_all', 'edit_draft',
    'edit_returned', 'edit_values', 'view_attachments', 'approve', 'reject',
    'return_for_changes', 'view_final_pdf', 'manage_workflow'
  )),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workflow_definition_id, role_key, permission_key)
);

create table public.google_sheet_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  google_connection_id uuid not null references public.google_connections(id) on delete cascade,
  workflow_definition_id uuid references public.workflow_definitions(id) on delete cascade,
  spreadsheet_id text not null,
  spreadsheet_name text not null,
  sheet_id integer,
  sheet_name text not null,
  header_row integer not null default 1 check (header_row > 0),
  sync_direction text not null default 'workgrid_to_google' check (sync_direction in ('workgrid_to_google', 'google_to_workgrid', 'bidirectional')),
  conflict_policy text not null default 'manual_review' check (conflict_policy in ('workgrid_wins', 'google_wins', 'manual_review')),
  status text not null default 'active' check (status in ('active', 'paused', 'inaccessible')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, spreadsheet_id, sheet_name, workflow_definition_id)
);

create table public.google_sheet_field_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sheet_connection_id uuid not null references public.google_sheet_connections(id) on delete cascade,
  source_type text not null check (source_type in ('form_field', 'workflow_status', 'workflow_reference', 'approver', 'decision', 'timestamp', 'system')),
  source_key text not null,
  target_column text not null,
  target_column_index integer check (target_column_index is null or target_column_index >= 0),
  value_type text not null default 'text' check (value_type in ('text', 'number', 'currency', 'date', 'datetime', 'boolean', 'json')),
  required boolean not null default false,
  created_at timestamptz not null default now(),
  unique (sheet_connection_id, source_type, source_key),
  unique (sheet_connection_id, target_column)
);

create index workflow_nodes_definition_idx on public.workflow_nodes(tenant_id, workflow_definition_id);
create index workflow_edges_definition_idx on public.workflow_edges(tenant_id, workflow_definition_id);
create index workflow_permissions_definition_idx on public.workflow_role_permissions(tenant_id, workflow_definition_id);
create index google_sheet_connections_tenant_idx on public.google_sheet_connections(tenant_id, status);
create index google_sheet_mappings_connection_idx on public.google_sheet_field_mappings(sheet_connection_id);

alter table public.workflow_nodes enable row level security;
alter table public.workflow_edges enable row level security;
alter table public.workflow_role_permissions enable row level security;
alter table public.google_sheet_connections enable row level security;
alter table public.google_sheet_field_mappings enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['workflow_nodes', 'workflow_edges', 'workflow_role_permissions', 'google_sheet_connections'] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.is_tenant_member(tenant_id) or private.is_platform_admin())', table_name || '_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_tenant_role(tenant_id, array[''owner'', ''admin'', ''manager'']::public.tenant_role[]) or private.is_platform_admin())', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_tenant_role(tenant_id, array[''owner'', ''admin'', ''manager'']::public.tenant_role[]) or private.is_platform_admin()) with check (private.has_tenant_role(tenant_id, array[''owner'', ''admin'', ''manager'']::public.tenant_role[]) or private.is_platform_admin())', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_tenant_role(tenant_id, array[''owner'', ''admin'']::public.tenant_role[]) or private.is_platform_admin())', table_name || '_delete', table_name);
  end loop;
end $$;

create policy google_sheet_field_mappings_select on public.google_sheet_field_mappings
  for select to authenticated using (private.is_tenant_member(tenant_id) or private.is_platform_admin());
create policy google_sheet_field_mappings_insert on public.google_sheet_field_mappings
  for insert to authenticated with check (private.has_tenant_role(tenant_id, array['owner','admin','manager']::public.tenant_role[]) or private.is_platform_admin());
create policy google_sheet_field_mappings_update on public.google_sheet_field_mappings
  for update to authenticated
  using (private.has_tenant_role(tenant_id, array['owner','admin','manager']::public.tenant_role[]) or private.is_platform_admin())
  with check (private.has_tenant_role(tenant_id, array['owner','admin','manager']::public.tenant_role[]) or private.is_platform_admin());
create policy google_sheet_field_mappings_delete on public.google_sheet_field_mappings
  for delete to authenticated using (private.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role[]) or private.is_platform_admin());

grant select, insert, update, delete on public.workflow_nodes, public.workflow_edges,
  public.workflow_role_permissions, public.google_sheet_connections,
  public.google_sheet_field_mappings to authenticated;
