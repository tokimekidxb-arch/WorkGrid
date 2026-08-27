create table public.platform_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique check (plan_key ~ '^[a-z0-9_]+$'),
  name text not null,
  status text not null default 'active' check (status in ('active', 'hidden', 'retired')),
  currency text,
  monthly_price numeric(12, 2),
  staff_limit integer check (staff_limit is null or staff_limit > 0),
  active_workflow_limit integer check (active_workflow_limit is null or active_workflow_limit > 0),
  storage_policy text not null default 'client_google_drive',
  configuration jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_subscriptions (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.platform_plans(id),
  status text not null default 'active' check (status in ('trial', 'active', 'past_due', 'suspended', 'cancelled')),
  starts_at timestamptz not null default now(),
  renews_at timestamptz,
  ends_at timestamptz,
  limit_overrides jsonb not null default '{}',
  assigned_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  tenant_id uuid references public.tenants(id) on delete set null,
  event_type text not null,
  target_type text not null,
  target_id text,
  summary text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.client_support_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform_admin_id uuid not null references public.platform_admins(user_id),
  reason text not null,
  permission_scope text[] not null default array['configuration', 'connection_health', 'sync_errors'],
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'revoked')),
  approved_by_client uuid references auth.users(id),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create index platform_audit_created_idx on public.platform_audit_events(created_at desc);
create index platform_audit_tenant_idx on public.platform_audit_events(tenant_id, created_at desc);
create index client_support_tenant_idx on public.client_support_sessions(tenant_id, status, created_at desc);

alter table public.platform_plans enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.platform_audit_events enable row level security;
alter table public.client_support_sessions enable row level security;

create policy platform_plans_admin_manage on public.platform_plans
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy tenant_subscriptions_platform_manage on public.tenant_subscriptions
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy tenant_subscriptions_client_select on public.tenant_subscriptions
  for select to authenticated
  using (private.is_tenant_member(tenant_id));

create policy platform_audit_admin_select on public.platform_audit_events
  for select to authenticated
  using (private.is_platform_admin());

create policy platform_audit_admin_insert on public.platform_audit_events
  for insert to authenticated
  with check (private.is_platform_admin() and actor_id = (select auth.uid()));

create policy client_support_platform_manage on public.client_support_sessions
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin() and platform_admin_id = (select auth.uid()));

create policy client_support_tenant_select on public.client_support_sessions
  for select to authenticated
  using (private.is_tenant_member(tenant_id));

grant select, insert, update, delete on public.platform_plans, public.tenant_subscriptions,
  public.platform_audit_events, public.client_support_sessions to authenticated;
