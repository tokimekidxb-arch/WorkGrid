"use client";

import Link from "next/link";
import {
  Bell, Bot, Check, ChevronDown, ClipboardCheck, Database, FileText, FolderSync,
  FormInput, Grid2X2, LayoutDashboard, Link2, Menu, MoreHorizontal, Plus, Search,
  Settings, ShieldCheck, Sparkles, Users, Workflow, X, type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/brand";

type ClientView = "overview" | "staff" | "forms" | "workflows" | "records" | "reports" | "drive" | "settings";
const driveFolderUrl = "https://drive.google.com/drive/folders/1S_dCzrDgLtOVmCkQXFMXEHtS2i21PTy_";

const clientNav: Array<{ id: ClientView; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "staff", label: "Staff", icon: Users },
  { id: "forms", label: "Forms", icon: FormInput }, { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "records", label: "Records", icon: Database }, { id: "reports", label: "Reports", icon: FileText },
];
const headings: Record<ClientView, [string, string]> = {
  overview: ["TEST LTD workspace", "Education workflows, staff access, and client-owned storage."],
  staff: ["Staff", "Assign real people to the five available role seats."],
  forms: ["Forms", "Input forms remain separate and connect to workflow starting points."],
  workflows: ["Workflows", "Five General workflows configured for the Basic plan."],
  records: ["Records", "Workflow records will synchronize after Google OAuth and Sheets setup."],
  reports: ["Reports", "Final PDFs will be generated when workflow runs close."],
  drive: ["Google Drive & Sheets", "TEST LTD owns the linked folder and future spreadsheet data."],
  settings: ["Company settings", "Manage the TEST LTD Education workspace."],
};
const staffRows = [
  ["Workspace owner", "tokimekidxb@gmail.com", "Owner", "Active"],
  ["Education manager", "Invite a staff member", "Manager", "Available"],
  ["Finance approver", "Invite a staff member", "Approver", "Available"],
  ["Workflow administrator", "Invite a staff member", "Administrator", "Available"],
  ["Staff requester", "Invite a staff member", "Requester", "Available"],
];
const workflowRows = [
  ["Leave request", "General template", "3 stages", "Active", "1 test run"],
  ["Document approval", "General template", "3 stages", "Active", "1 test run"],
  ["Expense reimbursement", "General template", "4 stages", "Active", "1 test run"],
  ["Incident report", "General template", "4 stages", "Active", "1 test run"],
  ["IT support request", "General template", "3 stages", "Active", "1 test run"],
];
const formRows = [
  ["Leave request form", "Starts Leave request"], ["Document approval form", "Starts Document approval"],
  ["Expense reimbursement form", "Starts Expense reimbursement"], ["Incident report form", "Starts Incident report"],
  ["IT support request form", "Starts IT support request"],
];

export function ClientPortal() {
  const [view, setView] = useState<ClientView>("overview");
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<"workflow" | "form" | "staff" | null>(null);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };
  return <div className="portal-shell client-shell">
    <aside className={`portal-sidebar ${mobile ? "open" : ""}`}>
      <Brand light />
      <div className="portal-mode"><span className="company-mode">TL</span><div><strong>TEST LTD</strong><small>Education workspace</small></div><ChevronDown size={14} /></div>
      <nav><p>COMPANY</p>{clientNav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobile(false); }}><item.icon size={17} />{item.label}</button>)}<p className="nav-section">CONNECTIONS</p><button className={view === "drive" ? "active" : ""} onClick={() => setView("drive")}><FolderSync size={17} /> Google Drive</button></nav>
      <div className="side-bottom"><button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}><Settings size={17} /> Company settings</button><Link href="/"><span className="portal-avatar">WO</span><span><strong>Workspace owner</strong><small>Owner · Sign out</small></span><MoreHorizontal size={16} /></Link></div>
    </aside>
    {mobile && <button className="portal-scrim" onClick={() => setMobile(false)} aria-label="Close menu" />}
    <main className="portal-main">
      <header className="portal-topbar"><button className="mobile-toggle" onClick={() => setMobile(true)} aria-label="Open menu"><Menu size={20} /></button><div className="global-search"><Search size={16} /><input placeholder="Search TEST LTD workspace" /></div><div className="topbar-right"><span className="drive-top-state"><span /> Drive folder linked · OAuth required</span><button><Bell size={18} /></button></div></header>
      <div className="portal-content">
        <div className="portal-heading"><div><p>TEST LTD · EDUCATION</p><h1>{headings[view][0]}</h1><span>{headings[view][1]}</span></div>{view === "staff" && <button className="solid-button" onClick={() => setModal("staff")}><Plus size={16} /> Invite staff</button>}{view === "forms" && <button className="solid-button" onClick={() => setModal("form")}><Plus size={16} /> New form</button>}{view === "workflows" && <button className="solid-button" onClick={() => setModal("workflow")}><Plus size={16} /> New workflow</button>}</div>
        {view === "overview" && <ClientOverview onNavigate={setView} />}{view === "staff" && <StaffView notify={notify} />}{view === "forms" && <FormsView onCreate={() => setModal("form")} />}{view === "workflows" && <WorkflowsView notify={notify} />}{view === "records" && <RecordsView notify={notify} />}{view === "reports" && <ReportsView />}{view === "drive" && <DriveView notify={notify} />}{view === "settings" && <CompanySettings notify={notify} />}
      </div>
    </main>
    {modal && <ClientModal type={modal} onClose={() => setModal(null)} notify={notify} setView={setView} />}{toast && <div className="portal-toast"><Check size={16} />{toast}</div>}
  </div>;
}

function ClientOverview({ onNavigate }: { onNavigate: (v: ClientView) => void }) {
  return <div className="portal-stack"><section className="client-welcome"><span><Sparkles size={21} /></span><div><p>YOUR COMPANY WORKSPACE</p><h2>TEST LTD is ready for real staff and workflow submissions</h2><small>Five General workflows are configured. The Drive folder is linked; Google OAuth is the next connection step.</small></div><button onClick={() => onNavigate("workflows")}>View workflows</button></section>
    <section className="admin-metrics"><ClientMetric icon={Workflow} label="Active workflows" value="5" detail="Basic plan limit reached" tone="blue" /><ClientMetric icon={ClipboardCheck} label="Test workflow runs" value="5" detail="3 currently need action" tone="orange" /><ClientMetric icon={Users} label="Staff seats" value="5" detail="1 assigned · 4 available" tone="violet" /><ClientMetric icon={FileText} label="Generated reports" value="1" detail="Drive upload pending OAuth" tone="green" /></section>
    <section className="portal-grid two"><article className="portal-panel"><ClientPanelTitle title="Work in progress" subtitle="TEST LTD application-testing scenarios" action="All workflows" onAction={() => onNavigate("workflows")} /><div className="running-list"><div><span className="run-icon">LV</span><span><strong>Leave request · TL-LEAVE-0001</strong><small>Manager approval · Academic Operations</small></span><em>Active</em></div><div><span className="run-icon purple">EX</span><span><strong>Expense reimbursement · TL-EXP-0001</strong><small>Finance review · AED 685.50</small></span><em>Pending</em></div><div><span className="run-icon green">IT</span><span><strong>IT support request · TL-IT-0001</strong><small>Technical review · Room E-204</small></span><em>Active</em></div></div></article><article className="portal-panel"><ClientPanelTitle title="Quick actions" subtitle="Test the client workspace" /><div className="client-actions"><button onClick={() => onNavigate("forms")}><FormInput size={18} /><span><strong>Review forms</strong><small>Five workflow inputs</small></span></button><button onClick={() => onNavigate("staff")}><Users size={18} /><span><strong>Manage staff</strong><small>Four seats available</small></span></button><button onClick={() => onNavigate("drive")}><FolderSync size={18} /><span><strong>Finish Google connection</strong><small>OAuth and Sheets setup</small></span></button></div></article></section>
  </div>;
}

function StaffView({ notify }: { notify: (m: string) => void }) { return <section className="portal-panel table-panel"><div className="table-tools"><div><Search size={16} /><input placeholder="Search staff seats" /></div><button>All roles <ChevronDown size={14} /></button></div><div className="staff-table"><div className="staff-row staff-head"><span>Seat</span><span>Role</span><span>Status</span><span /></div>{staffRows.map((person) => <div className="staff-row" key={person[0]}><span className="staff-person"><span className="person-avatar">{person[0].split(" ").map(n => n[0]).join("")}</span><span><strong>{person[0]}</strong><small>{person[1]}</small></span></span><span>{person[2]}</span><span><b className={person[3] === "Available" ? "invited" : ""}>{person[3]}</b></span><button onClick={() => notify(`${person[0]} settings opened.`)}><MoreHorizontal size={16} /></button></div>)}</div></section>; }
function FormsView({ onCreate }: { onCreate: () => void }) { return <section className="portal-panel table-panel"><div className="table-tools"><div><Search size={16} /><input placeholder="Search forms" /></div><button>All statuses <ChevronDown size={14} /></button></div><div className="form-cards">{formRows.map((form) => <article key={form[0]}><span><FormInput size={20} /></span><div><h2>{form[0]}</h2><p>{form[1]} · Fields ready to configure</p></div><em>Configured</em></article>)}<button className="add-card" onClick={onCreate}><Plus size={20} /><strong>Create another form</strong></button></div></section>; }
function WorkflowsView({ notify }: { notify: (m: string) => void }) { return <section className="portal-panel table-panel"><div className="table-tools"><div><Search size={16} /><input placeholder="Search workflows" /></div><button>All sources <ChevronDown size={14} /></button><button>All statuses <ChevronDown size={14} /></button></div><div className="workflow-table"><div className="workflow-row workflow-head"><span>Workflow</span><span>Created with</span><span>Structure</span><span>Runs</span><span>Status</span><span /></div>{workflowRows.map((workflow) => <button className="workflow-row" key={workflow[0]} onClick={() => notify(`${workflow[0]} editor opened.`)}><span className="workflow-name"><span><Workflow size={17} /></span><strong>{workflow[0]}</strong></span><span>{workflow[1]}</span><span>{workflow[2]}</span><span>{workflow[4]}</span><span><b>{workflow[3]}</b></span><MoreHorizontal size={16} /></button>)}</div></section>; }
function RecordsView({ notify }: { notify: (m: string) => void }) { const records = [["TL-LEAVE-0001","Annual leave for autumn term break","Manager","Active"],["TL-DOC-0001","Student safeguarding policy 2026","Completed","Completed"],["TL-EXP-0001","Science laboratory teaching materials","Finance","Pending"],["TL-INC-0001","Classroom projector interruption","Administrator","Rejected"],["TL-IT-0001","Configure classroom projector","Administrator","Active"]]; return <section className="portal-panel table-panel"><div className="table-tools"><div><Search size={16} /><input placeholder="Search company records" /></div><button onClick={() => notify("The test records are in WorkGrid. Connect Google OAuth to synchronize them to Sheets.")}><FolderSync size={14} /> Sync now</button></div><div className="record-tabs"><button className="active">All test records</button><button>Leave</button><button>Documents</button><button>Expenses</button><button>Incidents</button><button>IT support</button></div><div className="data-grid"><div><b>Reference</b><b>Request title</b><b>Current approver role</b><b>Status</b><b>Sheet sync</b></div>{records.map((record) => <div key={record[0]}><span>{record[0]}</span><span>{record[1]}</span><span>{record[2]}</span><em className={record[3] === "Completed" ? "complete" : ""}>{record[3]}</em><span>Waiting for OAuth</span></div>)}</div></section>; }
function ReportsView() { return <section className="portal-panel table-panel"><div className="table-tools"><div><Search size={16} /><input placeholder="Search PDF reports" /></div><button>All workflows <ChevronDown size={14} /></button></div><div className="report-list"><div><span><FileText size={18} /></span><span><strong>TL-DOC-0001-Final.pdf</strong><small>Document approval · Test close report generated</small></span><em>Drive upload pending</em><button>Preview</button></div></div></section>; }
function DriveView({ notify }: { notify: (m: string) => void }) { return <div className="drive-layout"><section className="portal-panel drive-card"><div className="drive-connected"><span className="google-g">G</span><span><p>CLIENT-OWNED STORAGE</p><h2>TEST LTD Google Drive</h2><small>Folder linked; WorkGrid OAuth authorization is still required.</small></span><em><i /> Setup required</em></div><div className="drive-resources"><div><FolderSync size={19} /><span><strong>TEST LTD</strong><small>Linked client root folder</small></span><a href={driveFolderUrl} target="_blank" rel="noreferrer">Open</a></div><div><Grid2X2 size={19} /><span><strong>Google Sheet not connected</strong><small>Five workflow mappings are ready to create after OAuth.</small></span><button onClick={() => notify("Complete Google OAuth before creating the operational Sheet.")}>Set up</button></div></div><div className="sync-summary"><span><strong>Last synchronized</strong><small>Never</small></span><span><strong>Records synchronized</strong><small>0 records</small></span><button onClick={() => notify("Google OAuth connection is required before synchronization.")}><FolderSync size={14} /> Connect OAuth</button></div></section><aside className="portal-panel ownership-card"><ShieldCheck size={24} /><h2>TEST LTD owns its data</h2><p>Documents, spreadsheets, and generated reports stay in TEST LTD’s Google account. WorkGrid stores only access configuration, workflow state, and Google file references.</p><button onClick={() => notify("Google OAuth setup opened.")}><Link2 size={14} /> Manage connection</button></aside></div>; }
function CompanySettings({ notify }: { notify: (m: string) => void }) { return <section className="portal-panel company-settings"><ClientPanelTitle title="Company profile" subtitle="Workspace details shown to staff" /><div><label>Company name<input defaultValue="TEST LTD" /></label><label>Workspace ID<input defaultValue="test-ltd" /></label><label>Industry<input defaultValue="Education" /></label><label>Default currency<select defaultValue="AED"><option>AED</option><option>USD</option><option>GBP</option></select></label></div><button className="solid-button" onClick={() => notify("Company settings saved.")}>Save changes</button></section>; }

function ClientModal({ type, onClose, notify, setView }: { type: "workflow" | "form" | "staff"; onClose: () => void; notify: (m: string) => void; setView: (v: ClientView) => void }) {
  return <div className="client-modal-backdrop" onMouseDown={onClose}><section className="client-modal" onMouseDown={(e) => e.stopPropagation()}><header><h2>{type === "workflow" ? "Create a workflow" : type === "form" ? "Create a form" : "Invite staff"}</h2><button aria-label="Close" onClick={onClose}><X size={18} /></button></header>{type === "workflow" ? <><p>Choose how TEST LTD will create this process.</p><div className="creation-options"><button onClick={() => { onClose(); notify("Blank workflow draft created."); }}><Workflow size={20} /><strong>Build manually</strong><small>Start from a blank workflow.</small></button><button onClick={() => { onClose(); notify("Workflow library opened."); }}><FileText size={20} /><strong>Use a template</strong><small>Install a ready-made workflow.</small></button><button onClick={() => { onClose(); notify("AI workflow assistant opened."); }}><Bot size={20} /><strong>Create with AI</strong><small>Describe the process in plain language.</small></button></div></> : type === "form" ? <form onSubmit={(e) => { e.preventDefault(); onClose(); notify("Form draft created."); setView("forms"); }}><label>Form name<input placeholder="e.g. Student support request" required autoFocus /></label><label>Description<textarea placeholder="What information should this form collect?" rows={3} /></label><button className="solid-button">Create form draft</button></form> : <form onSubmit={(e) => { e.preventDefault(); onClose(); notify("Staff invitation prepared."); }}><label>Email address<input type="email" placeholder="person@company.com" required autoFocus /></label><label>Role<select><option>Requester</option><option>Manager</option><option>Approver</option><option>Administrator</option></select></label><button className="solid-button">Send invitation</button></form>}</section></div>;
}
function ClientMetric({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: string; detail: string; tone: string }) { return <article className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={18} /></span><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>; }
function ClientPanelTitle({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) { return <div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button onClick={onAction}>{action}</button>}</div>; }
