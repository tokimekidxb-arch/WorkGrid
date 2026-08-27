alter table public.client_drive_links
  add column if not exists auth_mode text not null default 'oauth'
    check (auth_mode in ('oauth', 'service_account')),
  add column if not exists service_account_email text,
  add column if not exists last_verified_at timestamptz;

alter table public.google_connections
  add column if not exists auth_mode text not null default 'oauth'
    check (auth_mode in ('oauth', 'service_account')),
  alter column encrypted_refresh_token drop not null;

comment on column public.client_drive_links.service_account_email is
  'Non-secret service account identity. Private credentials remain server-side and are never stored in Supabase.';

comment on column public.google_connections.auth_mode is
  'Authentication mechanism. Service-account private credentials remain server-side and are never stored here.';

update public.client_drive_links
set auth_mode = 'service_account',
    service_account_email = 'testltd@workgrid-506811.iam.gserviceaccount.com',
    connection_status = 'connected',
    last_verified_at = now(),
    updated_at = now()
where tenant_id = (select id from public.tenants where slug = 'test-ltd')
  and google_folder_id = '1S_dCzrDgLtOVmCkQXFMXEHtS2i21PTy_';
