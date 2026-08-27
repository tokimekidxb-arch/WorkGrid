"use client";

import Link from "next/link";
import {
  Activity, ArrowDown, ArrowRight, BadgeDollarSign, Bell, Blocks, Bot, Building2, Check, ChevronDown, CirclePlus,
  FileInput, FileText, FolderOpen, GitBranch, Headphones, KeyRound, LayoutDashboard, Library, LockKeyhole, Menu, MoreHorizontal, Plus,
  ScrollText, Search, Settings, ShieldCheck, Sparkles, UserCog, Users, WandSparkles, Workflow, X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import { Brand } from "@/components/brand";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { WorkflowEditor } from "./workflow-editor";

type AdminView = "overview" | "clients" | "studio" | "features" | "templates" | "team" | "plans" | "audit" | "support" | "settings";
type ClientRecord = typeof clients[number];

const clients = [
  { id: "TLT", name: "TEST LTD", industry: "Education", workspace: "test-ltd", staff: 5, workflows: 5, aiWorkflows: 0, forms: 5, drive: "Folder linked", status: "Active", plan: "Basic", color: "blue" },
];

type TemplateItem = readonly [name: string, category: string, industry: string, stages: number, template_key: string, definition?: any];

const workflowTemplates: TemplateItem[] = [];

const staff = {
  TLT: [["Workspace owner", "Owner", "tokimekidxb@gmail.com"], ["Education manager", "Manager", "Available seat · Manager"], ["Finance approver", "Manager", "Available seat · Finance"], ["Workflow administrator", "Admin", "Available seat · Admin"], ["Staff requester", "Member", "Available seat · Member"]],
};

const companyWorkflows = {
  TLT: [["Leave request", "General template", "Active"], ["Document approval", "General template", "Active"], ["Expense reimbursement", "General template", "Active"], ["Incident report", "General template", "Active"], ["IT support request", "General template", "Active"]],
};

const nav: Array<{ id: AdminView; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "clients", label: "Clients", icon: Building2 },
  { id: "studio", label: "AI workflow studio", icon: WandSparkles }, { id: "features", label: "Feature manager", icon: Blocks },
  { id: "templates", label: "Workflow library", icon: Library }, { id: "team", label: "Main account team", icon: UserCog },
  { id: "plans", label: "Plans & access", icon: BadgeDollarSign }, { id: "audit", label: "Audit log", icon: ScrollText },
  { id: "support", label: "Client support", icon: Headphones },
];

const titles: Record<AdminView, [string, string]> = {
  overview: ["Control center", "Manage the WorkGrid platform and every client workspace."], clients: ["Clients", "Companies using WorkGrid and the services enabled for them."],
  studio: ["AI workflow studio", "Create new workflows with AI and publish them to selected clients."], features: ["Feature manager", "Control which application capabilities are available to clients."],
  templates: ["Workflow library", "Manage reusable workflows available across client workspaces."], team: ["Main account team", "Control who can administer WorkGrid and what each person can do."],
  plans: ["Plans & access", "Define client limits, entitlements, and commercial access."], audit: ["Audit log", "Review important changes made by main-account administrators."],
  support: ["Client support", "Inspect connection health and help clients without exposing their business files."], settings: ["Platform settings", "Manage the WorkGrid main account and system preferences."],
};

export function AdminConsole() {
  const [view, setView] = useState<AdminView>("overview");
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [clientTab, setClientTab] = useState<"summary" | "staff" | "workflows">("summary");
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [features, setFeatures] = useState([true, true, true, false, true]);
  const [adminModal, setAdminModal] = useState<"client" | "team" | null>(null);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };
  const openClient = (client: ClientRecord) => { setSelected(client); setClientTab("summary"); };

  return <div className="portal-shell admin-shell">
    <aside className={`portal-sidebar ${mobile ? "open" : ""}`}>
      <Brand light />
      <div className="portal-mode"><span>WG</span><div><strong>Main account</strong><small>Platform administration</small></div><ChevronDown size={14} /></div>
      <nav><p>MANAGEMENT</p>{nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobile(false); }}><item.icon size={17} />{item.label}</button>)}</nav>
      <div className="side-bottom"><button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}><Settings size={17} /> Platform settings</button><Link href="/"><span className="portal-avatar">MA</span><span><strong>Main administrator</strong><small>Sign out</small></span><MoreHorizontal size={16} /></Link></div>
    </aside>
    {mobile && <button className="portal-scrim" onClick={() => setMobile(false)} aria-label="Close menu" />}
    <main className="portal-main">
      <header className="portal-topbar"><button className="mobile-toggle" onClick={() => setMobile(true)} aria-label="Open menu"><Menu size={20} /></button><div className="global-search"><Search size={16} /><input placeholder="Search clients, workflows, or features" /></div><div className="topbar-right"><span className="system-state"><span /> All systems operational</span><button><Bell size={18} /></button></div></header>
      <div className="portal-content">
        <div className="portal-heading"><div><p>WORKGRID MAIN ACCOUNT</p><h1>{titles[view][0]}</h1><span>{titles[view][1]}</span></div>{view === "clients" && <button className="solid-button" onClick={() => setAdminModal("client")}><Plus size={16} /> Add client</button>}{view === "studio" && <button className="solid-button" onClick={() => notify("AI workflow draft created.")}><Sparkles size={16} /> Generate workflow</button>}{view === "team" && <button className="solid-button" onClick={() => setAdminModal("team")}><Plus size={16} /> Invite administrator</button>}</div>

        {view === "overview" && <Overview openClient={openClient} onNavigate={setView} />}
        {view === "clients" && <ClientsView openClient={openClient} notify={notify} />}
        {view === "studio" && <StudioView notify={notify} />}
        {view === "features" && <FeaturesView values={features} setValues={setFeatures} notify={notify} />}
        {view === "templates" && <TemplatesView notify={notify} />}
        {view === "team" && <MainTeamView notify={notify} />}
        {view === "plans" && <PlansView notify={notify} />}
        {view === "audit" && <AuditView />}
        {view === "support" && <SupportView notify={notify} openClient={openClient} />}
        {view === "settings" && <SettingsView notify={notify} />}
      </div>
    </main>
    {selected && <ClientDrawer client={selected} tab={clientTab} setTab={setClientTab} onClose={() => setSelected(null)} notify={notify} />}
    {adminModal && <AdminModal type={adminModal} onClose={() => setAdminModal(null)} notify={notify} />}
    {toast && <div className="portal-toast"><Check size={16} />{toast}</div>}
  </div>;
}

function Overview({ openClient, onNavigate }: { openClient: (c: ClientRecord) => void; onNavigate: (v: AdminView) => void }) {
  return <div className="portal-stack"><section className="admin-metrics"><Metric icon={Building2} label="Active clients" value="1" detail="TEST LTD" tone="blue" /><Metric icon={Users} label="Client staff seats" value="5" detail="1 assigned · 4 available" tone="violet" /><Metric icon={Workflow} label="Active workflows" value="5" detail="Basic plan limit reached" tone="green" /><Metric icon={Activity} label="Active workflow runs" value="0" detail="No client submissions yet" tone="orange" /></section>
    <section className="portal-panel main-setup"><PanelTitle title="Main account setup" subtitle="Complete the controls needed before onboarding production clients." /><div className="setup-control-grid"><button className="done"><Check size={15} /><span><strong>Main account owner</strong><small>Administrator identity created</small></span></button><button onClick={() => onNavigate("team")}><UserCog size={15} /><span><strong>Administrator roles</strong><small>Invite and assign your main team</small></span></button><button onClick={() => onNavigate("plans")}><BadgeDollarSign size={15} /><span><strong>Plans and limits</strong><small>Set client entitlements</small></span></button><button onClick={() => onNavigate("templates")}><Library size={15} /><span><strong>Workflow library</strong><small>Prepare default client workflows</small></span></button><button onClick={() => onNavigate("support")}><Headphones size={15} /><span><strong>Client support rules</strong><small>Define safe support access</small></span></button><button onClick={() => onNavigate("settings")}><KeyRound size={15} /><span><strong>Security and authentication</strong><small>Finish production credentials</small></span></button></div></section>
    <section className="portal-grid two"><article className="portal-panel"><PanelTitle title="Client workspaces" subtitle="Your most recently active clients" action="View all" onAction={() => onNavigate("clients")} /><div className="client-mini-list">{clients.map((client) => <button key={client.id} onClick={() => openClient(client)}><ClientLogo client={client} /><span><strong>{client.name}</strong><small>{client.staff} staff · {client.workflows} workflows</small></span><span className="connected-dot"><i />{client.drive}</span><ChevronDown size={16} /></button>)}</div></article>
    <article className="portal-panel"><PanelTitle title="Platform activity" subtitle="Latest changes across WorkGrid" /><div className="activity-list"><ActivityItem icon={Building2} title="Client workspace configured" detail="TEST LTD · Education" time="Now" /><ActivityItem icon={Workflow} title="General workflows assigned" detail="5 active workflows · TEST LTD" time="Now" /><ActivityItem icon={FolderOpen} title="Client Drive connected" detail="TEST LTD · Service account verified" time="Now" /></div></article></section>
    <section className="portal-panel quick-panel"><PanelTitle title="Main account tools" subtitle="Build and manage the application" /><div className="quick-tools"><button onClick={() => onNavigate("studio")}><WandSparkles size={20} /><span><strong>Create with AI</strong><small>Generate a client-ready workflow</small></span></button><button onClick={() => onNavigate("features")}><Blocks size={20} /><span><strong>Manage features</strong><small>Control what clients can access</small></span></button><button onClick={() => onNavigate("templates")}><Library size={20} /><span><strong>Workflow library</strong><small>Maintain reusable templates</small></span></button><button onClick={() => onNavigate("team")}><UserCog size={20} /><span><strong>Main team</strong><small>Roles and administrator access</small></span></button></div></section>
  </div>;
}

function ClientsView({ openClient, notify }: { openClient: (c: ClientRecord) => void; notify: (m: string) => void }) {
  return <section className="portal-panel table-panel"><div className="table-tools"><div><Search size={16} /><input placeholder="Search clients" /></div><button>All plans <ChevronDown size={14} /></button><button>Active <ChevronDown size={14} /></button></div><div className="client-table"><div className="table-row table-head"><span>Client</span><span>Staff</span><span>Workflows</span><span>Google Drive</span><span>Plan</span><span>Status</span><span /></div>{clients.map((client) => <button className="table-row" key={client.id} onClick={() => openClient(client)}><span className="client-cell"><ClientLogo client={client} /><span><strong>{client.name}</strong><small>{client.workspace}.workgrid.app</small></span></span><span>{client.staff}</span><span>{client.workflows} <small className="ai-count">{client.aiWorkflows} AI</small></span><span className="drive-state"><i />{client.drive}</span><span>{client.plan}</span><span><b>{client.status}</b></span><MoreHorizontal size={16} onClick={(e) => { e.stopPropagation(); notify(`${client.name} menu opened.`); }} /></button>)}</div></section>;
}

function StudioView({ notify }: { notify: (m: string) => void }) {
  const [description, setDescription] = useState("");
  return <div className="studio-grid"><section className="portal-panel studio-prompt"><div className="studio-title"><span><Bot size={21} /></span><div><h2>Describe the workflow</h2><p>WorkGrid AI will turn your process into editable stages, roles, and rules.</p></div></div><label>What should this workflow do?<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Example: Route a staff request to the education manager, then send approved requests to the workflow administrator." rows={8} /></label><div className="prompt-options"><label>Publish for<select><option>Select clients later</option><option>TEST LTD</option><option>All clients</option></select></label><label>Starting point<select><option>Blank workflow</option><option>General workflow</option><option>Education template</option></select></label></div><button className="solid-button wide" disabled={!description.trim()} onClick={() => notify("AI workflow draft generated for review.")}><Sparkles size={16} /> Generate editable workflow</button></section>
    <aside className="portal-panel ai-guide"><span className="guide-icon"><WandSparkles size={22} /></span><h2>What AI creates</h2><ul><li><Check size={15} /> Form fields and validation</li><li><Check size={15} /> Workflow stages and decisions</li><li><Check size={15} /> Staff roles and assignments</li><li><Check size={15} /> Google Sheet column mapping</li><li><Check size={15} /> PDF close-report settings</li></ul><p>Every AI workflow remains a draft until a main account administrator reviews and publishes it.</p></aside>
  </div>;
}

function FeaturesView({ values, setValues, notify }: { values: boolean[]; setValues: (v: boolean[]) => void; notify: (m: string) => void }) {
  const rows = [["Forms builder", "Let clients create forms separate from workflows.", "Core"], ["AI workflow creation", "Allow selected clients to describe and generate workflows.", "AI"], ["Google Drive & Sheets", "Client-owned file storage and operational record sync.", "Integration"], ["Advanced analytics", "Cross-workflow charts and performance reports.", "Beta"], ["PDF close reports", "Generate and save a signed PDF when a workflow closes.", "Core"]];
  return <section className="portal-panel feature-list"><PanelTitle title="Application features" subtitle="Changes apply only to the clients you select." />{rows.map((row, index) => <div className="feature-row" key={row[0]}><span className="feature-symbol"><Blocks size={18} /></span><span><strong>{row[0]}</strong><small>{row[1]}</small></span><em>{row[2]}</em><button className={`toggle ${values[index] ? "on" : ""}`} aria-label={`Toggle ${row[0]}`} onClick={() => { const next = [...values]; next[index] = !next[index]; setValues(next); notify(`${row[0]} ${next[index] ? "enabled" : "disabled"}.`); }}><span /></button></div>)}</section>;
}

function TemplatesView({ notify }: { notify: (m: string) => void }) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("All industries");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [customTemplates, setCustomTemplates] = useState<TemplateItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.from("workflow_templates").select("name,category,industry_keys,definition,template_key").order("created_at", { ascending: false }).then(({ data }) => {
      if (!data) return;
      const builtInNames = new Set(workflowTemplates.map((item) => item[0]));
      const oldBuggyNames = new Set(["purchase approvel", "Incident report", "Travel request", "IT support request", "Contract approval", "Stock reorder"]);
      const labels: Record<string, string> = { general: "General", construction: "Construction", trading_distribution: "Trading & Distribution", retail: "Retail", manufacturing: "Manufacturing", professional_services: "Professional Services", healthcare: "Healthcare", hospitality: "Hospitality", logistics: "Logistics", real_estate: "Real Estate", education: "Education", other: "Other" };
      setCustomTemplates(data.filter((row) => !builtInNames.has(row.name) && !oldBuggyNames.has(row.name)).map((row) => [row.name, row.category, labels[row.industry_keys?.[0] ?? "general"] ?? "General", Array.isArray(row.definition?.stages) ? row.definition.stages.length : 3, row.template_key, row.definition] as TemplateItem));
    });
  }, []);
  const industries = ["All industries", ...Array.from(new Set(workflowTemplates.map((item) => item[2])))];
  const allTemplates = [...customTemplates, ...workflowTemplates];
  const filtered = allTemplates.filter((item) => (industry === "All industries" || item[2] === industry) && `${item[0]} ${item[1]} ${item[2]}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="library-page"><section className="workflow-folders"><button className={`portal-panel folder-card ${industry === "General" ? "active" : ""}`} onClick={() => { setIndustry("General"); setQuery(""); }}><span><FolderOpen size={21} /></span><div><p>SHARED FOLDER</p><h2>General Workflows</h2><small>Essential workflows for every business</small></div><strong>12 templates</strong><ArrowRight size={17} /></button></section><section className="portal-panel library-tools"><div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prebuilt workflows" /></div><select value={industry} onChange={(event) => setIndustry(event.target.value)}>{industries.map((item) => <option key={item}>{item}</option>)}</select><span><strong>{filtered.length}</strong> templates</span><button className="solid-button" onClick={() => setCreateOpen(true)}><CirclePlus size={15} /> New template</button></section><div className="library-grid">{filtered.map((item) => <article className="portal-panel library-card" key={`${item[0]}${item[2]}`}><span className="library-icon"><Workflow size={20} /></span><div className="template-tags"><em>{item[2]}</em><em>{item[1]}</em></div><h2>{item[0]}</h2><p>{item[3]} stages · Prebuilt and fully editable</p><div><button onClick={() => setSelectedTemplate(item)}>Open</button><button onClick={() => notify(`${item[0]} assignment opened.`)}>Use template</button></div></article>)}</div>{filtered.length === 0 && <section className="portal-panel library-empty">No templates match this search.</section>}{selectedTemplate && <TemplatePreview template={selectedTemplate} onClose={() => setSelectedTemplate(null)} notify={notify} />}{createOpen && <CreateTemplateModal onClose={() => setCreateOpen(false)} onCreated={(item) => { setCustomTemplates((current) => [item, ...current]); setCreateOpen(false); setSelectedTemplate(item); notify(`${item[0]} saved to Supabase and opened in designer.`); }} />}</div>;
}

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (item: TemplateItem) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError("");
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") ?? "").trim();
    const category = String(values.get("category") ?? "Operations");
    const industry = String(values.get("industry") ?? "General");
    const stages = Number(values.get("stages") ?? 3);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("Supabase is not configured."); setSaving(false); return; }
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setError("Your session expired. Sign in again."); setSaving(false); return; }
    const industryKey = industry.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const templateKey = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}_${Date.now()}`;
    const definition = { trigger: "form_submission", stages: Array.from({ length: stages }, (_, index) => ({ key: `stage_${index + 1}`, name: index === 0 ? "Request submitted" : index === stages - 1 ? "Completed" : `Approval stage ${index}`, order: index + 1 })), integrations: { google_drive: true, google_sheets: true }, completion: { generate_pdf: true } };
    const { error: insertError } = await supabase.from("workflow_templates").insert({ owner_scope: "system", template_key: templateKey, name, category, industry_keys: [industryKey], definition, version: 1, is_published: false, created_by: user.id });
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    onCreated([name, category, industry, stages, templateKey, definition]);
  };
  return <div className="client-modal-backdrop" onMouseDown={onClose}><section className="client-modal create-template-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><p>WORKFLOW LIBRARY</p><h2>Create workflow template</h2></div><button aria-label="Close" onClick={onClose}><X size={18} /></button></header><p>Create the reusable structure now. Approvers, permissions, conditions, forms, and Google destinations can be configured after saving.</p><form onSubmit={submit}><label>Template name<input name="name" placeholder="Example: Equipment purchase approval" required autoFocus /></label><div className="modal-field-grid"><label>Industry<select name="industry" defaultValue="General"><option>General</option><option>Construction</option><option>Trading &amp; Distribution</option><option>Retail</option><option>Manufacturing</option><option>Professional Services</option><option>Healthcare</option><option>Hospitality</option><option>Logistics</option><option>Real Estate</option><option>Education</option><option>Other</option></select></label><label>Category<select name="category" defaultValue="Operations"><option>Operations</option><option>Finance</option><option>Procurement</option><option>People</option><option>Inventory</option><option>Quality</option><option>Maintenance</option><option>Logistics</option></select></label></div><label>Initial stages<select name="stages" defaultValue="3"><option value="2">2 stages</option><option value="3">3 stages</option><option value="4">4 stages</option><option value="5">5 stages</option><option value="6">6 stages</option></select></label>{error && <p className="modal-error">{error}</p>}<footer><button type="button" onClick={onClose}>Cancel</button><button className="solid-button" disabled={saving}>{saving ? "Saving…" : "Create template"}</button></footer></form></section></div>;
}

function TemplatePreview({ template, onClose, notify }: { template: TemplateItem; onClose: () => void; notify: (m: string) => void }) {
  const [configTab, setConfigTab] = useState<"diagram" | "approvers" | "permissions" | "outputs">("diagram");
  const [isSaving, setIsSaving] = useState(false);
  const currentNodesRef = useRef<any>(null);
  const currentEdgesRef = useRef<any>(null);

  const handleSave = async () => {
    if (!template[4]) {
      notify("Built-in templates cannot be edited directly.");
      return;
    }
    setIsSaving(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    
    const newDefinition = {
      ...(template[5] || {}),
      nodes: currentNodesRef.current,
      edges: currentEdgesRef.current
    };
    
    const { error } = await supabase
      .from("workflow_templates")
      .update({ definition: newDefinition })
      .eq("template_key", template[4]);
      
    setIsSaving(false);
    if (error) {
      notify(`Error saving: ${error.message}`);
    } else {
      notify(`${template[0]} configuration saved successfully!`);
    }
  };

  return <div className="client-modal-backdrop" onMouseDown={onClose}><section className="client-modal template-preview workflow-designer" onMouseDown={(event) => event.stopPropagation()}><header><div><p>WORKFLOW TEMPLATE CONFIGURATION</p><h2>{template[0]}</h2><span>{template[2]} · {template[1]} · Draft template</span></div><button aria-label="Close" onClick={onClose}><X size={18} /></button></header><nav className="designer-tabs">{(["diagram", "approvers", "permissions", "outputs"] as const).map((item) => <button className={configTab === item ? "active" : ""} key={item} onClick={() => setConfigTab(item)}>{item}</button>)}</nav>
    {configTab === "diagram" && <div className="designer-body"><div className="flow-legend"><span><i className="source" /> Input</span><span><i className="action" /> Role action</span><span><i className="decision" /> Condition</span><span><i className="output" /> Output</span></div><WorkflowEditor definition={template[5]} onChange={(nodes: any, edges: any) => { currentNodesRef.current = nodes; currentEdgesRef.current = edges; }} /></div>}
    {configTab === "approvers" && <div className="designer-config"><h3>Approval directions</h3><p>Configure roles only. The client chooses the real staff members after using the template.</p><div className="config-row"><span>1</span><div><strong>Department manager</strong><small>Receives every submitted request</small></div><select><option>Manager role</option><option>Workspace admin role</option><option>Specific role...</option></select></div><div className="config-row"><span>2</span><div><strong>Finance approver</strong><small>Receives requests above the amount condition</small></div><select><option>Finance role</option><option>Owner role</option><option>Specific role...</option></select></div><label>Approval amount condition<div className="condition-input"><select><option>Request amount</option></select><select><option>is greater than</option></select><input defaultValue="5,000" /><span>AED</span></div></label></div>}
    {configTab === "permissions" && <div className="designer-config"><h3>Permission configuration</h3><p>These permissions control what each role can do inside this workflow.</p><div className="permission-grid"><div><LockKeyhole size={18} /><strong>Requester role</strong><label><input type="checkbox" defaultChecked /> Create request</label><label><input type="checkbox" defaultChecked /> View own requests</label><label><input type="checkbox" /> View all requests</label><label><input type="checkbox" defaultChecked /> Edit while returned</label></div><div><LockKeyhole size={18} /><strong>Manager role</strong><label><input type="checkbox" defaultChecked /> View assigned requests</label><label><input type="checkbox" defaultChecked /> Approve or reject</label><label><input type="checkbox" defaultChecked /> Return for changes</label><label><input type="checkbox" /> Edit request values</label></div><div><LockKeyhole size={18} /><strong>Finance role</strong><label><input type="checkbox" defaultChecked /> View finance queue</label><label><input type="checkbox" defaultChecked /> Approve or reject</label><label><input type="checkbox" defaultChecked /> View attachments</label><label><input type="checkbox" defaultChecked /> View final PDF</label></div></div></div>}
    {configTab === "outputs" && <div className="designer-config"><h3>Storage and outputs</h3><p>The client connects the real Google account and selects the folders after assigning this template.</p><div className="output-config"><div><FolderOpen size={20} /><span><strong>Google Drive folder</strong><small>Pull attachments from and save files to the client-selected workflow folder.</small></span><button>Required</button></div><div><Blocks size={20} /><span><strong>Google Sheets record</strong><small>Append the configured workflow fields and status to a client-owned Sheet.</small></span><button>Enabled</button></div><div><FileText size={20} /><span><strong>Workflow close PDF</strong><small>Generate the form, approval directions, decisions, timestamps, and attachment list.</small></span><button>Enabled</button></div></div></div>}
    <footer><span>Template configuration only · No client data</span><button onClick={onClose}>Close</button><button className="solid-button" disabled={isSaving} onClick={handleSave}>{isSaving ? "Saving..." : "Save configuration"}</button><button className="solid-button" onClick={() => { onClose(); notify(`${template[0]} is ready to assign to a client.`); }}>Use this template</button></footer></section></div>;
}

function MainTeamView({ notify }: { notify: (m: string) => void }) {
  const members = [
    ["Main Administrator", "tokimekidxb@gmail.com", "Owner", "Full platform access", "Active"],
  ];
  return <div className="portal-grid team-layout"><section className="portal-panel team-table"><PanelTitle title="Main-account administrators" subtitle="These accounts are separate from all client staff accounts." /><div className="team-row team-head"><span>Administrator</span><span>Role</span><span>Permission scope</span><span>Status</span><span /></div>{members.map((member) => <div className="team-row" key={member[1]}><span className="team-person"><span className="person-avatar">{member[0].split(" ").map((word) => word[0]).join("").slice(0, 2)}</span><span><strong>{member[0]}</strong><small>{member[1]}</small></span></span><span>{member[2]}</span><span>{member[3]}</span><span><b>{member[4]}</b></span><button onClick={() => notify(`${member[0]} permissions opened.`)}><MoreHorizontal size={16} /></button></div>)}</section><aside className="portal-panel role-guide"><ShieldCheck size={23} /><h2>Recommended roles</h2><div><strong>Owner</strong><small>Account, billing, security, and all settings</small></div><div><strong>Administrator</strong><small>Clients, features, and workflow publishing</small></div><div><strong>Workflow designer</strong><small>AI studio and workflow library only</small></div><div><strong>Support</strong><small>Connection health and time-limited support</small></div></aside></div>;
}

function PlansView({ notify }: { notify: (m: string) => void }) {
  const plans = [
    { name: "Basic", price: "Price not set", clients: "TEST LTD", staff: "Up to 5 staff", workflows: "5 active workflows", features: ["Forms and workflows", "Personal or Workspace Google Drive", "PDF close reports"] },
    { name: "Starter", price: "AED 49", clients: "No clients", staff: "Up to 10 staff", workflows: "10 active workflows", features: ["Everything in Basic", "Google Sheets sync", "Prebuilt workflow library"] },
    { name: "Business", price: "Price not set", clients: "No clients", staff: "Up to 20 staff", workflows: "20 active workflows", features: ["Everything in Starter", "Client AI workflow creation", "Advanced permissions"] },
  ];
  return <div className="plans-page"><section className="plan-grid">{plans.map((plan) => <article className={`portal-panel plan-card ${plan.name === "Starter" ? "recommended" : ""}`} key={plan.name}>{plan.name === "Starter" && <em>POPULAR</em>}<p>{plan.name.toUpperCase()}</p><h2>{plan.price}<small>{plan.price.startsWith("AED") ? " / month" : ""}</small></h2><span>{plan.clients}</span><div className="plan-limits"><strong>{plan.staff}</strong><strong>{plan.workflows}</strong></div><ul>{plan.features.map((feature) => <li key={feature}><Check size={13} />{feature}</li>)}</ul><button onClick={() => notify(`${plan.name} plan editor opened.`)}>Edit plan</button></article>)}</section><section className="portal-panel entitlement-note"><KeyRound size={20} /><div><h2>Plans control limits; features control capabilities</h2><p>A client receives the limits from its plan and only the features you explicitly enable. Changing a plan never exposes another client’s data.</p></div><button onClick={() => notify("Client plan assignment opened.")}>Assign plans</button></section></div>;
}

function AuditView() {
  const events = [
    ["Client workspace configured", "Main Administrator", "TEST LTD → Education", "Today"],
    ["General workflows assigned", "Main Administrator", "5 workflows → TEST LTD", "Today"],
    ["Drive folder linked", "Main Administrator", "TEST LTD folder", "Today"],
  ];
  return <section className="portal-panel audit-panel"><div className="table-tools"><div><Search size={16} /><input placeholder="Search audit history" /></div><button>All administrators <ChevronDown size={14} /></button><button>Last 30 days <ChevronDown size={14} /></button></div><div className="audit-row audit-head"><span>Event</span><span>Administrator</span><span>Target</span><span>Date</span></div>{events.map((event) => <div className="audit-row" key={`${event[0]}${event[3]}`}><span><i><ScrollText size={15} /></i><strong>{event[0]}</strong></span><span>{event[1]}</span><span>{event[2]}</span><span>{event[3]}</span></div>)}</section>;
}

function SupportView({ notify, openClient }: { notify: (m: string) => void; openClient: (client: ClientRecord) => void }) {
  return <div className="portal-stack"><section className="support-banner"><ShieldCheck size={21} /><div><h2>Privacy-safe client support</h2><p>Main-account support can inspect account configuration, sync status, and errors. Client files and business records remain in the client’s Google account.</p></div></section><section className="portal-grid two">{clients.map((client) => <article className="portal-panel support-client" key={client.id}><div><ClientLogo client={client} /><span><h2>{client.name}</h2><p>{client.plan} plan · {client.staff} staff seats</p></span><b><i /> Configured</b></div><section><p><span>Google folder</span><strong>Linked</strong></p><p><span>Google connection</span><strong>Service account</strong></p><p><span>Failed jobs</span><strong>0</strong></p><p><span>Available staff seats</span><strong>4</strong></p></section><footer><button onClick={() => openClient(client)}>View configuration</button><button onClick={() => notify(`15-minute support session prepared for ${client.name}.`)}>Start support session</button></footer></article>)}</section></div>;
}

function AdminModal({ type, onClose, notify }: { type: "client" | "team"; onClose: () => void; notify: (message: string) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onClose(); notify(type === "client" ? "Client onboarding draft created." : "Main-account invitation prepared."); };
  return <div className="client-modal-backdrop" onMouseDown={onClose}><section className="client-modal admin-operation-modal" onMouseDown={(event) => event.stopPropagation()}><header><h2>{type === "client" ? "Add a client" : "Invite main-account administrator"}</h2><button aria-label="Close" onClick={onClose}><X size={18} /></button></header><p>{type === "client" ? "Create the company workspace, select its industry, invite its owner, and choose its initial access." : "Main-account administrators are never added to a client’s staff list."}</p><form onSubmit={submit}>{type === "client" ? <><div className="modal-field-grid"><label>Company name<input placeholder="Company name" required autoFocus /></label><label>Workspace ID<input placeholder="company-name" required /></label></div><div className="modal-field-grid"><label>Industry<select required defaultValue=""><option value="" disabled>Select industry</option><option>Construction</option><option>Trading &amp; Distribution</option><option>Retail</option><option>Manufacturing</option><option>Professional Services</option><option>Healthcare</option><option>Hospitality</option><option>Logistics</option><option>Real Estate</option><option>Education</option><option>Other</option></select></label><label>Client owner email<input type="email" placeholder="owner@company.com" required /></label></div><div className="modal-field-grid"><label>Plan<select defaultValue="Starter"><option>Basic</option><option>Starter</option><option>Business</option></select></label><label>Data region<select defaultValue="Default"><option>Default</option><option>EU</option><option>Asia Pacific</option></select></label></div><div className="onboarding-checks"><label><input type="checkbox" defaultChecked /> Forms builder</label><label><input type="checkbox" defaultChecked /> Google Drive &amp; Sheets</label><label><input type="checkbox" /> Client AI workflow creation</label><label><input type="checkbox" defaultChecked /> PDF close reports</label></div></> : <><label>Work email<input type="email" placeholder="admin@workgrid.app" required autoFocus /></label><label>Administrator role<select><option>Administrator</option><option>Workflow designer</option><option>Support</option></select></label><label>Invitation note<textarea rows={3} placeholder="Optional message" /></label></>}<button className="solid-button">{type === "client" ? "Create onboarding draft" : "Send invitation"}</button></form></section></div>;
}

function SettingsView({ notify }: { notify: (m: string) => void }) {
  return <div className="portal-grid settings-cols"><section className="portal-panel settings-form"><PanelTitle title="Main account" subtitle="WorkGrid platform identity" /><label>Platform name<input defaultValue="WorkGrid" /></label><label>Administrator email<input defaultValue="tokimekidxb@gmail.com" /></label><label>Support email<input placeholder="Not configured" /></label><button className="solid-button" onClick={() => notify("Platform settings saved.")}>Save changes</button></section><aside className="portal-panel security-card"><ShieldCheck size={25} /><h2>Account security</h2><p>Client users cannot access this control center. Main account permissions are kept separate from client workspace roles.</p><button onClick={() => notify("Security settings opened.")}>Manage security</button></aside></div>;
}

function ClientDrawer({ client, tab, setTab, onClose, notify }: { client: ClientRecord; tab: "summary" | "staff" | "workflows"; setTab: (t: "summary" | "staff" | "workflows") => void; onClose: () => void; notify: (m: string) => void }) {
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="client-drawer" onMouseDown={(e) => e.stopPropagation()}><header><ClientLogo client={client} /><div><p>CLIENT WORKSPACE</p><h2>{client.name}</h2><span>{client.workspace}.workgrid.app</span></div><button onClick={onClose} aria-label="Close"><X size={19} /></button></header><nav>{(["summary", "staff", "workflows"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === "summary" && <div className="drawer-body"><section className="drawer-stats"><span><strong>{client.staff}</strong><small>Staff seats</small></span><span><strong>{client.workflows}</strong><small>Workflows</small></span><span><strong>{client.forms}</strong><small>Forms</small></span></section><div className="detail-list"><p><span>Industry</span><strong>{client.industry}</strong></p><p><span>Workspace</span><strong>{client.workspace}</strong></p><p><span>Google Drive</span><strong>Service account connected</strong></p><p><span>Plan</span><strong>{client.plan}</strong></p><p><span>AI workflows</span><strong>{client.aiWorkflows}</strong></p></div><button className="solid-button wide" onClick={() => notify(`Opening ${client.name} as administrator.`)}>Open client workspace</button></div>}
    {tab === "staff" && <div className="drawer-body"><div className="drawer-section-title"><div><h3>Staff</h3><p>{client.staff} team members</p></div><button onClick={() => notify(`Invite staff to ${client.name}.`)}><Plus size={14} /> Invite</button></div><div className="drawer-list">{staff[client.id as keyof typeof staff].map((person) => <div key={person[2]}><span className="person-avatar">{person[0].split(" ").map(n => n[0]).join("")}</span><span><strong>{person[0]}</strong><small>{person[2]}</small></span><em>{person[1]}</em></div>)}</div></div>}
    {tab === "workflows" && <div className="drawer-body"><div className="drawer-section-title"><div><h3>Workflows</h3><p>{client.workflows} configured processes</p></div><button onClick={() => notify(`Create workflow for ${client.name}.`)}><Plus size={14} /> New</button></div><div className="workflow-list">{companyWorkflows[client.id as keyof typeof companyWorkflows].map((workflow) => <div key={workflow[0]}><span><Workflow size={17} /></span><span><strong>{workflow[0]}</strong><small>{workflow[1]}</small></span><em>{workflow[2]}</em></div>)}</div></div>}
  </aside></div>;
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: string; detail: string; tone: string }) { return <article className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={18} /></span><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>; }
function ClientLogo({ client }: { client: ClientRecord }) { return <span className={`client-logo ${client.color}`}>{client.id.slice(0, 2)}</span>; }
function PanelTitle({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) { return <div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button onClick={onAction}>{action}</button>}</div>; }
function ActivityItem({ icon: Icon, title, detail, time }: { icon: LucideIcon; title: string; detail: string; time: string }) { return <div><span><Icon size={16} /></span><span><strong>{title}</strong><small>{detail}</small></span><em>{time}</em></div>; }
