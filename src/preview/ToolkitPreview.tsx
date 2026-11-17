import React, {useEffect, useMemo, useState} from 'react';
import {ArrowLeft, BriefcaseBusiness, Check, CircleDollarSign, Clock3, Coffee, Globe2, Play, Plus, RotateCcw, Sparkles, Square, Timer, Trash2} from 'lucide-react';

type FocusMode = 'focus' | 'short' | 'long';
type Project = {id: string; name: string; client: string; budget: number; done: boolean; createdAt: string};

const MODE_SECONDS: Record<FocusMode, number> = {focus: 25 * 60, short: 5 * 60, long: 15 * 60};
const MODE_LABEL: Record<FocusMode, string> = {focus: 'Focus session', short: 'Short break', long: 'Long break'};
const STORAGE_KEY = 'planetai_toolkit_projects_v1';

function readProjects(): Project[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string') : [];
  } catch {
    return [];
  }
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export default function ToolkitPreview() {
  const [section, setSection] = useState<'focus' | 'freelance'>('focus');
  const [mode, setMode] = useState<FocusMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(MODE_SECONDS.focus);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);

  const [hourlyRate, setHourlyRate] = useState('25');
  const [hoursPerWeek, setHoursPerWeek] = useState('30');
  const [platformFee, setPlatformFee] = useState('10');
  const [monthlyCosts, setMonthlyCosts] = useState('50');

  const [projects, setProjects] = useState<Project[]>(readProjects);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectBudget, setProjectBudget] = useState('');

  const currentDuration = mode === 'focus' ? focusMinutes * 60 : mode === 'short' ? breakMinutes * 60 : MODE_SECONDS.long;
  const progress = currentDuration > 0 ? (currentDuration - secondsLeft) / currentDuration : 0;

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          if (mode === 'focus') {
            const nextCount = completedSessions + 1;
            setCompletedSessions(nextCount);
            const nextMode: FocusMode = nextCount % 4 === 0 ? 'long' : 'short';
            setMode(nextMode);
            return nextMode === 'long' ? MODE_SECONDS.long : breakMinutes * 60;
          }
          setMode('focus');
          return focusMinutes * 60;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, mode, focusMinutes, breakMinutes, completedSessions]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch { /* local storage may be unavailable */ }
  }, [projects]);

  const earnings = useMemo(() => {
    const rate = Math.max(0, Number(hourlyRate) || 0);
    const hours = Math.max(0, Number(hoursPerWeek) || 0);
    const fee = Math.min(100, Math.max(0, Number(platformFee) || 0));
    const costs = Math.max(0, Number(monthlyCosts) || 0);
    const gross = rate * hours * 4.33;
    const net = gross * (1 - fee / 100) - costs;
    return {gross, net, annual: net * 12, effectiveRate: hours > 0 ? net / (hours * 4.33) : 0};
  }, [hourlyRate, hoursPerWeek, platformFee, monthlyCosts]);

  const chooseMode = (next: FocusMode) => {
    setRunning(false);
    setMode(next);
    setSecondsLeft(next === 'focus' ? focusMinutes * 60 : next === 'short' ? breakMinutes * 60 : MODE_SECONDS.long);
  };

  const resetTimer = () => {
    setRunning(false);
    setSecondsLeft(currentDuration);
  };

  const addProject = (event: React.FormEvent) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) return;
    setProjects((items) => [{id: `p-${Date.now()}`, name: name.slice(0, 80), client: clientName.trim().slice(0, 60), budget: Math.max(0, Number(projectBudget) || 0), done: false, createdAt: new Date().toISOString()}, ...items].slice(0, 30));
    setProjectName('');
    setClientName('');
    setProjectBudget('');
  };

  const money = (value: number) => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(value);

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#1c3026]">
      <header className="sticky top-0 z-30 border-b border-[#e4e9e1] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <a href={window.location.pathname} className="flex items-center gap-3" aria-label="PLANETAI home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#172b49] text-white"><Globe2 size={20}/></span>
            <span><b className="block text-[16px] tracking-[-.06em]">PLANET<span className="text-[#39836a]">AI</span></b><small className="block text-[9px] font-semibold uppercase tracking-[.18em] text-[#87948a]">Work & career toolkit</small></span>
          </a>
          <a href={window.location.pathname} className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] px-4 py-2.5 text-[11px] font-bold text-[#53675a] transition hover:border-[#aebfae]"><ArrowLeft size={14}/> Main marketplace</a>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#63856c]">Free tools for getting work done</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.055em] sm:text-4xl">Make time for the work that matters.</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748b]">A practical workspace for focused work and independent professionals. Your project notes stay in this browser on this device.</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-[#e4eaf2] pb-4">
          <button onClick={() => setSection('focus')} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-bold transition ${section === 'focus' ? 'bg-[#172b49] text-white' : 'bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#b5c5b6]'}`}><Timer size={15}/> Focus timer</button>
          <button onClick={() => setSection('freelance')} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-bold transition ${section === 'freelance' ? 'bg-[#172b49] text-white' : 'bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#b5c5b6]'}`}><BriefcaseBusiness size={15}/> Freelancer toolkit</button>
        </div>

        {section === 'focus' ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-[28px] border border-[#e4eaf2] bg-white p-6 shadow-[0_18px_50px_rgba(29,55,39,.05)] sm:p-9">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#94a2b8]">Pomodoro workspace</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{MODE_LABEL[mode]}</h2></div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4ed] px-3 py-2 text-[10px] font-bold text-[#53745b]"><Sparkles size={13}/> {completedSessions} completed</span>
              </div>
              <div className="mx-auto mt-9 grid h-[250px] w-[250px] place-items-center rounded-full sm:h-[290px] sm:w-[290px]" style={{background: `conic-gradient(#3d75c6 ${progress * 360}deg, #edf1eb 0deg)`}}>
                <div className="grid h-[218px] w-[218px] place-items-center rounded-full bg-white sm:h-[254px] sm:w-[254px]">
                  <div className="text-center"><p className="font-mono text-5xl font-semibold tracking-[-.06em] tabular-nums text-[#172b49] sm:text-6xl">{formatTime(secondsLeft)}</p><p className="mt-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#8b988e]">{running ? 'Stay in the zone' : 'Ready when you are'}</p></div>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {(['focus','short','long'] as FocusMode[]).map((item) => <button key={item} onClick={() => chooseMode(item)} className={`rounded-full px-4 py-2.5 text-[10px] font-bold ${mode === item ? 'bg-[#eaf1fb] text-[#315a91]' : 'text-[#7c8a80] hover:bg-[#f4f6f2]'}`}>{item === 'focus' ? 'Focus' : item === 'short' ? 'Short break' : 'Long break'}</button>)}
              </div>
              <div className="mt-5 flex justify-center gap-3">
                <button onClick={() => setRunning((value) => !value)} className="inline-flex min-w-[142px] items-center justify-center gap-2 rounded-full bg-[#172b49] px-7 py-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#315a91]">{running ? <Square size={14}/> : <Play size={14}/>} {running ? 'Pause' : 'Start focus'}</button>
                <button onClick={resetTimer} aria-label="Reset timer" className="grid h-12 w-12 place-items-center rounded-full border border-[#e2e8f0] text-[#65776a] hover:bg-[#f5f7f3]"><RotateCcw size={16}/></button>
              </div>
            </section>
            <div className="space-y-6">
              <section className="rounded-[24px] border border-[#e4eaf2] bg-white p-6">
                <div className="flex items-center gap-2"><Clock3 size={17} className="text-[#63856c]"/><h3 className="text-sm font-bold">Session settings</h3></div>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <label className="text-[11px] font-semibold text-[#64748b]">Focus minutes<input type="number" min="1" max="90" value={focusMinutes} onChange={(e) => {const v = Math.min(90, Math.max(1, Number(e.target.value) || 1));setFocusMinutes(v);if(mode === 'focus' && !running) setSecondsLeft(v * 60);}} className="mt-2 w-full rounded-xl border border-[#e4eaf2] bg-[#f8faff] px-3 py-3 text-sm font-bold text-[#294334] outline-none focus:border-[#93ad98]"/></label>
                  <label className="text-[11px] font-semibold text-[#64748b]">Break minutes<input type="number" min="1" max="30" value={breakMinutes} onChange={(e) => {const v = Math.min(30, Math.max(1, Number(e.target.value) || 1));setBreakMinutes(v);if(mode === 'short' && !running) setSecondsLeft(v * 60);}} className="mt-2 w-full rounded-xl border border-[#e4eaf2] bg-[#f8faff] px-3 py-3 text-sm font-bold text-[#294334] outline-none focus:border-[#93ad98]"/></label>
                </div>
                <p className="mt-4 text-[10px] leading-5 text-[#94a2b8]">Choose a focus interval that suits your work. The timer runs locally in your browser.</p>
              </section>
              <section className="rounded-[24px] border border-[#e4eaf2] bg-[#eef4ed] p-6">
                <div className="flex items-center gap-2"><Coffee size={17} className="text-[#54775d]"/><h3 className="text-sm font-bold text-[#2c4935]">A simple rhythm</h3></div>
                <div className="mt-5 space-y-3 text-[11px] text-[#637568]"><p className="flex items-center justify-between"><span>Focus session</span><b>{focusMinutes} min</b></p><p className="flex items-center justify-between"><span>Short break</span><b>{breakMinutes} min</b></p><p className="flex items-center justify-between"><span>Long break</span><b>15 min</b></p></div>
                <p className="mt-5 border-t border-[#dce7f5] pt-4 text-[10px] leading-5 text-[#64748b]">After each focus session, take a short break. Give yourself a longer reset after a few rounds.</p>
              </section>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
            <section className="rounded-[26px] border border-[#e4eaf2] bg-white p-6 shadow-[0_18px_50px_rgba(29,55,39,.04)] sm:p-8">
              <div className="flex items-center gap-2"><CircleDollarSign size={18} className="text-[#63856c]"/><h2 className="text-lg font-semibold tracking-tight">Hourly rate calculator</h2></div>
              <p className="mt-2 text-xs leading-5 text-[#829087]">Estimate monthly freelance income after platform fees and recurring costs.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  {label:'Hourly rate (USD)',value:hourlyRate,set:setHourlyRate},
                  {label:'Hours per week',value:hoursPerWeek,set:setHoursPerWeek},
                  {label:'Platform fee (%)',value:platformFee,set:setPlatformFee},
                  {label:'Monthly costs (USD)',value:monthlyCosts,set:setMonthlyCosts},
                ].map((field) => <label key={field.label} className="text-[11px] font-semibold text-[#64748b]">{field.label}<input type="number" min="0" step="any" value={field.value} onChange={(e) => field.set(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e4eaf2] bg-[#f8faff] px-3 py-3 text-sm font-bold text-[#294334] outline-none focus:border-[#93ad98]"/></label>)}
              </div>
              <div className="mt-6 rounded-2xl bg-[#172b49] p-5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#c5d6ee]">Estimated monthly take-home</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-.05em]">{money(earnings.net)}</p>
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-4"><div><p className="text-[9px] text-[#c5d6ee]">Gross monthly</p><p className="mt-1 text-sm font-bold">{money(earnings.gross)}</p></div><div><p className="text-[9px] text-[#c5d6ee]">Annual estimate</p><p className="mt-1 text-sm font-bold">{money(earnings.annual)}</p></div><div className="col-span-2"><p className="text-[9px] text-[#c5d6ee]">Effective hourly after estimated fees and costs</p><p className="mt-1 text-sm font-bold">{money(earnings.effectiveRate)} / hr</p></div></div>
              </div>
              <p className="mt-4 text-[10px] leading-5 text-[#94a2b8]">Planning estimate only. Actual taxes, unpaid time, currency conversion and client payment terms are not included.</p>
            </section>

            <section className="rounded-[26px] border border-[#e4eaf2] bg-white p-6 shadow-[0_18px_50px_rgba(29,55,39,.04)] sm:p-8">
              <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><BriefcaseBusiness size={18} className="text-[#63856c]"/><h2 className="text-lg font-semibold tracking-tight">Simple project tracker</h2></div><p className="mt-2 text-xs text-[#829087]">Keep a lightweight list of your current client work.</p></div><span className="rounded-full bg-[#eef4ed] px-3 py-2 text-[10px] font-bold text-[#55745d]">{projects.length} projects</span></div>
              <form onSubmit={addProject} className="mt-6 grid gap-3 sm:grid-cols-2">
                <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name *" maxLength={80} required className="min-h-11 rounded-xl border border-[#e4eaf2] bg-[#f8faff] px-3 text-xs outline-none focus:border-[#93ad98]"/>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client (optional)" maxLength={60} className="min-h-11 rounded-xl border border-[#e4eaf2] bg-[#f8faff] px-3 text-xs outline-none focus:border-[#93ad98]"/>
                <input value={projectBudget} onChange={(e) => setProjectBudget(e.target.value)} type="number" min="0" step="any" placeholder="Project budget (USD)" className="min-h-11 rounded-xl border border-[#e4eaf2] bg-[#f8faff] px-3 text-xs outline-none focus:border-[#93ad98]"/>
                <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#172b49] px-4 text-xs font-bold text-white transition hover:bg-[#315a91]"><Plus size={15}/> Add project</button>
              </form>
              <div className="mt-5 divide-y divide-[#edf1f6]">
                {projects.length === 0 ? <div className="rounded-2xl border border-dashed border-[#dce5f0] bg-[#f8faff] px-5 py-9 text-center"><BriefcaseBusiness size={22} className="mx-auto text-[#94a2b8]"/><p className="mt-3 text-xs font-bold text-[#506457]">Your project list is empty</p><p className="mt-1 text-[10px] text-[#98a39a]">Add a project to start keeping track.</p></div> : projects.map((project) => <div key={project.id} className="flex items-center gap-3 py-4"><button onClick={() => setProjects((items) => items.map((item) => item.id === project.id ? {...item, done: !item.done} : item))} aria-label={project.done ? 'Mark project active' : 'Mark project complete'} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${project.done ? 'border-[#91b49a] bg-[#edf5ed] text-[#4b7755]' : 'border-[#dfe7de] text-transparent hover:border-[#9db59f]'}`}><Check size={15}/></button><div className="min-w-0 flex-1"><p className={`truncate text-xs font-bold ${project.done ? 'text-[#98a39a] line-through' : 'text-[#334b3b]'}`}>{project.name}</p><p className="mt-1 truncate text-[10px] text-[#909c92]">{project.client || 'Independent project'} · {project.budget > 0 ? money(project.budget) : 'Budget not set'}</p></div><span className={`text-[9px] font-bold ${project.done ? 'text-[#72907a]' : 'text-[#9a8a5b]'}`}>{project.done ? 'Done' : 'In progress'}</span><button onClick={() => setProjects((items) => items.filter((item) => item.id !== project.id))} aria-label="Delete project" className="grid h-8 w-8 place-items-center rounded-full text-[#a0aaa1] hover:bg-[#f8efed] hover:text-[#a45c50]"><Trash2 size={14}/></button></div>)}
              </div>
              <p className="mt-4 border-t border-[#edf1f6] pt-4 text-[10px] leading-5 text-[#94a2b8]">Projects are saved in this browser only. They are not uploaded or synced to an account.</p>
            </section>
          </div>
        )}
        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-[#e5eaf2] bg-white px-5 py-4"><div className="mt-0.5 text-[#66856d]"><Globe2 size={16}/></div><p className="text-[10px] leading-5 text-[#859188]"><b className="text-[#5b6e60]">PLANETAI Toolkit preview.</b> These tools run locally in your browser. No account is required, and project information stays on this device. This is an early development preview, not yet part of the live website.</p></div>
      </main>
    </div>
  );
}
