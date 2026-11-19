import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { PlanetAILogo } from '../components/PlanetAILogo';
import { supabase } from '../lib/supabase';

export default function EmployerPasswordReset() {
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setRecoveryReady(true);
        setCheckingRecovery(false);
      }
    });
    // Do not treat an ordinary signed-in session as proof of a password-reset
    // link. Only the PASSWORD_RECOVERY auth event unlocks this form.
    const timeout = window.setTimeout(() => {
      if (active) setCheckingRecovery(false);
    }, 12000);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!recoveryReady) {
      setError('Request a fresh password reset link before changing your password.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');
      setConfirmPassword('');
      setRecoveryReady(false);
      await supabase.auth.signOut();
      setMessage('Your password has been updated. You can now sign in with your new password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not update your password. Request a fresh reset link and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="planetai-nexora min-h-screen bg-[#f7f8f6] text-[#17243a]">
      <header className="border-b border-[#e2e8e1] bg-white">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#183c32] text-white"><PlanetAILogo className="h-9 w-9"/></span><span><b className="block text-sm tracking-[-.05em]">PLANETAI</b><small className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#8997aa]">Secure employer recovery</small></span></a>
          <a href="/?experience=employer-auth&mode=signin" className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b] hover:text-[#285c4b]"><ArrowLeft size={14}/> Back to sign in</a>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-76px)] max-w-xl items-center px-5 py-12">
        <section className="w-full rounded-3xl border border-[#e2e8e1] bg-white p-7 shadow-[0_24px_80px_rgba(28,52,84,.08)] sm:p-9">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf5ef] text-[#47745c]"><KeyRound size={22}/></span>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[.16em] text-[#47745c]"><ShieldCheck className="mr-1 inline" size={13}/> Password recovery</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="mt-2 text-xs leading-6 text-[#8b978e]">Your password can only be changed after Supabase verifies your one-time recovery link.</p>
          {checkingRecovery ? <div role="status" className="mt-6 rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] p-4 text-xs leading-6 text-[#52675b]">Verifying your secure reset link…</div> : recoveryReady && !message ? <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65736b]">New password</span><span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa49d]" size={15}/><input type={showPassword?'text':'password'} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} maxLength={72} placeholder="At least 8 characters" className="w-full rounded-xl border border-[#d7e0d7] bg-white py-3 pl-11 pr-12 text-xs outline-none focus:border-[#54806b] focus:ring-4 focus:ring-[#54806b]/10"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8b978e]">{showPassword?<EyeOff size={15}/>:<Eye size={15}/>}</button></span></label>
            <label className="block"><span className="mb-2 block text-[10px] font-bold text-[#65736b]">Confirm new password</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={8} maxLength={72} placeholder="Re-enter your new password" className="w-full rounded-xl border border-[#d7e0d7] bg-white px-4 py-3 text-xs outline-none focus:border-[#54806b] focus:ring-4 focus:ring-[#54806b]/10"/>{confirmPassword && password!==confirmPassword && <span className="mt-2 block text-[10px] text-rose-600">Passwords do not match yet.</span>}</label>
            <button type="submit" disabled={busy || password!==confirmPassword} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#183c32] px-4 py-3.5 text-xs font-bold text-white hover:bg-[#285c4b] disabled:cursor-not-allowed disabled:opacity-60">{busy&&<LoaderCircle className="animate-spin" size={15}/>} {busy?'Updating password…':'Update password securely'}</button>
          </form> : !message ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">This reset link is missing, expired, or already used. Return to sign in and request a new password reset email.</div> : null}
          {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p>}
          {message&&<div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-800">{message}<a href="/?experience=employer-auth&mode=signin" className="mt-3 inline-flex font-bold underline">Return to employer sign in</a></div>}
          <p className="mt-7 border-t border-[#edf0ec] pt-5 text-[10px] leading-5 text-[#9aa49d]">Password changes are handled by Supabase Auth. PLANETAI never stores your password in its application database.</p>
        </section>
      </main>
    </div>
  );
}
