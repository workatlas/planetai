import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { RefreshCw, ShieldCheck, CheckCircle2, XCircle, Clock3, LogOut } from "lucide-react";

type Submission = {
  id: string; reference_code: string; employer_name: string; employer_email: string;
  company_name: string; job_title: string; category: string; employment_type: string;
  location: string; description: string; package_tier: string; status: string;
  submitted_at: string; company_website?: string; apply_url: string; salary_min?: number;
  salary_max?: number; salary_currency?: string; pay_period?: string; remote_policy?: string;
  requirements?: string[]; tags?: string[]; review_notes?: string;
};
type Payment = { submission_id: string; amount: number; currency: string; status: string; provider_capture_id?: string };
const statusLabel: Record<string,string> = {
  pending_review: "Needs review", email_verification_pending: "Email verification pending",
  approved_awaiting_payment: "Awaiting payment", ready_to_publish: "Ready to publish",
  published: "Published", rejected: "Rejected",
};
export default function AdminModeration() {
  const [rows,setRows]=useState<Submission[]>([]);
  const [payments,setPayments]=useState<Payment[]>([]);
  const [selected,setSelected]=useState<Submission|null>(null);
  const [notes,setNotes]=useState("");
  const [filter,setFilter]=useState("pending_review");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [email,setEmail]=useState<string|null>(null);

  const load=useCallback(async()=>{
    setLoading(true); setError("");
    const {data:sessionData}=await supabase.auth.getSession();
    setEmail(sessionData.session?.user.email ?? null);
    if(!sessionData.session){setRows([]);setLoading(false);setError("Sign in with your authorized administrator account.");return;}
    const {data,error:invokeError}=await supabase.functions.invoke("admin-moderation",{body:{action:"list"}});
    if(invokeError){setError(invokeError.message || "Could not load moderation queue.");setRows([]);}
    else {setRows(data?.submissions ?? []);setPayments(data?.payments ?? []);}
    setLoading(false);
  },[]);
  useEffect(()=>{void load();},[load]);

  const review=async(decision:"approve"|"reject")=>{
    if(!selected)return;
    setBusy(true);setError("");setMessage("");
    const {data,error:invokeError}=await supabase.functions.invoke("admin-moderation",{
      body:{action:"review",submission_id:selected.id,decision,notes}
    });
    setBusy(false);
    if(invokeError){setError(invokeError.message || "Review action failed.");return;}
    setMessage(data?.next_step || (decision==="reject"?"Submission rejected.":"Submission approved."));
    setSelected(null);setNotes("");await load();
  };
  const visible=rows.filter(r=>filter==="all"||r.status===filter);
  const counts={
    pending:rows.filter(r=>r.status==="pending_review").length,
    payment:rows.filter(r=>r.status==="approved_awaiting_payment").length,
    published:rows.filter(r=>r.status==="published").length,
  };
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 text-sm font-black tracking-tight"><ShieldCheck className="text-blue-700"/> PLANETAI · ADMIN MODERATION</div><p className="mt-1 text-xs text-slate-500">{email ?? "Administrator authentication required"}</p></div>
        <div className="flex items-center gap-2"><button onClick={()=>void load()} disabled={loading} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"><RefreshCw size={14} className="mr-1 inline"/> Refresh</button><button onClick={()=>void supabase.auth.signOut()} className="rounded-lg border px-3 py-2 text-xs font-semibold"><LogOut size={14} className="mr-1 inline"/> Sign out</button></div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div><h1 className="text-2xl font-bold tracking-tight">Submission moderation</h1><p className="mt-1 text-sm text-slate-500">Review real employer submissions. Free listings publish after approval; paid listings wait for verified payment.</p></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[["Needs review",counts.pending,Clock3],["Awaiting payment",counts.payment,ShieldCheck],["Published",counts.published,CheckCircle2]].map(([label,value,Icon]:any)=><div key={label} className="rounded-xl border bg-white p-4"><div className="flex items-center justify-between text-xs text-slate-500">{label}<Icon size={17}/></div><p className="mt-2 text-2xl font-bold">{value}</p></div>)}
      </div>
      {error&&<div role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {message&&<div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      <div className="mt-6 flex flex-wrap gap-2">{[["pending_review","Needs review"],["approved_awaiting_payment","Awaiting payment"],["published","Published"],["rejected","Rejected"],["all","All records"]].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} className={`rounded-full px-4 py-2 text-xs font-semibold ${filter===value?"bg-slate-900 text-white":"border bg-white text-slate-600"}`}>{label}</button>)}</div>
      <section className="mt-4 overflow-hidden rounded-xl border bg-white">
        {loading?<div className="p-10 text-center text-sm text-slate-500">Loading secure moderation queue…</div>:visible.length===0?<div className="p-10 text-center text-sm text-slate-500">No submissions in this view.</div>:<div className="divide-y">{visible.map(row=><div key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{row.job_title}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold">{statusLabel[row.status]||row.status}</span></div><p className="mt-1 text-xs text-slate-500">{row.company_name} · {row.reference_code} · {row.package_tier}</p><p className="mt-1 text-xs text-slate-400">{row.employer_email} · {new Date(row.submitted_at).toLocaleString()}</p></div><button onClick={()=>{setSelected(row);setNotes(row.review_notes||"");}} className="rounded-lg border px-4 py-2 text-xs font-bold">Review details</button></div>)}</div>}
      </section>
      {selected&&<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="my-6 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">{selected.reference_code} · {selected.package_tier}</p><h2 className="mt-2 text-xl font-bold">{selected.job_title}</h2><p className="mt-1 text-sm text-slate-500">{selected.company_name} · {selected.location}</p></div><button onClick={()=>setSelected(null)} className="text-sm text-slate-500">Close</button></div>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p><b>Employer:</b> {selected.employer_name}</p><p><b>Email:</b> {selected.employer_email}</p><p><b>Category:</b> {selected.category}</p><p><b>Work type:</b> {selected.employment_type}</p><p><b>Company website:</b> {selected.company_website||"Not supplied"}</p><p><b>Apply URL:</b> <a className="text-blue-700 underline" href={selected.apply_url} target="_blank" rel="noreferrer">Open application link</a></p></div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Job description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selected.description}</p></div>
        {selected.status==="pending_review"&&<><label className="mt-5 block text-xs font-bold">Internal review notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000} rows={3} className="mt-2 w-full rounded-lg border p-3 text-sm" placeholder="Record checks or reasons for rejection…"/></label><div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row"><button disabled={busy} onClick={()=>void review("reject")} className="rounded-lg border border-rose-200 px-4 py-3 text-xs font-bold text-rose-700 disabled:opacity-50"><XCircle size={15} className="mr-1 inline"/> Reject</button><button disabled={busy} onClick={()=>void review("approve")} className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy?"Saving…":selected.package_tier==="standard"?"Approve & publish free listing":"Approve & request payment"}</button></div></>}
        {selected.status!=="pending_review"&&<div className="mt-5 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">This record is read-only in the current moderation stage. {selected.status==="approved_awaiting_payment"?"Secure PayPal checkout is the next integration step.":""}</div>}
      </div></div>}
    </main>
  </div>;
}
