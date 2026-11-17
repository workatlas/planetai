import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Eye, EyeOff, Globe2, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Mode = 'signup' | 'signin' | 'forgot';

export default function JobSeekerAuth() {
  const [mode, setMode] = useState<Mode>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
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
    if (session) window.location.replace('/?experience=job-seeker-dashboard');
  }, [session]);

  function switchMode(next: Mode) {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setMessage('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + '/?experience=job-seeker-reset',
        });
        if (resetError) throw resetError;
        setMessage('If an account exists for that email, a password reset link is on its way. Please check your inbox and spam folder.');
        return;
      }

      if (mode === 'signup') {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
        if (password !== confirmPassword) throw new Error('Your passwords do not match. Please check both fields.');
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin + '/?experience=job-seeker-auth',
            data: { account_type: 'job_seeker', full_name: fullName.trim() },
          },
        });
        if (authError) throw authError;
        if (data.session) {
          window.location.replace('/?experience=job-seeker-dashboard');
          return;
        }
        setMessage('Your account request is ready. Check your inbox to confirm your email, then return here to sign in.');
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        if (data.session) window.location.replace('/?experience=job-seeker-dashboard');
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
    else setSession(null);
  }

  const passwordField = (value: string, onChange: (value: string) => void, visible: boolean, toggle: () => void, autoComplete: string, placeholder = 'At least 8 characters') => (
    <span className="relative block">
      <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa8ba]" size={15}/>
      <input type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={e => onChange(e.target.value)} required minLength={8} maxLength={72} placeholder={placeholder} className="w-full rounded-xl border border-[#dce5f0] bg-white py-3 pl-11 pr-12 text-xs outline-none transition focus:border-[#5277aa] focus:ring-4 focus:ring-[#5277aa]/10"/>
      <button type="button" onClick={toggle} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8795aa]">{visible ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
    </span>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#17243a]">
      <header className="border-b border-[#e4eaf2] bg-white">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#172b49] text-white"><Globe2 size={20}/></span><span><b className="block text-sm tracking-[-.05em]">PLANETAI</b><small className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#8997aa]">Your next opportunity starts here</small></span></a>
          <a href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b] hover:text-[#244f91]"><ArrowLeft size={14}/> Browse jobs</a>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
        <section className="hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dce7f5] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#315a91]"><ShieldCheck size={14}/> Free job seeker account</span>
          <h1 className="mt-7 max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-.06em]">Your next chapter.<br/><span className="text-[#5277aa]">Built with PLANETAI.</span></h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#718096]">Create a free career space to keep your professional profile together, prepare for opportunities and make your job search easier.</p>
          <div className="mt-10 grid max-w-lg gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e4eaf2] bg-white p-5"><UserRound className="text-[#315a91]" size={20}/><p className="mt-4 text-sm font-bold">Your career profile</p><p className="mt-1 text-xs leading-5 text-[#8795aa]">Keep your headline, skills and career summary in one private place.</p></div>
            <div className="rounded-2xl border border-[#e4eaf2] bg-white p-5"><BriefcaseBusiness className="text-[#315a91]" size={20}/><p className="mt-4 text-sm font-bold">Tools stay free</p><p className="mt-1 text-xs leading-5 text-[#8795aa]">Explore career tools and job opportunities without an application fee.</p></div>
          </div>
          <p className="mt-7 text-xs font-semibold text-[#5277aa]">No payment required to create an account or apply for a job.</p>
        </section>
        <section className="mx-auto w-full max-w-md rounded-3xl border border-[#e4eaf2] bg-white p-6 shadow-[0_24px_80px_rgba(28,52,84,.08)] sm:p-8">
          {session ? (
            <div className="py-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={23}/></span><h2 className="mt-5 text-2xl font-semibold">You're signed in.</h2><p className="mt-2 text-sm text-[#718096]">Opening your private career dashboard…</p><button onClick={signOut} disabled={busy} className="mt-6 text-xs font-bold text-[#315a91]">Sign out</button></div>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#315a91]">{mode === 'signup' ? 'Job seeker registration' : mode === 'signin' ? 'Job seeker sign in' : 'Account recovery'}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{mode === 'signup' ? 'Create your free account' : mode === 'signin' ? 'Welcome back' : 'Reset your password'}</h2>
              <p className="mt-2 text-xs leading-6 text-[#8795aa]">{mode === 'signup' ? 'Build your career profile and access your personal PLANETAI space.' : mode === 'signin' ? 'Sign in to continue to your career dashboard.' : 'Enter your account email and we will send a secure password reset link if an account is registered.'}</p>
              <form onSubmit={submit} className="mt-7 space-y-4">
                {mode === 'signup' && <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65748b]">Full name</span><input value={fullName} onChange={e=>setFullName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" placeholder="Your name" className="w-full rounded-xl border border-[#dce5f0] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#5277aa] focus:ring-4 focus:ring-[#5277aa]/10"/></label>}
                <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65748b]">Email address</span><span className="relative block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa8ba]" size={15}/><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} placeholder="you@example.com" className="w-full rounded-xl border border-[#dce5f0] bg-white py-3 pl-11 pr-4 text-xs outline-none transition focus:border-[#5277aa] focus:ring-4 focus:ring-[#5277aa]/10"/></span></label>
                {mode !== 'forgot' && <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65748b]">Password</span>{passwordField(password,setPassword,showPassword,()=>setShowPassword(v=>!v),mode==='signup'?'new-password':'current-password')}</label>}
                {mode === 'signup' && <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65748b]">Confirm password</span>{passwordField(confirmPassword,setConfirmPassword,showConfirmPassword,()=>setShowConfirmPassword(v=>!v),'new-password','Re-enter your password')}{confirmPassword && password !== confirmPassword && <span className="mt-2 block text-[10px] text-rose-600">Passwords do not match yet.</span>}</label>}
                {mode === 'signin' && <div className="-mt-1 text-right"><button type="button" onClick={()=>switchMode('forgot')} className="text-[11px] font-semibold text-[#315a91] hover:underline">Forgot password?</button></div>}
                {mode === 'signup' && <p className="text-[10px] leading-5 text-[#8795aa]">Use at least 8 characters. Your password and confirmation must match.</p>}
                <button type="submit" disabled={busy || (mode==='signup' && password!==confirmPassword)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#172b49] px-4 py-3.5 text-xs font-bold text-white transition hover:bg-[#24446e] disabled:cursor-not-allowed disabled:opacity-60">{busy&&<LoaderCircle className="animate-spin" size={15}/>} {busy?'Please wait…':mode==='signup'?'Create free job seeker account':mode==='signin'?'Sign in securely':'Send password reset link'}</button>
              </form>
              <p className="mt-6 text-center text-xs text-[#8795aa]">{mode==='signup'?'Already have an account?':mode==='signin'?'New to PLANETAI?':'Remembered your password?'} <button onClick={()=>switchMode(mode==='signup'?'signin':'signin')} className="font-bold text-[#315a91] hover:underline">{mode==='signup'?'Sign in':'Back to sign in'}</button></p>
              {mode==='forgot' && <p className="mt-3 text-center"><button onClick={()=>switchMode('signup')} className="text-[11px] font-semibold text-[#315a91] hover:underline">Create a free account</button></p>}
            </>
          )}
          {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p>}
          {message&&<p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">{message}</p>}
          <p className="mt-7 border-t border-[#edf1f6] pt-5 text-[10px] leading-5 text-[#9aa8ba]">Your password is managed securely by Supabase Auth. Your profile is private and controlled by your account. You can still browse jobs and apply without registering.</p>
        </section>
      </main>
    </div>
  );
}
