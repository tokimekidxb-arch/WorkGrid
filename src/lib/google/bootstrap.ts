import { google, type Auth } from "googleapis";

type GoogleAuth = Auth.OAuth2Client | Auth.GoogleAuth;

type Resource = {
  resource_type: "drive_folder" | "spreadsheet" | "sheet_tab";
  logical_name: string;
  google_id: string;
  parent_google_id?: string;
  metadata?: Record<string, unknown>;
};

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findFile(drive: ReturnType<typeof google.drive>, name: string, parentId: string, mimeType: string) {
  const response = await drive.files.list({
    q: `'${escapeDriveQuery(parentId)}' in parents and name = '${escapeDriveQuery(name)}' and mimeType = '${mimeType}' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 1,
  });
  return response.data.files?.[0]?.id ?? null;
}

async function createFolder(drive: ReturnType<typeof google.drive>, name: string, parentId?: string) {
  const response = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : undefined },
    fields: "id,name",
  });
  if (!response.data.id) throw new Error(`Google did not return an ID for ${name}.`);
  return response.data.id;
}

async function findOrCreateFolder(drive: ReturnType<typeof google.drive>, name: string, parentId: string) {
  return await findFile(drive, name, parentId, "application/vnd.google-apps.folder") ?? await createFolder(drive, name, parentId);
}

export async function bootstrapGoogleWorkspace(auth: GoogleAuth, companyName: string, existingCompanyFolderId?: string) {
  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });
  const resources: Resource[] = [];

  let companyId = existingCompanyFolderId;
  if (!companyId) {
    const rootId = await createFolder(drive, "WorkGrid");
    resources.push({ resource_type: "drive_folder", logical_name: "root", google_id: rootId });
    companyId = await createFolder(drive, companyName, rootId);
    resources.push({ resource_type: "drive_folder", logical_name: "company", google_id: companyId, parent_google_id: rootId });
  } else {
    const folder = await drive.files.get({ fileId: companyId, fields: "id,name,mimeType,capabilities(canAddChildren)" });
    if (folder.data.mimeType !== "application/vnd.google-apps.folder" || !folder.data.capabilities?.canAddChildren) throw new Error("The service account cannot write to the selected company folder.");
    resources.push({ resource_type: "drive_folder", logical_name: "company", google_id: companyId, metadata: { name: folder.data.name } });
  }

  for (const name of ["Forms", "Workflows", "Reports"] as const) {
    const id = await findOrCreateFolder(drive, name, companyId);
    resources.push({ resource_type: "drive_folder", logical_name: name.toLowerCase(), google_id: id, parent_google_id: companyId });
  }

  const spreadsheetName = `${companyName} - WorkGrid Data`;
  let spreadsheetId = await findFile(drive, spreadsheetName, companyId, "application/vnd.google-apps.spreadsheet");
  if (!spreadsheetId) {
    const spreadsheetFile = await drive.files.create({ requestBody: { name: spreadsheetName, mimeType: "application/vnd.google-apps.spreadsheet", parents: [companyId] }, fields: "id" });
    spreadsheetId = spreadsheetFile.data.id ?? null;
  }
  if (!spreadsheetId) throw new Error("Google did not return a spreadsheet ID.");
  let spreadsheet = await sheets.spreadsheets.get({ spreadsheetId, fields: "spreadsheetId,sheets.properties" });
  const existingTitles = new Set((spreadsheet.data.sheets ?? []).map((sheet) => sheet.properties?.title).filter(Boolean));
  const requests: Array<Record<string, unknown>> = [];
  if (!existingTitles.has("_Config")) {
    const firstSheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId;
    if (firstSheetId !== undefined) requests.push({ updateSheetProperties: { properties: { sheetId: firstSheetId, title: "_Config" }, fields: "title" } });
  }
  if (!existingTitles.has("_SyncLog")) requests.push({ addSheet: { properties: { title: "_SyncLog" } } });
  if (requests.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  spreadsheet = await sheets.spreadsheets.get({ spreadsheetId, fields: "spreadsheetId,sheets.properties" });
  resources.push({ resource_type: "spreadsheet", logical_name: "company_data", google_id: spreadsheetId, parent_google_id: companyId });

  for (const sheet of spreadsheet.data.sheets ?? []) {
    const title = sheet.properties?.title;
    const sheetId = sheet.properties?.sheetId;
    if (title && sheetId !== undefined) resources.push({ resource_type: "sheet_tab", logical_name: title, google_id: `${spreadsheetId}:${sheetId}`, parent_google_id: spreadsheetId, metadata: { title, sheetId } });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "_Config!A1:B4",
    valueInputOption: "RAW",
    requestBody: { values: [["key", "value"], ["schema_version", "1"], ["managed_by", "WorkGrid"], ["company_name", companyName]] },
  });

  return resources;
}
