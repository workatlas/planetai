import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Eye, EyeOff, Globe2, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

export default function EmployerAuth() {
  const [mode, setMode] = useState<Mode>(() => new URLSearchParams(window.location.search).get('mode') === 'signin' ? 'signin' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setWorkspaceName('');
      return;
    }
    let active = true;
    async function loadWorkspace() {
      setWorkspaceBusy(true);
      setError('');
      try {
        const metadataName = typeof session?.user.user_metadata?.company_name === 'string'
          ? session.user.user_metadata.company_name
          : '';
        const fallbackName = session?.user.email?.split('@')[0] || 'My company';
        const { data, error: workspaceError } = await supabase.functions.invoke('employer-workspace', {
          body: { company_name: (metadataName || fallbackName).trim().slice(0, 100) },
        });
        if (workspaceError) throw workspaceError;
        if (!data?.account?.company_name) throw new Error('Your workspace could not be created. Please try signing in again.');
        if (active) setWorkspaceName(data.account.company_name);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load your employer workspace.');
      } finally {
        if (active) setWorkspaceBusy(false);
      }
    }
    loadWorkspace();
    return () => { active = false; };
  }, [session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin + '/?experience=employer-auth',
            data: { account_type: 'employer', company_name: company.trim() },
          },
        });
        if (authError) throw authError;
        if (data.session) {
          setSession(data.session);
          setMessage('Your employer account is ready. We are creating your private company workspace.');
        } else {
          setMessage('Check your inbox to confirm your email address. After confirmation, return here and sign in to create your private company workspace.');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        setSession(data.session);
        setMessage('You are securely signed in. Loading your private employer workspace…');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not complete that request. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setBusy(false);
    if (signOutError) setError(signOutError.message);
    else {
      setSession(null);
      setWorkspaceName('');
      setMessage('You have been signed out.');
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#17243a]">
      <header className="border-b border-[#e2e8e1] bg-white">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#183c32] text-white"><Globe2 size={20}/></span>
            <span><b className="block text-sm tracking-[-.05em]">PLANETAI</b><small className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#8997aa]">Global talent marketplace</small></span>
          </a>
          <a href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b] hover:text-[#285c4b]"><ArrowLeft size={14}/> Back to jobs</a>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
        <section className="hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e0d7] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#47745c]"><ShieldCheck size={14}/> Secure employer access</span>
          <h1 className="mt-7 max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-.06em]">Build your team.<br/><span className="text-[#54806b]">Move with confidence.</span></h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#77847b]">Create your employer account to prepare job listings, manage candidates and access your company workspace in one place.</p>
          <div className="mt-10 grid max-w-lg gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e2e8e1] bg-white p-5"><BriefcaseBusiness className="text-[#47745c]" size={20}/><p className="mt-4 text-sm font-bold">Hiring workspace</p><p className="mt-1 text-xs leading-5 text-[#8b978e]">Keep company jobs and hiring activity together.</p></div>
            <div className="rounded-2xl border border-[#e2e8e1] bg-white p-5"><LockKeyhole className="text-[#47745c]" size={20}/><p className="mt-4 text-sm font-bold">Private by design</p><p className="mt-1 text-xs leading-5 text-[#8b978e]">Your account access is protected by Supabase authentication and database ownership checks.</p></div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-[#e2e8e1] bg-white p-6 shadow-[0_24px_80px_rgba(28,52,84,.08)] sm:p-8">
          {session ? (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={23}/></span>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[.16em] text-[#47745c]">Authenticated employer</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Welcome to PLANETAI.</h2>
              <p className="mt-3 break-all text-sm text-[#77847b]">{session.user.email}</p>
              <div className="mt-6 rounded-2xl border border-[#d7e0d7] bg-[#f4f6f2] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#819087]">Your company workspace</p>
                {workspaceBusy ? <p className="mt-2 flex items-center gap-2 text-xs text-[#52675b]"><LoaderCircle className="animate-spin" size={14}/> Setting up your private workspace…</p>
                  : workspaceName ? <><p className="mt-2 text-sm font-bold text-[#285c4b]">{workspaceName}</p><a href="/?experience=employer-profile" className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#183c32] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#285c4b]">Open company profile</a><a href="/?experience=employer-payments" className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-[#d7e0d7] bg-white px-4 py-3 text-xs font-bold text-[#47745c] transition hover:bg-[#f4f6f2]">Manage listings & payments</a></>
                  : <p className="mt-2 text-xs leading-5 text-[#52675b]">Workspace setup is waiting for a successful database response.</p>}
              </div>
              <button onClick={signOut} disabled={busy || workspaceBusy} className="mt-6 w-full rounded-xl border border-[#d7e0d7] px-4 py-3 text-xs font-bold text-[#47745c] disabled:opacity-50">{busy ? 'Signing out…' : 'Sign out'}</button>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#47745c]">{mode === 'signup' ? 'Employer registration' : 'Employer sign in'}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
              <p className="mt-2 text-xs leading-6 text-[#8b978e]">{mode === 'signup' ? 'Start with a secure account. We will create your private company workspace after email verification.' : 'Sign in to continue to your employer workspace.'}</p>
              <form onSubmit={submit} className="mt-7 space-y-4">
                {mode === 'signup' && <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65736b]">Company name</span><input value={company} onChange={e=>setCompany(e.target.value)} required minLength={2} maxLength={100} placeholder="Your company" className="w-full rounded-xl border border-[#d7e0d7] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#54806b] focus:ring-4 focus:ring-[#54806b]/10"/></label>}
                <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65736b]">Work email</span><span className="relative block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa49d]" size={15}/><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} placeholder="you@company.com" className="w-full rounded-xl border border-[#d7e0d7] bg-white py-3 pl-11 pr-4 text-xs outline-none transition focus:border-[#54806b] focus:ring-4 focus:ring-[#54806b]/10"/></span></label>
                <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65736b]">Password</span><span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa49d]" size={15}/><input type={showPassword?'text':'password'} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} maxLength={72} placeholder="At least 8 characters" className="w-full rounded-xl border border-[#d7e0d7] bg-white py-3 pl-11 pr-12 text-xs outline-none transition focus:border-[#54806b] focus:ring-4 focus:ring-[#54806b]/10"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8b978e]">{showPassword?<EyeOff size={15}/>:<Eye size={15}/>}</button></span></label>
                <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#183c32] px-4 py-3.5 text-xs font-bold text-white transition hover:bg-[#285c4b] disabled:cursor-not-allowed disabled:opacity-60">{busy&&<LoaderCircle className="animate-spin" size={15}/>} {busy?'Please wait…':mode==='signup'?'Create employer account':'Sign in securely'}</button>
              </form>
              <p className="mt-6 text-center text-xs text-[#8b978e]">{mode==='signup'?'Already have an account?':'New to PLANETAI?'} <button onClick={()=>{setMode(mode==='signup'?'signin':'signup');setError('');setMessage('')}} className="font-bold text-[#47745c] hover:underline">{mode==='signup'?'Sign in':'Create an account'}</button></p>
            </>
          )}
          {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p>}
          {message&&<p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">{message}</p>}
          <p className="mt-7 border-t border-[#edf0ec] pt-5 text-[10px] leading-5 text-[#9aa49d]">By continuing, you agree to use PLANETAI responsibly. Your account credentials are handled by Supabase Auth; PLANETAI never stores your password in its application tables.</p>
        </section>
      </main>
    </div>
  );
}
