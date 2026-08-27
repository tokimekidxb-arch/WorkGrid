import { google } from "googleapis";
import { NextResponse } from "next/server";
import { createGoogleServiceAccountAuth } from "@/lib/google/service-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type JsonValues = Record<string, string | number | boolean | null | undefined>;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildDetails(workflowName: string, values: JsonValues, data: JsonValues) {
  if (values.details) return String(values.details);
  if (workflowName === "Leave request") return `${values.start_date ?? ""} to ${values.end_date ?? ""} · ${data.department ?? ""}`.trim();
  if (workflowName === "Document approval") return `${values.document_type ?? "Document"} version ${values.version ?? ""} · ${values.department ?? ""}`.trim();
  if (workflowName === "Expense reimbursement") return `${values.currency ?? data.currency ?? ""} ${values.amount ?? data.amount ?? ""} · ${values.department ?? values.category ?? ""}`.trim();
  return Object.entries(values).filter(([key, value]) => key !== "request_title" && value != null).map(([key, value]) => `${titleCase(key)}: ${value}`).join(" · ");
}

function quoteSheetName(name: string) {
  return `'${name.replaceAll("'", "''")}'`;
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const serviceAccount = await createGoogleServiceAccountAuth();
  if (!supabase || !serviceAccount) return NextResponse.json({ error: "Google or Supabase server configuration is missing." }, { status: 503 });

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", "test-ltd").single();
  if (!tenant) return NextResponse.json({ error: "TEST LTD was not found." }, { status: 404 });

  const { data: membership } = await supabase.from("tenant_members").select("tenant_id").eq("tenant_id", tenant.id).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (!membership) return NextResponse.json({ error: "You do not have access to TEST LTD." }, { status: 403 });

  const [{ data: connections }, { data: definitions }, { data: instances }] = await Promise.all([
    supabase.from("google_sheet_connections").select("id,workflow_definition_id,spreadsheet_id,sheet_name").eq("tenant_id", tenant.id).eq("status", "active"),
    supabase.from("workflow_definitions").select("id,name").eq("tenant_id", tenant.id),
    supabase.from("workflow_instances").select("id,workflow_definition_id,source_form_submission_id,reference_number,status,data,started_at").eq("tenant_id", tenant.id),
  ]);
  if (!connections?.length || !definitions?.length || !instances?.length) return NextResponse.json({ error: "No connected workflow records were found." }, { status: 409 });

  const instanceIds = instances.map((instance) => instance.id);
  const submissionIds = instances.map((instance) => instance.source_form_submission_id).filter((id): id is string => Boolean(id));
  const [{ data: submissions }, { data: tasks }, { data: reports }] = await Promise.all([
    submissionIds.length ? supabase.from("form_submissions").select("id,values").in("id", submissionIds) : Promise.resolve({ data: [] }),
    supabase.from("workflow_tasks").select("workflow_instance_id,assigned_role,status,created_at").in("workflow_instance_id", instanceIds).order("created_at"),
    supabase.from("reports").select("workflow_instance_id,google_drive_file_id,file_name,created_at").in("workflow_instance_id", instanceIds).order("created_at", { ascending: false }),
  ]);

  const definitionNames = new Map(definitions.map((definition) => [definition.id, definition.name]));
  const submissionValues = new Map((submissions ?? []).map((submission) => [submission.id, submission.values as JsonValues]));
  const pendingRoles = new Map((tasks ?? []).filter((task) => task.status === "pending").map((task) => [task.workflow_instance_id, String(task.assigned_role)]));
  const reportFiles = new Map((reports ?? []).map((report) => [report.workflow_instance_id, report.file_name ?? report.google_drive_file_id ?? ""]));
  const sheets = google.sheets({ version: "v4", auth: serviceAccount.auth });
  let synced = 0;

  for (const connection of connections) {
    const workflowName = definitionNames.get(connection.workflow_definition_id ?? "");
    if (!workflowName) continue;
    const connectedInstances = instances.filter((instance) => instance.workflow_definition_id === connection.workflow_definition_id);
    const rangeName = quoteSheetName(connection.sheet_name);
    const referenceResponse = await sheets.spreadsheets.values.get({ spreadsheetId: connection.spreadsheet_id, range: `${rangeName}!A2:A` });
    const references = (referenceResponse.data.values ?? []).map((row) => String(row[0] ?? ""));

    for (const instance of connectedInstances) {
      const values = submissionValues.get(instance.source_form_submission_id ?? "") ?? {};
      const status = titleCase(String(instance.status));
      const row = [
        instance.reference_number,
        String(values.request_title ?? workflowName),
        buildDetails(workflowName, values, (instance.data ?? {}) as JsonValues),
        status,
        pendingRoles.has(instance.id) ? titleCase(pendingRoles.get(instance.id)!) : status,
        instance.started_at,
        reportFiles.get(instance.id) ?? "",
      ];
      const existingIndex = references.indexOf(instance.reference_number);
      if (existingIndex >= 0) {
        await sheets.spreadsheets.values.update({ spreadsheetId: connection.spreadsheet_id, range: `${rangeName}!A${existingIndex + 2}:G${existingIndex + 2}`, valueInputOption: "USER_ENTERED", requestBody: { values: [row] } });
      } else {
        await sheets.spreadsheets.values.append({ spreadsheetId: connection.spreadsheet_id, range: `${rangeName}!A:G`, valueInputOption: "USER_ENTERED", insertDataOption: "INSERT_ROWS", requestBody: { values: [row] } });
      }
      synced += 1;
    }
  }

  await supabase.from("google_sheet_connections").update({ last_synced_at: new Date().toISOString() }).eq("tenant_id", tenant.id).eq("status", "active");
  return NextResponse.json({ ok: true, synced });
}
