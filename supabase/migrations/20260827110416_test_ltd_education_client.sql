create table public.tenant_staff_seats (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  seat_key text not null,
  role_name text not null,
  tenant_role public.tenant_role not null,
  assigned_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'available' check (status in ('available', 'invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  unique (tenant_id, seat_key)
);

create table public.client_drive_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  folder_name text not null,
  google_folder_id text not null,
  folder_url text not null,
  connection_status text not null default 'oauth_required' check (connection_status in ('oauth_required', 'connected', 'disconnected', 'inaccessible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, google_folder_id)
);

create table public.workflow_sheet_mapping_blueprints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  sheet_name text not null,
  columns jsonb not null check (jsonb_typeof(columns) = 'array'),
  destination_folder_link_id uuid references public.client_drive_links(id) on delete set null,
  status text not null default 'ready' check (status in ('draft', 'ready', 'connected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_definition_id)
);

create index tenant_staff_seats_tenant_idx on public.tenant_staff_seats(tenant_id, status);
create index client_drive_links_tenant_idx on public.client_drive_links(tenant_id, connection_status);
create index workflow_mapping_blueprints_tenant_idx on public.workflow_sheet_mapping_blueprints(tenant_id, workflow_definition_id);

alter table public.tenant_staff_seats enable row level security;
alter table public.client_drive_links enable row level security;
alter table public.workflow_sheet_mapping_blueprints enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['tenant_staff_seats', 'client_drive_links', 'workflow_sheet_mapping_blueprints'] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.is_tenant_member(tenant_id) or private.is_platform_admin())', table_name || '_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_tenant_role(tenant_id, array[''owner'', ''admin'']::public.tenant_role[]) or private.is_platform_admin())', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_tenant_role(tenant_id, array[''owner'', ''admin'']::public.tenant_role[]) or private.is_platform_admin()) with check (private.has_tenant_role(tenant_id, array[''owner'', ''admin'']::public.tenant_role[]) or private.is_platform_admin())', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_tenant_role(tenant_id, array[''owner'', ''admin'']::public.tenant_role[]) or private.is_platform_admin())', table_name || '_delete', table_name);
  end loop;
end $$;

grant select, insert, update, delete on public.tenant_staff_seats, public.client_drive_links,
  public.workflow_sheet_mapping_blueprints to authenticated;

delete from public.workflow_templates
where name = 'Equipment request approval' and is_published = false;

insert into public.tenants (name, slug, created_by, industry_id)
select 'TEST LTD', 'test-ltd', au.id, i.id
from auth.users au cross join public.industries i
where lower(au.email) = lower('tokimekidxb@gmail.com') and i.industry_key = 'education'
on conflict (slug) do update set name = excluded.name, industry_id = excluded.industry_id, updated_at = now();

insert into public.tenant_members (tenant_id, user_id, role, status)
select t.id, au.id, 'owner'::public.tenant_role, 'active'
from public.tenants t cross join auth.users au
where t.slug = 'test-ltd' and lower(au.email) = lower('tokimekidxb@gmail.com')
on conflict (tenant_id, user_id) do update set role = 'owner', status = 'active';

insert into public.tenant_subscriptions (tenant_id, plan_id, status, assigned_by)
select t.id, p.id, 'active', au.id
from public.tenants t cross join public.platform_plans p cross join auth.users au
where t.slug = 'test-ltd' and p.plan_key = 'basic' and lower(au.email) = lower('tokimekidxb@gmail.com')
on conflict (tenant_id) do update set plan_id = excluded.plan_id, status = 'active', assigned_by = excluded.assigned_by, updated_at = now();

insert into public.client_drive_links (tenant_id, folder_name, google_folder_id, folder_url, connection_status)
select id, 'TEST LTD', '1S_dCzrDgLtOVmCkQXFMXEHtS2i21PTy_',
  'https://drive.google.com/drive/folders/1S_dCzrDgLtOVmCkQXFMXEHtS2i21PTy_', 'oauth_required'
from public.tenants where slug = 'test-ltd'
on conflict (tenant_id, google_folder_id) do update set folder_name = excluded.folder_name, folder_url = excluded.folder_url, updated_at = now();

insert into public.tenant_staff_seats (tenant_id, seat_key, role_name, tenant_role, assigned_user_id, status)
select t.id, seat.seat_key, seat.role_name, seat.tenant_role, case when seat.seat_key = 'workspace_owner' then au.id end,
  case when seat.seat_key = 'workspace_owner' then 'active' else 'available' end
from public.tenants t
cross join auth.users au
cross join (values
  ('workspace_owner', 'Workspace owner', 'owner'::public.tenant_role),
  ('education_manager', 'Education manager', 'manager'::public.tenant_role),
  ('finance_approver', 'Finance approver', 'manager'::public.tenant_role),
  ('workflow_administrator', 'Workflow administrator', 'admin'::public.tenant_role),
  ('staff_requester', 'Staff requester', 'member'::public.tenant_role)
) as seat(seat_key, role_name, tenant_role)
where t.slug = 'test-ltd' and lower(au.email) = lower('tokimekidxb@gmail.com')
on conflict (tenant_id, seat_key) do update set role_name = excluded.role_name, tenant_role = excluded.tenant_role,
  assigned_user_id = excluded.assigned_user_id, status = excluded.status;

with selected(template_key, workflow_name, form_name) as (values
  ('leave_request', 'Leave request', 'Leave request form'),
  ('document_approval', 'Document approval', 'Document approval form'),
  ('expense_reimbursement', 'Expense reimbursement', 'Expense reimbursement form'),
  ('incident_report', 'Incident report', 'Incident report form'),
  ('it_support_request', 'IT support request', 'IT support request form')
), context as (
  select t.id as tenant_id, au.id as user_id from public.tenants t cross join auth.users au
  where t.slug = 'test-ltd' and lower(au.email) = lower('tokimekidxb@gmail.com')
)
insert into public.forms (tenant_id, name, description, status, schema, created_by)
select c.tenant_id, s.form_name, 'Input form for the ' || s.workflow_name || ' workflow.', 'active',
  '{"fields":[{"key":"request_title","label":"Request title","type":"text","required":true},{"key":"details","label":"Details","type":"textarea","required":true},{"key":"attachments","label":"Attachments","type":"files","required":false}]}'::jsonb,
  c.user_id
from selected s cross join context c
where not exists (select 1 from public.forms f where f.tenant_id = c.tenant_id and f.name = s.form_name);

with selected(template_key, workflow_name) as (values
  ('leave_request', 'Leave request'),
  ('document_approval', 'Document approval'),
  ('expense_reimbursement', 'Expense reimbursement'),
  ('incident_report', 'Incident report'),
  ('it_support_request', 'IT support request')
), context as (
  select t.id as tenant_id, au.id as user_id from public.tenants t cross join auth.users au
  where t.slug = 'test-ltd' and lower(au.email) = lower('tokimekidxb@gmail.com')
)
insert into public.workflow_definitions (tenant_id, template_id, name, description, status, definition, created_by, creation_source)
select c.tenant_id, wt.id, s.workflow_name, 'General workflow configured for TEST LTD.', 'active', wt.definition, c.user_id, 'template'
from selected s cross join context c join public.workflow_templates wt on wt.template_key = s.template_key
where not exists (select 1 from public.workflow_definitions wd where wd.tenant_id = c.tenant_id and wd.name = s.workflow_name);

insert into public.workflow_sheet_mapping_blueprints (tenant_id, workflow_definition_id, sheet_name, columns, destination_folder_link_id, status)
select wd.tenant_id, wd.id, replace(wd.name, ' ', '_'),
  jsonb_build_array(
    jsonb_build_object('source', 'workflow.reference_number', 'column', 'Reference', 'type', 'text'),
    jsonb_build_object('source', 'form.request_title', 'column', 'Request Title', 'type', 'text'),
    jsonb_build_object('source', 'form.details', 'column', 'Details', 'type', 'text'),
    jsonb_build_object('source', 'workflow.status', 'column', 'Status', 'type', 'text'),
    jsonb_build_object('source', 'workflow.current_approver_role', 'column', 'Current Approver Role', 'type', 'text'),
    jsonb_build_object('source', 'workflow.started_at', 'column', 'Submitted At', 'type', 'datetime'),
    jsonb_build_object('source', 'report.google_drive_file_id', 'column', 'Final PDF', 'type', 'text')
  ), dl.id, 'ready'
from public.workflow_definitions wd
join public.tenants t on t.id = wd.tenant_id and t.slug = 'test-ltd'
join public.client_drive_links dl on dl.tenant_id = t.id
where wd.name in ('Leave request', 'Document approval', 'Expense reimbursement', 'Incident report', 'IT support request')
on conflict (workflow_definition_id) do update set columns = excluded.columns,
  destination_folder_link_id = excluded.destination_folder_link_id, status = 'ready', updated_at = now();
