import React, {useEffect, useMemo, useState} from 'react';
import {Check, Copy, Download, FileText, Printer, RotateCcw, ShieldCheck, Sparkles} from 'lucide-react';
import {sanitizeText} from '../utils/sanitize';

interface Props {
  targetRole: string; setTargetRole: (v: string) => void;
  targetCompany: string; setTargetCompany: (v: string) => void;
  skillsInput: string; setSkillsInput: (v: string) => void;
  jobDescInput: string; setJobDescInput: (v: string) => void;
  tailoredNotice?: string | null;
}
type Profile = {fullName:string;email:string;phone:string;location:string;headline:string;summary:string;experience:string;education:string;achievements:string};
const KEY='planetai_resume_studio_profile_v1';
const EMPTY:Profile={fullName:'',email:'',phone:'',location:'',headline:'',summary:'',experience:'',education:'',achievements:''};
function loadProfile():Profile {
  try { const raw=localStorage.getItem(KEY); if(!raw)return EMPTY; const p=JSON.parse(raw); return Object.fromEntries(Object.keys(EMPTY).map((k)=>[k,typeof p[k]==='string'?p[k]:''])) as Profile; } catch { return EMPTY; }
}
function esc(v:string){return v.replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
function htmlLines(v:string){return esc(v.trim()).replace(/\n/g,'<br/>');}
export const ResumeStudio:React.FC<Props>=({targetRole,setTargetRole,targetCompany,setTargetCompany,skillsInput,setSkillsInput,jobDescInput,setJobDescInput,tailoredNotice})=>{
  const [profile,setProfile]=useState<Profile>(loadProfile);
  const [tab,setTab]=useState<'resume'|'cover'>('resume');
  const [copied,setCopied]=useState(false);
  const [saved,setSaved]=useState(false);
  useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(profile));setSaved(true);const t=window.setTimeout(()=>setSaved(false),1300);return()=>window.clearTimeout(t);}catch{setSaved(false);}},[profile]);
  const update=(key:keyof Profile,value:string)=>setProfile((p)=>({...p,[key]:value}));
  const skills=useMemo(()=>skillsInput.split(/[,\n]/).map((s)=>sanitizeText(s,48)).filter(Boolean).slice(0,24),[skillsInput]);
  const role=sanitizeText(targetRole,120)||'Target position';
  const company=sanitizeText(targetCompany,100)||'Hiring team';
  const resumeText=useMemo(()=>[
    profile.fullName,[profile.email,profile.phone,profile.location].filter(Boolean).join(' | '),'',
    profile.headline||role,'','PROFESSIONAL SUMMARY',profile.summary,'','CORE SKILLS',skills.join(' • '),'',
    'PROFESSIONAL EXPERIENCE',profile.experience,'','EDUCATION',profile.education,'','SELECTED ACHIEVEMENTS',profile.achievements
  ].join('\n'),[profile,role,skills]);
  const coverText=useMemo(()=>{
    const intro=profile.summary.trim()||'My background and skills have prepared me to contribute to this role. I would welcome the opportunity to discuss how my experience aligns with your team’s needs.';
    const experience=profile.experience.trim()?'\n\nMy relevant experience includes:\n'+profile.experience.trim():'';
    const skillLine=skills.length?'\n\nMy key skills include '+skills.join(', ')+'.':'';
    const jd=sanitizeText(jobDescInput,900);
    const context=jd?'\n\nI am particularly interested in the role’s focus on '+jd.slice(0,420)+(jd.length>420?'…':''):'';
    return [profile.fullName,[profile.email,profile.phone,profile.location].filter(Boolean).join(' | '),'','Application for '+role,'','Dear '+company+' Hiring Team,','',
      'I am writing to express my interest in the '+role+' position at '+company+'. '+intro+experience+skillLine+context,'',
      'Thank you for considering my application. I would appreciate the opportunity to discuss how I could contribute to your team.','','Sincerely,',profile.fullName||'[Your name]'].join('\n');
  },[profile,role,company,skills,jobDescInput]);
  const activeText=tab==='resume'?resumeText:coverText;
  const body=tab==='resume'
    ?'<header><h1>'+esc(profile.fullName||'Your Name')+'</h1><p class="contact">'+esc([profile.email,profile.phone,profile.location].filter(Boolean).join(' · '))+'</p><h2 class="headline">'+esc(profile.headline||role)+'</h2></header>'+
      '<section><h2>Professional Summary</h2><p>'+htmlLines(profile.summary||'Add your professional summary.')+'</p></section>'+
      '<section><h2>Core Skills</h2><p>'+esc(skills.join(' · ')||'Add your skills.')+'</p></section>'+
      '<section><h2>Professional Experience</h2><p>'+htmlLines(profile.experience||'Add your actual work experience, projects or internships.')+'</p></section>'+
      '<section><h2>Education</h2><p>'+htmlLines(profile.education||'Add your education or training.')+'</p></section>'+
      '<section><h2>Selected Achievements</h2><p>'+htmlLines(profile.achievements||'Add achievements, certifications or projects.')+'</p></section>'
    :'<h1>Application for '+esc(role)+'</h1><p class="contact">'+esc(profile.fullName)+' · '+esc([profile.email,profile.phone,profile.location].filter(Boolean).join(' · '))+'</p><div class="letter">'+htmlLines(coverText)+'</div>';
  const exportHtml='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PLANETAI '+(tab==='resume'?'Resume':'Cover Letter')+'</title><style>*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1f2933;max-width:820px;margin:48px auto;padding:0 48px;line-height:1.55;font-size:11pt}h1{font-size:25pt;letter-spacing:-.5px;margin:0 0 5px}h2{font-size:11pt;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #ccd5ce;padding-bottom:5px;margin:24px 0 9px;color:#315b45}.contact{font-size:9.5pt;color:#53635a;margin:0 0 18px}.headline{font-size:13pt;text-transform:none;letter-spacing:0;border:0;margin:14px 0}.letter{white-space:normal;margin-top:24px}p{margin:5px 0 12px}@media print{body{margin:0 auto;padding:0 12mm}@page{size:A4;margin:16mm}}</style></head><body>'+body+'</body></html>';
  const download=()=>{const blob=new Blob([exportHtml],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='planetai-'+(tab==='resume'?'resume':'cover-letter')+'.html';document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const print=()=>{const w=window.open('','_blank');if(!w){download();return;}w.document.open();w.document.write(exportHtml);w.document.close();w.focus();window.setTimeout(()=>w.print(),350);};
  const copy=async()=>{try{await navigator.clipboard.writeText(activeText);setCopied(true);window.setTimeout(()=>setCopied(false),1500);}catch{setCopied(false);}};
  const field='w-full min-h-[42px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2.5 text-sm text-[#25372e] placeholder:text-[#9aa49d] focus:border-[#54806b] focus:outline-none';
  const label='mb-1.5 block text-xs font-semibold text-[#65736b]';
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e2e8e1] bg-[#e9eee8] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><div className="flex items-center gap-2 text-[#47745c]"><Sparkles size={16}/><span className="text-[10px] font-bold uppercase tracking-[.18em]">PLANETAI Career Studio</span></div><h2 className="mt-2 text-xl font-bold text-[#1d3028] sm:text-2xl">Build an application that sounds like you.</h2><p className="mt-1 max-w-xl text-xs leading-5 text-[#77847b]">Create a clean, ATS-friendly resume and a separate role-specific cover letter using your real information. No invented work history or qualifications.</p></div>
      <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/25 px-3 py-2 text-[10px] font-semibold text-[#47745c]"><ShieldCheck size={14}/> Private on this device</div>
    </div>
    {tailoredNotice&&<div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-xs font-medium text-[#47745c]"><Check className="mr-2 inline h-4 w-4"/>{tailoredNotice}</div>}
    <div className="grid items-start gap-5 xl:grid-cols-[.92fr_1.08fr]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-[#e2e8e1] bg-white p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold text-[#1d3028]">01 · Your details</h3><span className="text-[10px] text-[#9aa49d]">Contact & target</span></div><div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={label}>Full name</span><input className={field} value={profile.fullName} onChange={e=>update('fullName',e.target.value)} placeholder="Your full name" maxLength={90}/></label>
          <label><span className={label}>Email</span><input className={field} type="email" value={profile.email} onChange={e=>update('email',e.target.value)} placeholder="you@example.com" maxLength={120}/></label>
          <label><span className={label}>Phone</span><input className={field} value={profile.phone} onChange={e=>update('phone',e.target.value)} placeholder="+1 555 000 0000" maxLength={40}/></label>
          <label className="sm:col-span-2"><span className={label}>City / Country</span><input className={field} value={profile.location} onChange={e=>update('location',e.target.value)} placeholder="City, Country" maxLength={100}/></label>
          <label className="sm:col-span-2"><span className={label}>Professional headline</span><input className={field} value={profile.headline} onChange={e=>update('headline',e.target.value)} placeholder="e.g. Customer Support Specialist" maxLength={120}/></label>
          <label><span className={label}>Target role</span><input className={field} value={targetRole} onChange={e=>setTargetRole(e.target.value)} placeholder="Job title" maxLength={120}/></label>
          <label><span className={label}>Company</span><input className={field} value={targetCompany} onChange={e=>setTargetCompany(e.target.value)} placeholder="Company name" maxLength={100}/></label>
        </div></section>
        <section className="rounded-2xl border border-[#e2e8e1] bg-white p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold text-[#1d3028]">02 · Your professional story</h3><span className="text-[10px] text-[#9aa49d]">Use real details</span></div><div className="space-y-4">
          <label className="block"><span className={label}>Professional summary</span><textarea className={field+' min-h-[100px]'} value={profile.summary} onChange={e=>update('summary',e.target.value)} placeholder="Describe your background, strengths and the value you bring." maxLength={1200}/></label>
          <label className="block"><span className={label}>Work experience, internships or projects</span><textarea className={field+' min-h-[150px]'} value={profile.experience} onChange={e=>update('experience',e.target.value)} placeholder={'Job title — Company — Dates\n• What you did and tools used\n• Results or responsibilities (numbers only when accurate)'} maxLength={4000}/></label>
          <label className="block"><span className={label}>Education & training</span><textarea className={field+' min-h-[90px]'} value={profile.education} onChange={e=>update('education',e.target.value)} placeholder="Degree, school, dates, certifications or training." maxLength={1600}/></label>
          <label className="block"><span className={label}>Achievements & certifications</span><textarea className={field+' min-h-[90px]'} value={profile.achievements} onChange={e=>update('achievements',e.target.value)} placeholder="Awards, measurable results, portfolio projects or certificates." maxLength={1600}/></label>
          <label className="block"><span className={label}>Skills (separate with commas)</span><textarea className={field+' min-h-[76px]'} value={skillsInput} onChange={e=>setSkillsInput(e.target.value)} placeholder="Communication, Excel, Customer Support, Python..." maxLength={800}/></label>
        </div></section>
        <section className="rounded-2xl border border-[#e2e8e1] bg-white p-5 sm:p-6"><h3 className="mb-3 text-sm font-bold text-[#1d3028]">03 · Target job description</h3><textarea className={field+' min-h-[120px]'} value={jobDescInput} onChange={e=>setJobDescInput(e.target.value)} placeholder="Paste the job description to tailor your cover letter." maxLength={3000}/><p className="mt-2 text-[10px] leading-5 text-[#9aa49d]">Use this to guide relevance. Review the final wording and confirm every detail is accurate.</p></section>
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#e2e8e1] bg-white">
        <div className="border-b border-[#e2e8e1] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-[#1d3028]">Live document preview</h3><p className="mt-1 text-[10px] text-[#9aa49d]">{saved?'Saved privately in this browser':'Editing your document'}</p></div><div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d7e0d7] px-3 text-[10px] font-semibold text-[#40534a] hover:bg-[#e9eee8]">{copied?<Check size={13}/>:<Copy size={13}/>} {copied?'Copied':'Copy text'}</button>
          <button type="button" onClick={download} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d7e0d7] px-3 text-[10px] font-semibold text-[#40534a] hover:bg-[#e9eee8]"><Download size={13}/> Export HTML</button>
          <button type="button" onClick={print} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#183c32] px-3 text-[10px] font-bold text-white hover:bg-[#285c4b]"><Printer size={13}/> Print / PDF</button>
        </div></div><div className="mt-4 flex gap-2" role="tablist" aria-label="Document preview"><button type="button" role="tab" aria-selected={tab==='resume'} onClick={()=>setTab('resume')} className={'rounded-lg px-4 py-2 text-xs font-bold '+(tab==='resume'?'bg-[#183c32] text-white':'bg-[#f4f6f2] text-[#77847b] hover:text-[#1d3028]')}><FileText className="mr-1.5 inline h-3.5 w-3.5"/> Resume</button><button type="button" role="tab" aria-selected={tab==='cover'} onClick={()=>setTab('cover')} className={'rounded-lg px-4 py-2 text-xs font-bold '+(tab==='cover'?'bg-[#183c32] text-white':'bg-[#f4f6f2] text-[#77847b] hover:text-[#1d3028]')}>Cover letter</button></div></div>
        <div className="bg-[#dfe5e1] p-3 sm:p-5"><article className="planetai-resume-paper mx-auto min-h-[680px] max-w-[620px] bg-white px-6 py-8 text-[#26332c] shadow-xl sm:px-10 sm:py-10">
          {tab==='resume'?<><header className="border-b-2 border-[#355b45] pb-4"><h1 className="break-words text-2xl font-bold tracking-tight">{profile.fullName||'Your Name'}</h1><p className="mt-1 break-words text-[10px] text-[#65746a]">{[profile.email,profile.phone,profile.location].filter(Boolean).join(' · ')||'Email · Phone · City, Country'}</p><p className="mt-3 text-sm font-semibold text-[#355b45]">{profile.headline||role}</p></header><div className="space-y-5 pt-5">{[{title:'Professional Summary',body:profile.summary||'Your professional summary will appear here.'},{title:'Core Skills',body:skills.join(' · ')||'Add your skills to populate this section.'},{title:'Professional Experience',body:profile.experience||'Add real work experience, projects or internships.'},{title:'Education',body:profile.education||'Add education or training.'},{title:'Selected Achievements',body:profile.achievements||'Add achievements, certifications or projects.'}].map(item=><section key={item.title}><h4 className="mb-2 border-b border-[#dce4dd] pb-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#355b45]">{item.title}</h4><p className="whitespace-pre-wrap break-words text-[11px] leading-[1.7] text-[#35443a]">{item.body}</p></section>)}</div></>:<><h1 className="text-xl font-bold leading-tight">{role}</h1><p className="mt-2 text-[10px] text-[#65746a]">{profile.fullName||'Your Name'} · {[profile.email,profile.phone,profile.location].filter(Boolean).join(' · ')}</p><div className="mt-8 whitespace-pre-wrap break-words text-[11px] leading-[1.9] text-[#35443a]">{coverText}</div></>}
        </article></div>
        <div className="flex items-start gap-2 border-t border-[#e2e8e1] px-4 py-3 text-[10px] leading-5 text-[#9aa49d]"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#47745c]"/> Your profile is stored in this browser only. It is not sent to PLANETAI servers. Export a copy before clearing browser data or changing devices.</div>
      </section>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] px-4 py-3"><p className="text-[10px] leading-5 text-[#9aa49d]">Tip: use specific achievements and truthful results. The best resume is clear, relevant and verifiable.</p><button type="button" onClick={()=>{setProfile(EMPTY);setSkillsInput('');setJobDescInput('');setTargetRole('');setTargetCompany('');try{localStorage.removeItem(KEY);}catch{/* unavailable */}}} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#77847b] hover:text-[#1d3028]"><RotateCcw size={12}/> Clear profile</button></div>
  </div>;
};
