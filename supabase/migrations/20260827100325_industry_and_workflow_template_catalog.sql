create table public.industries (
  id uuid primary key default gen_random_uuid(),
  industry_key text not null unique check (industry_key ~ '^[a-z0-9_]+$'),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenants add column industry_id uuid references public.industries(id);

alter table public.workflow_templates
  add column template_key text,
  add column industry_keys text[] not null default array['general']::text[],
  add column tags text[] not null default '{}',
  add column difficulty text not null default 'standard' check (difficulty in ('simple', 'standard', 'advanced')),
  add column estimated_setup_minutes integer not null default 15 check (estimated_setup_minutes > 0),
  add column is_featured boolean not null default false;

create unique index workflow_templates_system_key_idx
  on public.workflow_templates(template_key)
  where owner_scope = 'system' and template_key is not null;
create index workflow_templates_industries_idx on public.workflow_templates using gin(industry_keys);
create index tenants_industry_idx on public.tenants(industry_id);

alter table public.industries enable row level security;
create policy industries_catalog_select on public.industries
  for select to authenticated
  using (is_active or private.is_platform_admin());
create policy industries_platform_manage on public.industries
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());
create policy workflow_templates_platform_manage on public.workflow_templates
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

grant select, insert, update, delete on public.industries to authenticated;

insert into public.industries (industry_key, name, description) values
  ('general', 'General', 'Cross-industry business operations'),
  ('construction', 'Construction', 'Contracting, projects, sites, and commercial operations'),
  ('trading_distribution', 'Trading & Distribution', 'Purchasing, inventory, suppliers, and distribution'),
  ('retail', 'Retail', 'Store, stock, sales, and customer operations'),
  ('manufacturing', 'Manufacturing', 'Production, maintenance, and quality operations'),
  ('professional_services', 'Professional Services', 'Client delivery and internal service operations'),
  ('healthcare', 'Healthcare', 'Patient and healthcare administration'),
  ('hospitality', 'Hospitality', 'Guest, property, and hospitality operations'),
  ('logistics', 'Logistics', 'Fleet, delivery, and warehouse operations'),
  ('real_estate', 'Real Estate', 'Property, tenant, and facilities operations'),
  ('education', 'Education', 'Academic and education administration'),
  ('other', 'Other', 'Industries not listed above')
on conflict (industry_key) do update set name = excluded.name, description = excluded.description, is_active = true;

with catalog(template_key, name, category, industry_keys, stages, difficulty, featured) as (values
  ('purchase_approval', 'Purchase approval', 'Finance', array['general'], 3, 'standard', true),
  ('expense_reimbursement', 'Expense reimbursement', 'Finance', array['general'], 4, 'standard', true),
  ('payment_approval', 'Payment approval', 'Finance', array['general'], 3, 'standard', false),
  ('petty_cash_request', 'Petty cash request', 'Finance', array['general'], 3, 'simple', false),
  ('leave_request', 'Leave request', 'People', array['general'], 3, 'simple', true),
  ('employee_onboarding', 'Employee onboarding', 'People', array['general'], 5, 'advanced', true),
  ('document_approval', 'Document approval', 'Operations', array['general'], 3, 'simple', false),
  ('asset_request', 'Asset request', 'Operations', array['general'], 3, 'simple', false),
  ('material_request', 'Material request', 'Site operations', array['construction'], 4, 'standard', true),
  ('site_inspection', 'Site inspection', 'Quality', array['construction'], 4, 'standard', true),
  ('variation_order', 'Variation order', 'Commercial', array['construction'], 5, 'advanced', true),
  ('subcontractor_approval', 'Subcontractor approval', 'Procurement', array['construction'], 4, 'standard', false),
  ('purchase_order', 'Purchase order', 'Procurement', array['trading_distribution'], 4, 'standard', true),
  ('stock_reorder', 'Stock reorder', 'Inventory', array['trading_distribution'], 3, 'simple', true),
  ('supplier_onboarding', 'Supplier onboarding', 'Operations', array['trading_distribution'], 4, 'standard', true),
  ('delivery_confirmation', 'Delivery confirmation', 'Logistics', array['trading_distribution'], 3, 'simple', false),
  ('stock_transfer', 'Stock transfer', 'Inventory', array['retail'], 3, 'simple', false),
  ('refund_approval', 'Refund approval', 'Finance', array['retail'], 3, 'standard', false),
  ('store_opening_checklist', 'Store opening checklist', 'Operations', array['retail'], 5, 'standard', false),
  ('quality_inspection', 'Quality inspection', 'Quality', array['manufacturing'], 4, 'standard', true),
  ('maintenance_request', 'Maintenance request', 'Maintenance', array['manufacturing'], 4, 'standard', false),
  ('production_change', 'Production change', 'Operations', array['manufacturing'], 5, 'advanced', false),
  ('vehicle_maintenance', 'Vehicle maintenance', 'Fleet', array['logistics'], 4, 'standard', false),
  ('delivery_exception', 'Delivery exception', 'Logistics', array['logistics'], 3, 'standard', false),
  ('tenant_onboarding', 'Tenant onboarding', 'Operations', array['real_estate'], 5, 'advanced', false),
  ('property_maintenance', 'Property maintenance', 'Maintenance', array['real_estate'], 4, 'standard', false),
  ('guest_complaint', 'Guest complaint', 'Service', array['hospitality'], 4, 'standard', false),
  ('hospitality_procurement', 'Hospitality procurement', 'Procurement', array['hospitality'], 4, 'standard', false),
  ('patient_intake_review', 'Patient intake review', 'Operations', array['healthcare'], 4, 'advanced', false),
  ('course_approval', 'Course approval', 'Academic', array['education'], 4, 'standard', false)
)
insert into public.workflow_templates (
  owner_scope, template_key, name, description, category, industry_keys, tags,
  definition, difficulty, estimated_setup_minutes, is_featured, is_published
)
select 'system', template_key, name, 'Prebuilt WorkGrid workflow. Copy it to a client workspace and edit roles, forms, rules, and Google Sheet mappings.',
  category, industry_keys, array[lower(replace(category, ' ', '_'))],
  jsonb_build_object(
    'trigger', 'form_submission',
    'stages', (select jsonb_agg(jsonb_build_object('key', 'stage_' || n, 'name', 'Stage ' || n, 'order', n)) from generate_series(1, stages) n),
    'integrations', jsonb_build_object('google_sheets', true, 'google_drive', true),
    'completion', jsonb_build_object('generate_pdf', true)
  ), difficulty, case difficulty when 'simple' then 10 when 'advanced' then 30 else 20 end, featured, true
from catalog
on conflict (template_key) where owner_scope = 'system' and template_key is not null do update set
  name = excluded.name, category = excluded.category, industry_keys = excluded.industry_keys,
  definition = excluded.definition, difficulty = excluded.difficulty,
  estimated_setup_minutes = excluded.estimated_setup_minutes, is_featured = excluded.is_featured, is_published = true;

insert into public.platform_plans (plan_key, name, currency, monthly_price, staff_limit, active_workflow_limit, configuration)
values
  ('basic', 'Basic', 'AED', null, 5, 5, '{"google_drive":"personal_or_workspace","template_library":true}'::jsonb),
  ('starter', 'Starter', 'AED', 49, 10, 10, '{"google_drive":"personal_or_workspace","google_sheets_sync":true,"template_library":true}'::jsonb),
  ('business', 'Business', 'AED', null, 20, 20, '{"google_drive":"personal_or_workspace","google_sheets_sync":true,"template_library":true,"client_ai_workflows":true}'::jsonb)
on conflict (plan_key) do update set
  name = excluded.name, currency = excluded.currency, monthly_price = excluded.monthly_price,
  staff_limit = excluded.staff_limit, active_workflow_limit = excluded.active_workflow_limit,
  configuration = excluded.configuration, status = 'active', updated_at = now();
