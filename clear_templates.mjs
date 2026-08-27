import { createClient } from "@supabase/supabase-js";

const url = "https://hzfggleytgmnwtlgmzpv.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6ZmdnbGV5dGdtbnd0bGdtenB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MjMzNjAsImV4cCI6MjEwMzM5OTM2MH0.bXhpqAKARTPsIUW82Z_FBg1I7_dAIKgsrsN1yE6cP1Q";

const supabase = createClient(url, key);

async function clearTemplates() {
  // Try to delete without auth if RLS allows
  const { data, error } = await supabase.from("workflow_templates").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Delete result:", error ? error : "Success, deleted rows.");
}

clearTemplates();
