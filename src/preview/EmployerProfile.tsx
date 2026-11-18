import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Building2, Camera, Globe2, ImagePlus, LoaderCircle, LogOut, Save, ShieldCheck, UploadCloud } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Profile = {
  company_name: string;
  company_website: string;
  company_description: string;
  company_location: string;
  contact_email: string;
  company_logo_url: string | null;
  company_cover_image_url: string | null;
};

const emptyProfile: Profile = {
  company_name: '', company_website: '', company_description: '',
  company_location: '', contact_email: '', company_logo_url: null,
  company_cover_image_url: null,
};

export default function EmployerProfile() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        window.location.replace('/?experience=employer-auth');
        return;
      }
      const { data, error: requestError } = await supabase.functions.invoke('employer-profile', {
        body: { action: 'get' },
      });
      if (!active) return;
      if (requestError) setError(requestError.message || 'Unable to load your company profile.');
      else if (data?.account) {
        setProfile({
          company_name: data.account.company_name || '',
          company_website: data.account.company_website || '',
          company_description: data.account.company_description || '',
          company_location: data.account.company_location || '',
          contact_email: data.account.contact_email || '',
          company_logo_url: data.account.company_logo_url || null,
          company_cover_image_url: data.account.company_cover_image_url || null,
        });
      } else setError(data?.error || 'Your company profile could not be found.');
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  function change(field: keyof Profile, value: string) {
    setProfile(current => ({ ...current, [field]: value }));
  }

  async function uploadBrandImage(kind: 'logo' | 'cover', event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(''); setNotice('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Please choose a JPG, PNG or WebP image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Please choose an image smaller than 5 MB.'); return; }
    setUploading(kind);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error('Please sign in again before uploading.');
      const userId = sessionData.session.user.id;
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
      const path = userId + '/' + kind + '-' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('employer-branding').upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from('employer-branding').getPublicUrl(path).data.publicUrl;
      const field = kind === 'logo' ? 'company_logo_url' : 'company_cover_image_url';
      const { data, error: saveError } = await supabase.functions.invoke('employer-profile', { body: { action: 'update', profile: { [field]: publicUrl } } });
      if (saveError || !data?.account) {
        await supabase.storage.from('employer-branding').remove([path]);
        throw new Error(data?.error || saveError?.message || 'The image uploaded, but could not be attached to your profile.');
      }
      setProfile(current => ({ ...current, [field]: publicUrl }));
      setNotice(kind === 'logo' ? 'Your company logo has been uploaded and saved.' : 'Your company cover image has been uploaded and saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'We could not upload that image.'); }
    finally { setUploading(null); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const { data, error: requestError } = await supabase.functions.invoke('employer-profile', {
      body: {
        action: 'update',
        profile: {
          company_name: profile.company_name.trim(),
          company_website: profile.company_website.trim(),
          company_description: profile.company_description.trim(),
          company_location: profile.company_location.trim(),
          contact_email: profile.contact_email.trim(),
        },
      },
    });
    if (requestError) setError(requestError.message || 'We could not save your changes.');
    else if (data?.account) {
      setProfile(current => ({ ...current, ...data.account }));
      setNotice('Your company profile has been saved securely.');
    } else setError(data?.error || 'We could not save your company profile.');
    setSaving(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace('/?experience=employer-auth');
  }

  return (
    <div className="planetai-nexora min-h-screen bg-[#f7f8f6] text-[#17243a]">
      <header className="border-b border-[#e2e8e1] bg-white">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#183c32] text-white"><Globe2 size={20}/></span><span><b className="block text-sm tracking-[-.05em]">PLANETAI</b><small className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#8997aa]">Employer workspace</small></span></a>
          <button onClick={signOut} className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b] hover:text-[#285c4b]"><LogOut size={14}/> Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8">
        <a href="/?experience=employer-auth" className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b] hover:text-[#285c4b]"><ArrowLeft size={14}/> Account</a>
        <div className="mt-7 grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
          <section>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e0d7] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#47745c]"><ShieldCheck size={14}/> Private company profile</span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.055em]">Make your company stand out.</h1>
            <p className="mt-4 text-sm leading-7 text-[#77847b]">Build a trusted company presence for candidates. Your details are saved to your authenticated employer workspace.</p>
            <div className="mt-7 rounded-2xl border border-[#e2e8e1] bg-white p-5">
              <Building2 size={21} className="text-[#47745c]"/>
              <p className="mt-3 text-sm font-bold">Your brand, your story</p>
              <p className="mt-1 text-xs leading-6 text-[#8b978e]">Upload your official company logo and a wide cover image, then add the details candidates need to know.</p>
            </div>
          </section>
          <section className="rounded-3xl border border-[#e2e8e1] bg-white p-6 shadow-[0_24px_80px_rgba(28,52,84,.06)] sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#47745c]">Company settings</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Company profile</h2><p className="mt-2 text-xs leading-6 text-[#8b978e]">Only your authenticated workspace owner can update these details.</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f1f5fb] text-[#47745c]"><Building2 size={20}/></span></div>
            {loading ? <div className="flex items-center gap-2 py-12 text-sm text-[#77847b]"><LoaderCircle className="animate-spin" size={17}/> Loading your saved company profile…</div> : (
              <>
              <div className="mt-7 space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-[#52627a]">Company cover image</span><span className="text-[10px] text-[#9aa49d]">Wide banner · up to 5 MB</span></div>
                  <div className="relative flex min-h-[170px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#cbd7e6] bg-[#f5f8fc]">
                    {profile.company_cover_image_url ? <img src={profile.company_cover_image_url} alt="Company cover" className="absolute inset-0 h-full w-full object-cover"/> : <div className="px-5 text-center"><ImagePlus className="mx-auto text-[#819087]" size={28}/><p className="mt-3 text-xs font-semibold text-[#52627a]">Add a company banner</p><p className="mt-1 text-[10px] text-[#9aa49d]">Show candidates your workplace, team or brand.</p></div>}
                    <button type="button" onClick={()=>coverInput.current?.click()} disabled={uploading!==null} className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-[10px] font-bold text-[#285c4b] shadow-lg disabled:opacity-50">{uploading==='cover'?<LoaderCircle className="animate-spin" size={13}/>:<Camera size={13}/>} {profile.company_cover_image_url?'Change cover':'Upload cover image'}</button>
                  </div>
                  <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>uploadBrandImage('cover',e)}/>
                </div>
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e2e8e1] p-4">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#e2e8e1] bg-[#f5f8fc]">{profile.company_logo_url?<img src={profile.company_logo_url} alt="Company logo" className="h-full w-full object-contain"/>:<Building2 className="text-[#9aa49d]" size={26}/>}</div>
                  <div className="min-w-[160px] flex-1"><p className="text-xs font-semibold text-[#52627a]">Company logo</p><p className="mt-1 text-[10px] leading-5 text-[#9aa49d]">Square or transparent logo · JPG, PNG or WebP.</p><button type="button" onClick={()=>logoInput.current?.click()} disabled={uploading!==null} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#d7e0d7] px-3 py-2 text-[10px] font-bold text-[#47745c] disabled:opacity-50">{uploading==='logo'?<LoaderCircle className="animate-spin" size={13}/>:<UploadCloud size={13}/>} {profile.company_logo_url?'Replace logo':'Upload company logo'}</button></div>
                  <input ref={logoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>uploadBrandImage('logo',e)}/>
                </div>
              </div>
              <form onSubmit={save} className="mt-8 space-y-5 border-t border-[#edf0ec] pt-7">
                <label className="block"><span className="mb-2 block text-xs font-semibold text-[#52627a]">Company name *</span><input required minLength={2} maxLength={100} value={profile.company_name} onChange={e=>change('company_name',e.target.value)} className="w-full rounded-xl border border-[#d7e0d7] px-4 py-3 text-sm outline-none transition focus:border-[#54806b] focus:ring-4 focus:ring-[#54806b]/10"/></label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-xs font-semibold text-[#52627a]">Company website</span><input type="url" maxLength={255} placeholder="https://yourcompany.com" value={profile.company_website} onChange={e=>change('company_website',e.target.value)} className="w-full rounded-xl border border-[#d7e0d7] px-4 py-3 text-sm outline-none focus:border-[#54806b] focus:ring-4 focus:ring-[#54806b]/10"/></label>
                  <label className="block"><span className="mb-2 block text-xs font-semibold text-[#52627a]">Headquarters / location</span><input maxLength={120} placeholder="City, Country" value={profile.company_location} onChange={e=>change('company_location',e.target.value)} className="w-full rounded-xl border border-[#d7e0d7] px-4 py-3 text-sm outline-none focus:border-[#54806b] focus:ring-4 focus:ring-[#54806b]/10"/></label>
                </div>
                <label className="block"><span className="mb-2 block text-xs font-semibold text-[#52627a]">Public contact email</span><input type="email" maxLength={254} placeholder="careers@yourcompany.com" value={profile.contact_email} onChange={e=>change('contact_email',e.target.value)} className="w-full rounded-xl border border-[#d7e0d7] px-4 py-3 text-sm outline-none focus:border-[#54806b] focus:ring-4 focus:ring-[#54806b]/10"/></label>
                <label className="block"><span className="mb-2 block text-xs font-semibold text-[#52627a]">About your company</span><textarea rows={6} maxLength={2000} placeholder="Tell candidates what your company does, what you value, and why people enjoy working with your team…" value={profile.company_description} onChange={e=>change('company_description',e.target.value)} className="w-full resize-y rounded-xl border border-[#d7e0d7] px-4 py-3 text-sm leading-6 outline-none focus:border-[#54806b] focus:ring-4 focus:ring-[#54806b]/10"/></label>
                <div className="flex items-center justify-between gap-3 border-t border-[#edf0ec] pt-5"><p className="text-[10px] text-[#9aa49d]">{profile.company_description.length}/2000 characters</p><button type="submit" disabled={saving || uploading!==null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#183c32] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#285c4b] disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={15}/> : <Save size={15}/>} {saving ? 'Saving…' : 'Save company profile'}</button></div>
              </form>
              </>
            )}
            {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p>}
            {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">{notice}</p>}
          </section>
        </div>
      </main>
    </div>
  );
}
