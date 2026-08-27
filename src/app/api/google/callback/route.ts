import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { bootstrapGoogleWorkspace } from "@/lib/google/bootstrap";
import { createGoogleOAuthClient } from "@/lib/google/oauth";
import { encryptToken } from "@/lib/security/tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const expectedState = request.cookies.get("workgrid_google_state")?.value;
  const tenantId = request.cookies.get("workgrid_google_tenant")?.value;
  const oauth = createGoogleOAuthClient();
  const userClient = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const redirect = (status: string) => NextResponse.redirect(new URL(`/?google=${status}`, request.url));

  if (!state || !code || state !== expectedState || !tenantId || !oauth || !userClient || !admin) return redirect("connection_failed");
  const { data: authData } = await userClient.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return redirect("sign_in_required");

  const { data: membership } = await admin.from("tenant_members").select("tenant_id").eq("tenant_id", tenantId).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (!membership) return redirect("access_denied");

  try {
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) return redirect("refresh_token_missing");
    oauth.setCredentials(tokens);
    const userInfo = await google.oauth2({ version: "v2", auth: oauth }).userinfo.get();
    const accountId = userInfo.data.id;
    const email = userInfo.data.email;
    if (!accountId || !email) return redirect("profile_missing");

    const { data: tenant } = await admin.from("tenants").select("name").eq("id", tenantId).single();
    if (!tenant) return redirect("workspace_missing");

    const { data: connection, error: connectionError } = await admin.from("google_connections").upsert({
      tenant_id: tenantId,
      connected_by: userId,
      google_account_id: accountId,
      google_email: email,
      account_type: email.endsWith("@gmail.com") ? "personal" : "workspace",
      scopes: tokens.scope?.split(" ") ?? [],
      encrypted_refresh_token: encryptToken(tokens.refresh_token),
      access_token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      status: "active",
    }, { onConflict: "tenant_id,google_account_id" }).select("id").single();
    if (connectionError || !connection) throw connectionError ?? new Error("Could not save Google connection.");

    const resources = await bootstrapGoogleWorkspace(oauth, tenant.name);
    const { error: resourceError } = await admin.from("google_resources").upsert(resources.map((resource) => ({ ...resource, tenant_id: tenantId, connection_id: connection.id, status: "active" })), { onConflict: "tenant_id,google_id" });
    if (resourceError) throw resourceError;

    const response = redirect("connected");
    response.cookies.delete("workgrid_google_state");
    response.cookies.delete("workgrid_google_tenant");
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed", error instanceof Error ? error.message : "Unknown error");
    return redirect("connection_failed");
  }
}
