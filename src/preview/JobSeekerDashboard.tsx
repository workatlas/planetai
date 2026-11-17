import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Compass, FileText, Globe2, LoaderCircle, LogOut, Save, Sparkles, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

type JobSeekerProfile = {
  full_name: string;
  professional_headline: string;
  location: string;
  skills: string[];
  summary: string;
};

const emptyProfile: JobSeekerProfile = {
  full_name: '',
  professional_headline: '',
  location: '',
  skills: [],
  summary: '',
};

export default function JobSeekerDashboard() {
  const [profile, setProfile] = useState<JobSeekerProfile>(emptyProfile);
  const [skillsText, setSkillsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        window.location.replace('/?experience=job-seeker-auth');
        return;
      }
      setEmail(sessionData.session.user.email || '');
      const { data, error: profileError } = await supabase
        .from('job_seeker_profiles')
        .select('full_name, professional_headline, location, skills, summary')
        .eq('user_id', sessionData.session.user.id)
        .maybeSingle();
      if (!active) return;
      if (profileError) {
        setError(profileError.message.includes('job_seeker_profiles')
          ? 'Your career workspace database setup is awaiting deployment. Your account is safe; please try again after the setup is enabled.'
          : profileError.message);
      } else if (data) {
        const nextProfile = {
          full_name: data.full_name || '',
          professional_headline: data.professional_headline || '',
          location: data.location || '',
          skills: Array.isArray(data.skills) ? data.skills : [],
          summary: data.summary || '',
        };
        setProfile(nextProfile);
        setSkillsText(nextProfile.skills.join(', '));
      } else {
        setProfile({ ...emptyProfile, full_name: sessionData.session.user.user_metadata?.full_name || '' });
        setSkillsText('');
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  function change(field: keyof JobSeekerProfile, value: string) {
    setProfile(current => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      setError('Your session has expired. Please sign in again.');
      setSaving(false);
      return;
    }
    const skills = [...new Set(skillsText.split(',').map(item => item.trim()).filter(Boolean))].slice(0, 30);
    const payload = {
      user_id: sessionData.session.user.id,
      full_name: profile.full_name.trim(),
      professional_headline: profile.professional_headline.trim(),
      location: profile.location.trim(),
      skills,
      summary: profile.summary.trim(),
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await supabase.from('job_seeker_profiles').upsert(payload, { onConflict: 'user_id' });
    if (saveError) setError(saveError.message);
    else {
      setProfile(current => ({ ...current, skills }));
      setSkillsText(skills.join(', '));
      setNotice('Your private career profile has been saved.');
    }
    setSaving(false);
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else window.location.replace('/');
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#17243a]">
      <header className="border-b border-[#e4eaf2] bg-white">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#172b49] text-white"><Globe2 size={20}/></span><span><b className="block text-sm tracking-[-.05em]">PLANETAI</b><small className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#8997aa]">Job seeker workspace</small></span></a>
          <button onClick={signOut} className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b] hover:text-[#244f91]"><LogOut size={14}/> Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8">
        <a href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b] hover:text-[#244f91]"><ArrowLeft size={14}/> Back to jobs</a>
        <div className="mt-7 grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
          <section>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dce7f5] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#315a91]"><UserRound size={14}/> Free career workspace</span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.055em]">Your career, in one place.</h1>
            <p className="mt-4 text-sm leading-7 text-[#718096]">Create a profile that helps you prepare for opportunities. Your details are private until you choose to share them.</p>
            <div className="mt-7 grid gap-3">
              <a href="/" className="flex items-center gap-3 rounded-2xl border border-[#e4eaf2] bg-white p-4 hover:border-[#b8c9df]"><Compass className="text-[#315a91]" size={20}/><span><b className="block text-sm">Explore opportunities</b><small className="text-xs text-[#8795aa]">Browse jobs and apply without fees.</small></span></a>
              <a href="/?tab=ai-tools" className="flex items-center gap-3 rounded-2xl border border-[#e4eaf2] bg-white p-4 hover:border-[#b8c9df]"><Sparkles className="text-[#315a91]" size={20}/><span><b className="block text-sm">Free AI career tools</b><small className="text-xs text-[#8795aa]">Open PLANETAI and choose AI Tools from the main navigation.</small></span></a>
              <div className="flex items-center gap-3 rounded-2xl border border-[#e4eaf2] bg-white p-4"><FileText className="text-[#315a91]" size={20}/><span><b className="block text-sm">Resume & cover letter</b><small className="text-xs text-[#8795aa]">Prepare application documents with the free tools.</small></span></div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#e4eaf2] bg-white p-4"><BriefcaseBusiness className="text-[#315a91]" size={20}/><span><b className="block text-sm">Application tracking</b><small className="text-xs text-[#8795aa]">Account-linked application history is the next connection milestone.</small></span></div>
            </div>
          </section>
          <section className="rounded-3xl border border-[#e4eaf2] bg-white p-6 shadow-[0_24px_80px_rgba(28,52,84,.06)] sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#315a91]">Career settings</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Your profile</h2><p className="mt-2 text-xs leading-6 text-[#8795aa]">Signed in as {email || 'your account'}.</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f1f5fb] text-[#315a91]"><UserRound size={20}/></span></div>
            {loading ? <div className="flex items-center gap-2 py-12 text-sm text-[#718096]"><LoaderCircle className="animate-spin" size={17}/> Loading your private career profile…</div> : (
              <form onSubmit={save} className="mt-7 space-y-5">
                <label className="block"><span className="mb-2 block text-xs font-semibold text-[#52627a]">Full name *</span><input required minLength={2} maxLength={100} value={profile.full_name} onChange={e=>change('full_name',e.target.value)} className="w-full rounded-xl border border-[#dce5f0] px-4 py-3 text-sm outline-none transition focus:border-[#5277aa] focus:ring-4 focus:ring-[#5277aa]/10"/></label>
                <label className="block"><span className="mb-2 block text-xs font-semibold text-[#52627a]">Professional headline</span><input maxLength={140} placeholder="e.g. AI data specialist | Python developer" value={profile.professional_headline} onChange={e=>change('professional_headline',e.target.value)} className="w-full rounded-xl border border-[#dce5f0] px-4 py-3 text-sm outline-none focus:border-[#5277aa] focus:ring-4 focus:ring-[#5277aa]/10"/></label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-xs font-semibold text-[#52627a]">Location</span><input maxLength={120} placeholder="City, Country or Remote" value={profile.location} onChange={e=>change('location',e.target.value)} className="w-full rounded-xl border border-[#dce5f0] px-4 py-3 text-sm outline-none focus:border-[#5277aa] focus:ring-4 focus:ring-[#5277aa]/10"/></label>
                  <label className="block"><span className="mb-2 block text-xs font-semibold text-[#52627a]">Skills</span><input maxLength={1000} placeholder="Python, research, writing…" value={skillsText} onChange={e=>setSkillsText(e.target.value)} className="w-full rounded-xl border border-[#dce5f0] px-4 py-3 text-sm outline-none focus:border-[#5277aa] focus:ring-4 focus:ring-[#5277aa]/10"/></label>
                </div>
                <label className="block"><span className="mb-2 block text-xs font-semibold text-[#52627a]">Career summary</span><textarea rows={5} maxLength={1200} placeholder="Share a short introduction about your experience, strengths and the work you are looking for." value={profile.summary} onChange={e=>change('summary',e.target.value)} className="w-full resize-y rounded-xl border border-[#dce5f0] px-4 py-3 text-sm outline-none focus:border-[#5277aa] focus:ring-4 focus:ring-[#5277aa]/10"/></label>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f6] pt-5"><p className="text-[10px] leading-5 text-[#9aa8ba]">Your profile is private. You decide what to share with employers.</p><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#172b49] px-5 py-3 text-xs font-bold text-white hover:bg-[#24446e] disabled:opacity-60">{saving?<LoaderCircle className="animate-spin" size={14}/>:<Save size={14}/>} {saving?'Saving…':'Save profile'}</button></div>
              </form>
            )}
            {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p>}
            {notice&&<p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><CheckCircle2 size={14}/>{notice}</p>}
          </section>
        </div>
      </main>
    </div>
  );
}
