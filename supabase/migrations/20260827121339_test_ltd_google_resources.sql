with tenant as (
  select id, created_by
  from public.tenants
  where slug = 'test-ltd'
)
insert into public.google_connections (
  tenant_id,
  connected_by,
  google_account_id,
  google_email,
  account_type,
  scopes,
  encrypted_refresh_token,
  status,
  auth_mode
)
select
  id,
  created_by,
  'testltd@workgrid-506811.iam.gserviceaccount.com',
  'testltd@workgrid-506811.iam.gserviceaccount.com',
  'unknown',
  array[
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
  ],
  null,
  'active',
  'service_account'
from tenant
on conflict (tenant_id, google_account_id) do update
set google_email = excluded.google_email,
    account_type = excluded.account_type,
    scopes = excluded.scopes,
    encrypted_refresh_token = null,
    status = 'active',
    auth_mode = 'service_account',
    updated_at = now();

with connection as (
  select gc.id as connection_id, gc.tenant_id
  from public.google_connections gc
  join public.tenants t on t.id = gc.tenant_id
  where t.slug = 'test-ltd'
    and gc.google_account_id = 'testltd@workgrid-506811.iam.gserviceaccount.com'
), resources(resource_type, logical_name, google_id, parent_google_id, metadata) as (
  values
    ('drive_folder', 'TEST LTD', '1S_dCzrDgLtOVmCkQXFMXEHtS2i21PTy_', null, '{"url":"https://drive.google.com/drive/folders/1S_dCzrDgLtOVmCkQXFMXEHtS2i21PTy_","ownership":"client"}'::jsonb),
    ('drive_folder', 'Forms', '1SIg3krhMmVCorYP7ng_UT00fUz8ULcrt', '1S_dCzrDgLtOVmCkQXFMXEHtS2i21PTy_', '{"url":"https://drive.google.com/drive/folders/1SIg3krhMmVCorYP7ng_UT00fUz8ULcrt"}'::jsonb),
    ('drive_folder', 'Workflows', '16JH0mBRgmcOUGqAjy3cB_Ds7o0Va2iLG', '1S_dCzrDgLtOVmCkQXFMXEHtS2i21PTy_', '{"url":"https://drive.google.com/drive/folders/16JH0mBRgmcOUGqAjy3cB_Ds7o0Va2iLG"}'::jsonb),
    ('drive_folder', 'Reports', '1TQK6dOaM19q3ElSVE2GXyw0R6CZkYPKZ', '1S_dCzrDgLtOVmCkQXFMXEHtS2i21PTy_', '{"url":"https://drive.google.com/drive/folders/1TQK6dOaM19q3ElSVE2GXyw0R6CZkYPKZ"}'::jsonb),
    ('spreadsheet', 'TEST LTD - WorkGrid Data', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE', '1S_dCzrDgLtOVmCkQXFMXEHtS2i21PTy_', '{"url":"https://docs.google.com/spreadsheets/d/1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE/edit","native":true}'::jsonb),
    ('sheet_tab', '_Config', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE#gid=363980077', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE', '{"sheet_id":363980077}'::jsonb),
    ('sheet_tab', '_SyncLog', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE#gid=2016994139', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE', '{"sheet_id":2016994139}'::jsonb),
    ('sheet_tab', 'Leave Requests', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE#gid=927530412', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE', '{"sheet_id":927530412}'::jsonb),
    ('sheet_tab', 'Document Approvals', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE#gid=288481517', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE', '{"sheet_id":288481517}'::jsonb),
    ('sheet_tab', 'Expense Reimbursements', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE#gid=219901314', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE', '{"sheet_id":219901314}'::jsonb),
    ('sheet_tab', 'Incident Reports', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE#gid=421358936', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE', '{"sheet_id":421358936}'::jsonb),
    ('sheet_tab', 'IT Support Requests', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE#gid=2081696947', '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE', '{"sheet_id":2081696947}'::jsonb)
)
insert into public.google_resources (
  tenant_id,
  connection_id,
  resource_type,
  logical_name,
  google_id,
  parent_google_id,
  metadata,
  status
)
select c.tenant_id, c.connection_id, r.resource_type, r.logical_name, r.google_id, r.parent_google_id, r.metadata, 'active'
from connection c
cross join resources r
on conflict (tenant_id, google_id) do update
set connection_id = excluded.connection_id,
    resource_type = excluded.resource_type,
    logical_name = excluded.logical_name,
    parent_google_id = excluded.parent_google_id,
    metadata = excluded.metadata,
    status = 'active',
    updated_at = now();

with tab_map(workflow_name, sheet_name, sheet_id) as (
  values
    ('Leave request', 'Leave Requests', 927530412),
    ('Document approval', 'Document Approvals', 288481517),
    ('Expense reimbursement', 'Expense Reimbursements', 219901314),
    ('Incident report', 'Incident Reports', 421358936),
    ('IT support request', 'IT Support Requests', 2081696947)
), source_rows as (
  select
    t.id as tenant_id,
    gc.id as google_connection_id,
    wd.id as workflow_definition_id,
    tm.sheet_name,
    tm.sheet_id
  from public.tenants t
  join public.google_connections gc
    on gc.tenant_id = t.id
   and gc.google_account_id = 'testltd@workgrid-506811.iam.gserviceaccount.com'
  join public.workflow_definitions wd on wd.tenant_id = t.id
  join tab_map tm on tm.workflow_name = wd.name
  where t.slug = 'test-ltd'
)
insert into public.google_sheet_connections (
  tenant_id,
  google_connection_id,
  workflow_definition_id,
  spreadsheet_id,
  spreadsheet_name,
  sheet_id,
  sheet_name,
  header_row,
  sync_direction,
  conflict_policy,
  status,
  last_synced_at
)
select
  tenant_id,
  google_connection_id,
  workflow_definition_id,
  '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE',
  'TEST LTD - WorkGrid Data',
  sheet_id,
  sheet_name,
  1,
  'workgrid_to_google',
  'workgrid_wins',
  'active',
  now()
from source_rows
on conflict (tenant_id, spreadsheet_id, sheet_name, workflow_definition_id) do update
set google_connection_id = excluded.google_connection_id,
    spreadsheet_name = excluded.spreadsheet_name,
    sheet_id = excluded.sheet_id,
    header_row = excluded.header_row,
    sync_direction = excluded.sync_direction,
    conflict_policy = excluded.conflict_policy,
    status = 'active',
    last_synced_at = excluded.last_synced_at,
    updated_at = now();

with actual_tabs(workflow_name, sheet_name) as (
  values
    ('Leave request', 'Leave Requests'),
    ('Document approval', 'Document Approvals'),
    ('Expense reimbursement', 'Expense Reimbursements'),
    ('Incident report', 'Incident Reports'),
    ('IT support request', 'IT Support Requests')
)
update public.workflow_sheet_mapping_blueprints blueprint
set sheet_name = actual_tabs.sheet_name,
    status = 'connected',
    updated_at = now()
from public.workflow_definitions wd
join actual_tabs on actual_tabs.workflow_name = wd.name
where blueprint.workflow_definition_id = wd.id
  and blueprint.tenant_id = (select id from public.tenants where slug = 'test-ltd');

with blueprint_columns as (
  select
    blueprint.tenant_id,
    sheet_connection.id as sheet_connection_id,
    column_definition.value as definition,
    column_definition.ordinality - 1 as column_index
  from public.workflow_sheet_mapping_blueprints blueprint
  join public.google_sheet_connections sheet_connection
    on sheet_connection.tenant_id = blueprint.tenant_id
   and sheet_connection.workflow_definition_id = blueprint.workflow_definition_id
   and sheet_connection.sheet_name = blueprint.sheet_name
   and sheet_connection.spreadsheet_id = '1A70KUthjq17UvN2x7jTx1EwPTfBQlK-G_ljMLiL0QfE'
  cross join lateral jsonb_array_elements(blueprint.columns) with ordinality as column_definition(value, ordinality)
  where blueprint.tenant_id = (select id from public.tenants where slug = 'test-ltd')
)
insert into public.google_sheet_field_mappings (
  tenant_id,
  sheet_connection_id,
  source_type,
  source_key,
  target_column,
  target_column_index,
  value_type,
  required
)
select
  tenant_id,
  sheet_connection_id,
  case
    when definition->>'source' = 'workflow.reference_number' then 'workflow_reference'
    when definition->>'source' = 'workflow.status' then 'workflow_status'
    when definition->>'source' = 'workflow.current_approver_role' then 'approver'
    when definition->>'source' = 'workflow.started_at' then 'timestamp'
    when definition->>'source' like 'form.%' then 'form_field'
    else 'system'
  end,
  case
    when definition->>'source' like 'form.%' then split_part(definition->>'source', '.', 2)
    when definition->>'source' like 'workflow.%' then split_part(definition->>'source', '.', 2)
    else definition->>'source'
  end,
  definition->>'column',
  column_index::integer,
  definition->>'type',
  definition->>'source' <> 'report.google_drive_file_id'
from blueprint_columns
on conflict (sheet_connection_id, source_type, source_key) do update
set target_column = excluded.target_column,
    target_column_index = excluded.target_column_index,
    value_type = excluded.value_type,
    required = excluded.required;
