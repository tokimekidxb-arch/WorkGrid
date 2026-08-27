create table public.workflow_template_folders (
  id uuid primary key default gen_random_uuid(),
  folder_key text not null unique check (folder_key ~ '^[a-z0-9_]+$'),
  name text not null,
  description text,
  industry_key text not null default 'general',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workflow_templates
  add column folder_id uuid references public.workflow_template_folders(id) on delete set null;

create index workflow_templates_folder_idx on public.workflow_templates(folder_id, is_published);
alter table public.workflow_template_folders enable row level security;

create policy workflow_template_folders_select on public.workflow_template_folders
  for select to authenticated using (is_active or private.is_platform_admin());
create policy workflow_template_folders_manage on public.workflow_template_folders
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

grant select, insert, update, delete on public.workflow_template_folders to authenticated;

insert into public.workflow_template_folders (folder_key, name, description, industry_key, sort_order)
values ('general_workflows', 'General Workflows', 'Essential workflows useful for every type of business.', 'general', 10)
on conflict (folder_key) do update set name = excluded.name, description = excluded.description, is_active = true;

with folder as (
  select id from public.workflow_template_folders where folder_key = 'general_workflows'
), catalog(template_key, name, category, stages) as (values
  ('incident_report', 'Incident report', 'Operations', 4),
  ('travel_request', 'Travel request', 'Finance', 4),
  ('it_support_request', 'IT support request', 'Operations', 3),
  ('contract_approval', 'Contract approval', 'Operations', 5)
)
insert into public.workflow_templates (
  owner_scope, folder_id, template_key, name, description, category, industry_keys,
  tags, definition, difficulty, estimated_setup_minutes, is_featured, is_published
)
select 'system', folder.id, template_key, name,
  'Essential workflow for every business. Copy it to a client workspace and configure its roles and Google destinations.',
  category, array['general'], array['general', 'essential'],
  jsonb_build_object(
    'trigger', 'form_submission',
    'stages', (select jsonb_agg(jsonb_build_object('key', 'stage_' || n, 'name', 'Stage ' || n, 'order', n)) from generate_series(1, stages) n),
    'integrations', jsonb_build_object('google_sheets', true, 'google_drive', true),
    'completion', jsonb_build_object('generate_pdf', true)
  ), 'standard', 20, false, true
from catalog cross join folder
on conflict (template_key) where owner_scope = 'system' and template_key is not null do update set
  folder_id = excluded.folder_id, name = excluded.name, category = excluded.category,
  industry_keys = excluded.industry_keys, definition = excluded.definition, is_published = true;

update public.workflow_templates
set folder_id = (select id from public.workflow_template_folders where folder_key = 'general_workflows')
where owner_scope = 'system' and 'general' = any(industry_keys);
