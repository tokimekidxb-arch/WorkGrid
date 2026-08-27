import { Readable } from "node:stream";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGoogleOAuthClient } from "@/lib/google/oauth";
import { buildWorkflowReport } from "@/lib/reports/workflow-report";
import { decryptToken } from "@/lib/security/tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({ tenantId: z.uuid(), instanceId: z.uuid() });

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid report request." }, { status: 400 });

  const userClient = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const oauth = createGoogleOAuthClient();
  if (!userClient || !admin || !oauth) return NextResponse.json({ error: "Server integrations are not configured." }, { status: 503 });

  const { data: claims } = await userClient.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { tenantId, instanceId } = parsed.data;
  const { data: membership } = await admin.from("tenant_members").select("role").eq("tenant_id", tenantId).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (!membership) return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });

  const { data: instance } = await admin.from("workflow_instances").select("id,tenant_id,reference_number,status,data,started_at,closed_at,workflow_definitions(name),workflow_tasks(stage_key,status,decision,comment,completed_at),tenants(name)").eq("id", instanceId).eq("tenant_id", tenantId).maybeSingle();
  if (!instance) return NextResponse.json({ error: "Workflow instance not found." }, { status: 404 });
  if (instance.status !== "completed" && instance.status !== "rejected") return NextResponse.json({ error: "Only closed workflows can generate final reports." }, { status: 409 });

  const workflow = Array.isArray(instance.workflow_definitions) ? instance.workflow_definitions[0] : instance.workflow_definitions;
  const tenant = Array.isArray(instance.tenants) ? instance.tenants[0] : instance.tenants;
  const fileName = `${instance.reference_number}-Final.pdf`;
  const { data: existing } = await admin.from("reports").select("id,google_drive_file_id,status").eq("workflow_instance_id", instanceId).eq("report_type", "workflow_close").maybeSingle();
  if (existing?.status === "completed" && existing.google_drive_file_id) return NextResponse.json({ reportId: existing.id, fileId: existing.google_drive_file_id, reused: true });

  const { data: report, error: reportError } = await admin.from("reports").upsert({ tenant_id: tenantId, workflow_instance_id: instanceId, report_type: "workflow_close", file_name: fileName, status: "running", error_message: null }, { onConflict: "workflow_instance_id,report_type" }).select("id").single();
  if (reportError || !report) return NextResponse.json({ error: "Could not queue report." }, { status: 500 });

  try {
    const { data: connection } = await admin.from("google_connections").select("encrypted_refresh_token").eq("tenant_id", tenantId).eq("status", "active").limit(1).maybeSingle();
    const { data: folder } = await admin.from("google_resources").select("google_id").eq("tenant_id", tenantId).eq("resource_type", "drive_folder").eq("logical_name", "reports").eq("status", "active").maybeSingle();
    if (!connection || !folder) throw new Error("Google Drive Reports folder is not connected.");

    const pdf = buildWorkflowReport({
      companyName: tenant?.name ?? "Company",
      workflowName: workflow?.name ?? "Workflow",
      referenceNumber: instance.reference_number,
      status: instance.status,
      startedAt: instance.started_at,
      closedAt: instance.closed_at,
      data: (instance.data ?? {}) as Record<string, unknown>,
      tasks: instance.workflow_tasks ?? [],
    });
    oauth.setCredentials({ refresh_token: decryptToken(connection.encrypted_refresh_token) });
    const drive = google.drive({ version: "v3", auth: oauth });
    const uploaded = await drive.files.create({ requestBody: { name: fileName, parents: [folder.google_id], mimeType: "application/pdf" }, media: { mimeType: "application/pdf", body: Readable.from(pdf) }, fields: "id" });
    if (!uploaded.data.id) throw new Error("Google Drive did not return a report file ID.");

    await admin.from("reports").update({ status: "completed", google_drive_file_id: uploaded.data.id, generated_at: new Date().toISOString() }).eq("id", report.id);
    return NextResponse.json({ reportId: report.id, fileId: uploaded.data.id, reused: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed.";
    await admin.from("reports").update({ status: "failed", error_message: message }).eq("id", report.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
