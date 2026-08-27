import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    services: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      googleServiceAccount: Boolean((process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_SERVICE_ACCOUNT_JSON) && process.env.GOOGLE_SERVICE_ACCOUNT_FOLDER_ID),
      tokenEncryption: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
    },
  });
}
