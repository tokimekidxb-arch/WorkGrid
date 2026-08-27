import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    services: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      tokenEncryption: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
    },
  });
}
