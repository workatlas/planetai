import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { RefreshCw, ShieldCheck, CheckCircle2, XCircle, Clock3, LogOut, Eye, EyeOff, LockKeyhole } from "lucide-react";

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
  const [loginEmail,setLoginEmail]=useState("planetai.operations@gmail.com");
  const [password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [authBusy,setAuthBusy]=useState(false);
  const [resetBusy,setResetBusy]=useState(false);

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

  const signIn=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    setAuthBusy(true);setError("");setMessage("");
    try {
      const {error:authError}=await supabase.auth.signInWithPassword({
        email:loginEmail.trim(),
        password,
      });
      if(authError) throw authError;
      setPassword("");
      await load();
    } catch(err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please check your credentials and try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const requestPasswordReset=async()=>{
    setResetBusy(true);setError("");setMessage("");
    try {
      const {error:resetError}=await supabase.auth.resetPasswordForEmail(loginEmail.trim(),{
        redirectTo:window.location.origin + "/?experience=job-seeker-reset&returnTo=admin-moderation",
      });
      if(resetError) throw resetError;
      setMessage("If this address belongs to an active PLANETAI account, a password reset link has been sent. Check your inbox and spam folder.");
    } catch(err) {
      setError(err instanceof Error ? err.message : "We could not request a password reset. Please try again later.");
    } finally {
      setResetBusy(false);
    }
  };

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
  if(!email&&!loading) return <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ShieldCheck size={25}/></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-blue-700">PLANETAI · Secure administrator access</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Sign in to moderation</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Use the administrator account authorized for PLANETAI. Access is verified by the server after sign-in.</p>
        <form onSubmit={signIn} className="mt-7 space-y-4">
          <label className="block text-xs font-semibold text-slate-600">Administrator email
            <input type="email" autoComplete="username" required maxLength={254} value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"/>
          </label>
          <label className="block text-xs font-semibold text-slate-600">Password
            <span className="relative mt-2 block">
              <LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-12 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"/>
              <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button>
            </span>
          </label>
          <button type="submit" disabled={authBusy} className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">{authBusy?"Verifying access…":"Sign in securely"}</button>
        </form>
        <button type="button" onClick={()=>void requestPasswordReset()} disabled={resetBusy||!loginEmail.trim()} className="mt-4 w-full text-center text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50">{resetBusy?"Sending reset link…":"Forgot your password? Send a reset link"}</button>
        {error&&<p role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <p className="mt-6 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-400">Only accounts explicitly authorized by PLANETAI can access moderation. A successful sign-in alone does not grant administrator privileges.</p>
      </div>
    </div>
  </div>;

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
        {selected.status==="ready_to_publish"&&<div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-xs text-amber-900">This free listing was approved but its publication status needs recovery. You can safely retry; the server checks for an existing public job before creating one.</p><button disabled={busy} onClick={()=>void review("approve")} className="mt-3 rounded-lg bg-slate-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy?"Retrying…":"Retry publication"}</button></div>}
        {selected.status!=="pending_review"&&selected.status!=="ready_to_publish"&&<div className="mt-5 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">This record is read-only in the current moderation stage. {selected.status==="approved_awaiting_payment"?"Secure PayPal checkout is the next integration step.":""}</div>}
      </div></div>}
    </main>
  </div>;
}
