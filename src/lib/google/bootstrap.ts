import { google, type Auth } from "googleapis";

type Resource = {
  resource_type: "drive_folder" | "spreadsheet" | "sheet_tab";
  logical_name: string;
  google_id: string;
  parent_google_id?: string;
  metadata?: Record<string, unknown>;
};

async function createFolder(drive: ReturnType<typeof google.drive>, name: string, parentId?: string) {
  const response = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : undefined },
    fields: "id,name",
  });
  if (!response.data.id) throw new Error(`Google did not return an ID for ${name}.`);
  return response.data.id;
}

export async function bootstrapGoogleWorkspace(auth: Auth.OAuth2Client, companyName: string) {
  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });
  const resources: Resource[] = [];

  const rootId = await createFolder(drive, "WorkGrid");
  resources.push({ resource_type: "drive_folder", logical_name: "root", google_id: rootId });
  const companyId = await createFolder(drive, companyName, rootId);
  resources.push({ resource_type: "drive_folder", logical_name: "company", google_id: companyId, parent_google_id: rootId });

  for (const name of ["Forms", "Workflows", "Reports"] as const) {
    const id = await createFolder(drive, name, companyId);
    resources.push({ resource_type: "drive_folder", logical_name: name.toLowerCase(), google_id: id, parent_google_id: companyId });
  }

  const spreadsheetFile = await drive.files.create({
    requestBody: {
      name: `${companyName} - WorkGrid Data`,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [companyId],
    },
    fields: "id",
  });
  const spreadsheetId = spreadsheetFile.data.id;
  if (!spreadsheetId) throw new Error("Google did not return a spreadsheet ID.");
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { updateSheetProperties: { properties: { sheetId: 0, title: "_Config" }, fields: "title" } },
        { addSheet: { properties: { title: "_SyncLog" } } },
      ],
    },
  });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId, fields: "spreadsheetId,sheets.properties" });
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
