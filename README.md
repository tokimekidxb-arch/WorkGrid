# WorkGrid

WorkGrid is a multi-tenant operations app that keeps identity, permissions, configuration, and workflow state in Supabase while storing client-owned documents and operational records in Google Drive and Google Sheets.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first screen is the WorkGrid main-account login. Client login and signup are linked from that page. The configured client is TEST LTD in the Education industry; no sample business records are included.

## Configure Supabase

1. Create a Supabase project.
2. Copy the project URL, publishable key, and server secret key into `.env.local`.
3. Apply `supabase/migrations/20260827091710_initial_workgrid_schema.sql` through the Supabase CLI or SQL editor.
4. Configure `http://localhost:3000` as an allowed authentication URL.

Every exposed application table has row-level security. Tenant access is checked through active membership records; authorization never depends on editable user metadata.

## Configure Google

1. Create an OAuth web application in Google Cloud Console.
2. Enable Google Drive API and Google Sheets API.
3. Add `http://localhost:3000/api/google/callback` as an authorized redirect URI.
4. Add the client ID and client secret to `.env.local`.
5. Generate a 32-byte token encryption key and add it as 64 hexadecimal characters.

The OAuth flow requests app-file Drive access and spreadsheet access. On connection, WorkGrid creates the company folder structure, a company workbook, `_Config`, and `_SyncLog`. Personal Gmail and Google Workspace accounts are both supported.

## Application areas

- Main WorkGrid account for managing clients, features, the workflow library, and AI workflow creation
- Main-account setup checklist, administrator team roles, and security separation
- Client onboarding with owner invitation, initial plan, region, and feature selection
- Client plans, staff/workflow limits, and feature entitlements
- Privacy-safe support sessions and platform audit history
- TEST LTD client workspace with five role-based staff seats and five active General workflows
- Linked TEST LTD Google Drive folder with Google OAuth and Sheets setup still required
- Separate client login and client signup pages
- Private client portal for staff, Forms, Workflows, Records, Reports, and company settings
- Client-owned Google Drive and Google Sheets connection inside each company workspace
- Workflow provenance for manual, template, AI-assisted, and AI-generated processes

## Internal application services

- Supabase is application infrastructure and is never presented as a client-facing integration
- Supabase schema for tenancy, forms, workflows, tasks, events, sync jobs, Google resources, and reports
- Platform-admin separation and tenant-scoped RLS policies
- Internal plan, subscription, support-session, and immutable audit-event structures
- Google OAuth with encrypted server-side refresh-token storage
- Drive folder and company Sheet bootstrap
- Idempotent workflow-close PDF generation and Drive upload route
- Health endpoint at `/api/health`

## Verification

```bash
npm run lint
npm run build
```

Local Supabase database testing additionally requires Docker Desktop. The web application itself does not require Docker.
