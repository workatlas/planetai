import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, Globe2, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function JobSeekerPasswordReset() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const [recoveryReady, setRecoveryReady] = useState(params.has('code') || hash.get('type') === 'recovery');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) setRecoveryReady(true);
    });
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      if (data.session && (params.has('code') || hash.get('type') === 'recovery')) setRecoveryReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match. Please check both fields.');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');
      setConfirmPassword('');
      setMessage('Your password has been updated successfully. You can now sign in with your new password.');
      await supabase.auth.signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not update your password. Request a fresh reset link and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#17243a]">
      <header className="border-b border-[#e4eaf2] bg-white"><div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8"><a href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#172b49] text-white"><Globe2 size={20}/></span><span><b className="block text-sm tracking-[-.05em]">PLANETAI</b><small className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#8997aa]">Secure account recovery</small></span></a><a href="/?experience=job-seeker-auth" className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b] hover:text-[#244f91]"><ArrowLeft size={14}/> Back to sign in</a></div></header>
      <main className="mx-auto flex min-h-[calc(100vh-76px)] max-w-xl items-center px-5 py-12">
        <section className="w-full rounded-3xl border border-[#e4eaf2] bg-white p-7 shadow-[0_24px_80px_rgba(28,52,84,.08)] sm:p-9">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf3fb] text-[#315a91]"><KeyRound size={22}/></span>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[.16em] text-[#315a91]"><ShieldCheck className="mr-1 inline" size={13}/> Password recovery</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="mt-2 text-xs leading-6 text-[#8795aa]">Create a new password for your PLANETAI job seeker account.</p>
          {recoveryReady && !message ? <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65748b]">New password</span><span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa8ba]" size={15}/><input type={showPassword?'text':'password'} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} maxLength={72} placeholder="At least 8 characters" className="w-full rounded-xl border border-[#dce5f0] bg-white py-3 pl-11 pr-12 text-xs outline-none focus:border-[#5277aa] focus:ring-4 focus:ring-[#5277aa]/10"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8795aa]">{showPassword?<EyeOff size={15}/>:<Eye size={15}/>}</button></span></label>
            <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65748b]">Confirm new password</span><span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa8ba]" size={15}/><input type={showConfirm?'text':'password'} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={8} maxLength={72} placeholder="Re-enter your new password" className="w-full rounded-xl border border-[#dce5f0] bg-white py-3 pl-11 pr-12 text-xs outline-none focus:border-[#5277aa] focus:ring-4 focus:ring-[#5277aa]/10"/><button type="button" onClick={()=>setShowConfirm(v=>!v)} aria-label={showConfirm?'Hide confirmation password':'Show confirmation password'} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8795aa]">{showConfirm?<EyeOff size={15}/>:<Eye size={15}/>}</button></span>{confirmPassword && password!==confirmPassword && <span className="mt-2 block text-[10px] text-rose-600">Passwords do not match yet.</span>}</label>
            <p className="text-[10px] leading-5 text-[#8795aa]">Use at least 8 characters. Choose a password you do not use on other websites.</p>
            <button type="submit" disabled={busy || password!==confirmPassword} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#172b49] px-4 py-3.5 text-xs font-bold text-white hover:bg-[#24446e] disabled:cursor-not-allowed disabled:opacity-60">{busy&&<LoaderCircle className="animate-spin" size={15}/>} {busy?'Updating password…':'Update password securely'}</button>
          </form> : !message ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">This reset link is missing, expired, or already used. Return to sign in and request a new password reset email.</div> : null}
          {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p>}
          {message&&<div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-800">{message}<a href="/?experience=job-seeker-auth" className="mt-3 inline-flex font-bold underline">Return to sign in</a></div>}
          <p className="mt-7 border-t border-[#edf1f6] pt-5 text-[10px] leading-5 text-[#9aa8ba]">Password changes are processed by Supabase Auth. PLANETAI does not store your password in its application database.</p>
        </section>
      </main>
    </div>
  );
}
