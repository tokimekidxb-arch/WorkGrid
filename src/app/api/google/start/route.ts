import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_SCOPES, createGoogleOAuthClient } from "@/lib/google/oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const oauth = createGoogleOAuthClient();
  const supabase = await createSupabaseServerClient();
  const tenantId = request.nextUrl.searchParams.get("tenantId");
  if (!oauth || !supabase) return NextResponse.redirect(new URL("/?setup=missing_credentials", request.url));

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return NextResponse.redirect(new URL("/?setup=sign_in_required", request.url));
  if (!tenantId) return NextResponse.redirect(new URL("/?setup=create_workspace_first", request.url));

  const { data: membership } = await supabase.from("tenant_members").select("tenant_id").eq("tenant_id", tenantId).eq("user_id", data.claims.sub).eq("status", "active").maybeSingle();
  if (!membership) return NextResponse.redirect(new URL("/?setup=tenant_access_denied", request.url));

  const state = randomUUID();
  const response = NextResponse.redirect(oauth.generateAuthUrl({ access_type: "offline", prompt: "consent", include_granted_scopes: true, scope: GOOGLE_SCOPES, state }));
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  response.cookies.set("workgrid_google_state", state, options);
  response.cookies.set("workgrid_google_tenant", tenantId, options);
  return response;
}
