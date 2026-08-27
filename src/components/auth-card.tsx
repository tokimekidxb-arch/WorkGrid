"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Brand } from "@/components/brand";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthCardProps = {
  kind: "admin" | "client" | "signup";
};

export function AuthCard({ kind }: AuthCardProps) {
  const router = useRouter();
  const admin = kind === "admin";
  const signup = kind === "signup";
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const workspace = String(form.get("workspace") ?? "").trim().toLowerCase();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage("Supabase is not configured."); setLoading(false); return; }
    if (signup) {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: String(form.get("name") ?? "") } } });
      if (error) { setMessage(error.message); setLoading(false); return; }
      setMessage("Account created. Confirm your email if requested, then sign in.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMessage("Email or password is incorrect."); setLoading(false); return; }
    if (admin) {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: access } = await supabase.from("platform_admins").select("role").eq("user_id", user?.id ?? "").eq("status", "active").maybeSingle();
      if (!access) { await supabase.auth.signOut(); setMessage("This account does not have main-account access."); setLoading(false); return; }
    } else {
      const { data: tenant, error: tenantError } = await supabase.from("tenants").select("id").eq("slug", workspace).maybeSingle();
      if (tenantError || !tenant) { await supabase.auth.signOut(); setMessage("This account does not have access to that company workspace."); setLoading(false); return; }
    }
    router.push(admin ? "/admin" : "/client");
    router.refresh();
  };
  return <main className="auth-page">
    <div className="auth-top"><Brand />{!admin && <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to main login</Link>}</div>
    <section className="auth-card">
      <div className={`auth-symbol ${admin ? "admin" : "client"}`}>{admin ? "WG" : signup ? "+" : "CO"}</div>
      <p className="mini-label">{admin ? "WORKGRID CONTROL CENTER" : signup ? "CREATE CLIENT WORKSPACE" : "CLIENT PORTAL"}</p>
      <h1>{admin ? "Main account login" : signup ? "Create your company account" : "Welcome back"}</h1>
      <p>{admin ? "For WorkGrid owners and platform administrators." : signup ? "Set up a secure workspace for your company." : "Sign in to your company’s WorkGrid workspace."}</p>
      <form onSubmit={submit} className="auth-form">
        {!admin && <label>Company workspace<input name="workspace" placeholder="e.g. test-ltd" defaultValue={signup ? "" : "test-ltd"} required /></label>}
        {signup && <label>Company name<input name="company" placeholder="Your company name" required /></label>}
        <label>Work email<input name="email" type="email" placeholder={admin ? "tokimekidxb@gmail.com" : "you@company.com"} required /></label>
        <label>Password<input name="password" type="password" placeholder="At least 8 characters" minLength={8} required /></label>
        {signup && <label>Your full name<input name="name" placeholder="Full name" required /></label>}
        <div className="auth-options"><label className="check-line"><input type="checkbox" /> Remember me</label>{!signup && <button type="button">Forgot password?</button>}</div>
        {message && <p className={`auth-message ${message.startsWith("Account created") ? "success" : ""}`}>{message}</p>}
        <button type="submit" className="primary-action" disabled={loading}>{loading ? "Please wait…" : signup ? "Create workspace" : "Sign in"}<ArrowRight size={17} /></button>
      </form>
      {admin ? <div className="client-entry-links"><span>Are you a WorkGrid client?</span><Link href="/client/login">Client login</Link><i /> <Link href="/client/signup">Create client account</Link></div> : <p className="auth-switch">{signup ? "Already have an account?" : "New to WorkGrid?"} <Link href={signup ? "/client/login" : "/client/signup"}>{signup ? "Sign in" : "Create a client account"}</Link></p>}
      <div className="secure-login"><LockKeyhole size={14} /> Secure account access</div>
    </section>
  </main>;
}
