import "server-only";

import { readFile } from "node:fs/promises";
import { google } from "googleapis";

type ServiceAccountCredential = {
  type: "service_account";
  project_id: string;
  client_email: string;
  private_key: string;
};

const SERVICE_ACCOUNT_SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets"];

function parseCredential(raw: string): ServiceAccountCredential {
  const credential = JSON.parse(raw) as Partial<ServiceAccountCredential>;
  if (credential.type !== "service_account" || !credential.project_id || !credential.client_email || !credential.private_key) throw new Error("The Google service-account credential is incomplete.");
  return credential as ServiceAccountCredential;
}

export async function createGoogleServiceAccountAuth() {
  const inlineCredential = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const credentialPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!inlineCredential && !credentialPath) return null;
  const raw = inlineCredential ? Buffer.from(inlineCredential, "base64").toString("utf8") : await readFile(credentialPath!, "utf8");
  const credential = parseCredential(raw);
  return {
    auth: new google.auth.GoogleAuth({ credentials: credential, scopes: SERVICE_ACCOUNT_SCOPES }),
    clientEmail: credential.client_email,
    projectId: credential.project_id,
  };
}
