import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  Copy,
  Download,
  FileText,
  Mail,
  Mic,
  MicOff,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import {sanitizeText} from '../utils/sanitize';
import {ResumeStudio} from './ResumeStudio';
import {TOP_AI_ASSISTANTS} from './NewsDevToolsView';

type AIToolKey = 'resume' | 'email' | 'learning' | 'voice' | 'simulator';
type EmailTone = 'Professional' | 'Confident' | 'Polite Follow-Up';
type EmailTemplateType =
  | 'recruiter-reply'
  | 'interview-confirm'
  | 'follow-up';

export interface TailoredResumeDraft {
  role: string;
  company: string;
  skills: string;
  description: string;
  nonce: number;
}

export interface RequestedAITool {
  tool: AIToolKey;
  nonce: number;
  role?: string;
  company?: string;
  skills?: string;
  description?: string;
}

interface AIToolsViewProps {
  tailoredDraft?: TailoredResumeDraft | null;
  requestedTool?: RequestedAITool | null;
}

const CAREER_TARGET_STORAGE_KEY = 'planetai_career_target_v1';

interface SavedCareerTarget {
  role: string;
  company: string;
  skills: string;
  description: string;
}

function readSavedCareerTarget(): Partial<SavedCareerTarget> | null {
  try {
    const raw = window.localStorage.getItem(CAREER_TARGET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      role: typeof parsed.role === 'string' ? parsed.role : undefined,
      company: typeof parsed.company === 'string' ? parsed.company : undefined,
      skills: typeof parsed.skills === 'string' ? parsed.skills : undefined,
      description:
        typeof parsed.description === 'string' ? parsed.description : undefined,
    };
  } catch {
    return null;
  }
}

interface LearningGuide {
  id: string;
  prompt: string;
  category: string;
  summary: string;
  checklist: string[];
  avoid: string;
}

const LEARNING_GUIDES: LearningGuide[] = [
  {
    id: 'prompt-eval',
    prompt: 'AI Prompt Evaluation Rules',
    category: 'RLHF & Grading',
    summary:
      'Top platforms (Alignerr, Outlier, Scale AI) grade responses on instruction following, truthfulness, completeness, and tone before style.',
    checklist: [
      'Check every explicit and implicit constraint in the prompt (word count, format, JSON schema, exclusions).',
      'Verify factual claims independently; never trust confident-sounding model citations without checking.',
      'Penalize sycophancy or unnecessary disclaimers when the user asked a benign technical question.',
      'Write concise justification notes referencing exact model spans ("Response A failed constraint #2...").',
    ],
    avoid:
      'Do not mark a longer response as better if it introduces a single fabricated fact or misses a negative constraint.',
  },
  {
    id: 'annotation-tips',
    prompt: 'Data Annotation Quality Tips',
    category: 'Vision & Text QA',
    summary:
      'High-acceptance annotators on Visora, Welocalize, and Invisible Technologies maintain >92% audit accuracy by prioritizing edge-case consistency.',
    checklist: [
      'Zoom to 150-200% for bounding boxes and occlusion boundaries so edges sit tight within 2px.',
      'Read project taxonomy updates before every shift; edge-case definitions often change between batches.',
      'Flag ambiguous frames or corrupted audio rather than guessing labels blindly.',
      'Pace early tasks steadily—speed ramps naturally once muscle memory for hotkeys locks in.',
    ],
    avoid:
      'Avoid rushing calibration quizzes; failing initial QA thresholds typically locks project access for 14-30 days.',
  },
  {
    id: 'video-interviews',
    prompt: 'Passing AI Video Interviews',
    category: 'micro1 & Mercor',
    summary:
      'Automated screening interviews on micro1 and Mercor evaluate technical depth, crisp communication, and live reasoning structure.',
    checklist: [
      'State your architecture or approach in 15 seconds before diving into code or implementation details.',
      'Use concrete metrics and real stack names (e.g., "reduced p95 latency from 420ms to 110ms using Redis").',
      'Position your camera at eye level with front-facing daylight or soft lamp light and a quiet room.',
      'Think aloud calmly if asked to debug—AI interviewers score your troubleshooting process, not just final output.',
    ],
    avoid:
      'Avoid reading pre-written paragraphs verbatim; keep bullet notes off-screen so your cadence sounds natural.',
  },
  {
    id: 'audio-prosody',
    prompt: 'Audio & Voice Recording Standards',
    category: 'Babel Audio & Spout',
    summary:
      'Voice AI labs reject clips with room echo, mouth clicks, plosives, or clipped peaks above -1 dBFS.',
    checklist: [
      'Record in a soft-furnished room (curtains, carpet, closet baffle) 15-20 cm off-axis from your mic.',
      'Target average speaking peaks between -12 dB and -6 dB with a quiet noise floor below -50 dB.',
      'Wait 0.5 seconds of silence before speaking and after finishing your last word.',
      'Match natural conversational pacing—avoid monotone "news anchor" delivery unless requested.',
    ],
    avoid:
      'Do not apply heavy robotic noise-gate plugins that chop off consonant tails or breath inlets.',
  },
];

const VOICE_SCRIPTS: {title: string; context: string; text: string}[] = [
  {
    title: 'Conversational Customer Support (Babel Audio / Spout)',
    context: 'Natural, warm, unhurried pace · 15-20 seconds',
    text: '"Hi there, thanks for reaching out! I completely understand why that delayed update is frustrating. Let me pull up your order timeline right now so we can confirm the exact dispatch window together."',
  },
  {
    title: 'Technical Screening Intro (micro1 / Mercor)',
    context: 'Clear, confident engineering cadence · 20 seconds',
    text: '"Over the past three years, I have focused on building reliable TypeScript and Python data pipelines, writing automated evaluation harnesses, and reviewing production pull requests for latency and edge-case safety."',
  },
  {
    title: 'Everyday Dialogue & Audio Quality Check',
    context: 'Relaxed, conversational articulation · 15 seconds',
    text: '"Hey, good morning! I just double-checked my microphone and room setup so there is zero background echo. Whenever you are ready, let us walk through today\'s evaluation prompts together."',
  },
];

interface RubricScenario {
  id: string;
  dimension: string;
  prompt: string;
  responseA: string;
  responseB: string;
  winner: 'A' | 'B';
  explanation: string;
}

const RUBRIC_SCENARIOS: RubricScenario[] = [
  {
    id: 'sim-1',
    dimension: 'Factuality & Epistemic Honesty',
    prompt:
      'Summarize the exact release date and pricing of OpenAI GPT-6.',
    responseA:
      'GPT-6 was officially released on March 14, 2026 at $15 per million input tokens with native 10M context.',
    responseB:
      'I cannot verify a release date or official pricing for GPT-6—there is no confirmed public release or pricing schedule available to cite.',
    winner: 'B',
    explanation:
      'Response B avoids fabricating dates and pricing (hallucination is an automatic fail on Outlier, Alignerr, and Scale AI rubrics). Response A invents unverified release details confidently.',
  },
  {
    id: 'sim-2',
    dimension: 'Constraint & Format Compliance',
    prompt:
      'List exactly 3 remote productivity tips in valid JSON array format with keys "title" and "benefit". Do not include markdown prose.',
    responseA:
      '[{"title":"Timeboxing","benefit":"Protects deep-work blocks"},{"title":"Async Check-ins","benefit":"Reduces meeting fatigue"},{"title":"Dedicated Workspace","benefit":"Signals clear work-rest boundaries"}]',
    responseB:
      'Sure! Here are 3 great productivity tips for remote workers:\n1. Timeboxing helps protect focus.\n2. Async updates save time.\n3. Take short breaks every 90 minutes.',
    winner: 'A',
    explanation:
      'Response A strictly satisfies every negative and formatting constraint (valid JSON array, exact key names, zero surrounding prose). Response B fails the JSON format constraint.',
  },
  {
    id: 'sim-3',
    dimension: 'Code Correctness & Edge Cases',
    prompt:
      'Write a TypeScript helper that safely parses positive USD amounts from user input without returning NaN.',
    responseA:
      'export const parseUsd = (v: string) => parseFloat(v);',
    responseB:
      'export function parseUsd(v: string): number | null {\n  const n = Number(v.trim());\n  return Number.isFinite(n) && n > 0 ? n : null;\n}',
    winner: 'B',
    explanation:
      'Response B guards against NaN, Infinity, empty strings, and negative/zero values cleanly, whereas Response A returns NaN on invalid strings and accepts negative amounts.',
  },
];

function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text: string): boolean {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export const AIToolsView: React.FC<AIToolsViewProps> = ({
  tailoredDraft,
  requestedTool,
}) => {
  const [activeTool, setActiveTool] = useState<AIToolKey>('resume');

  // 1. Resume & Cover Letter Builder state
  const [savedCareerTarget] = useState(readSavedCareerTarget);
  const [targetRole, setTargetRole] = useState(
    savedCareerTarget?.role ?? 'Senior Python & TypeScript AI Code Reviewer'
  );
  const [targetCompany, setTargetCompany] = useState(
    savedCareerTarget?.company ?? 'micro1'
  );
  const [skillsInput, setSkillsInput] = useState(
    savedCareerTarget?.skills ??
      'Python, TypeScript, Unit Testing, Rubric Grading, Technical Writing'
  );
  const [jobDescInput, setJobDescInput] = useState(
    savedCareerTarget?.description ??
      'Evaluate and refactor production Python and TypeScript solutions, write clear step-by-step reasoning, and verify edge-case test coverage.'
  );
  const [tailoredNotice, setTailoredNotice] = useState<string | null>(null);
  const [copiedResume, setCopiedResume] = useState(false);

  useEffect(() => {
    if (!requestedTool) return;
    setActiveTool(requestedTool.tool);
    if (requestedTool.role) setTargetRole(sanitizeText(requestedTool.role, 120));
    if (requestedTool.company) setTargetCompany(sanitizeText(requestedTool.company, 80));
    if (requestedTool.skills) setSkillsInput(sanitizeText(requestedTool.skills, 200));
    if (requestedTool.description) setJobDescInput(sanitizeText(requestedTool.description, 600));
  }, [requestedTool]);

  // Keep the selected job context available when users move between workspaces.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        CAREER_TARGET_STORAGE_KEY,
        JSON.stringify({
          role: targetRole,
          company: targetCompany,
          skills: skillsInput,
          description: jobDescInput,
        })
      );
    } catch {
      // Keep the workspace usable when browser storage is unavailable.
    }
  }, [targetRole, targetCompany, skillsInput, jobDescInput]);

  // Sync incoming "Tailor Resume for This Role" shortcut from Job Details Modal
  useEffect(() => {
    if (!tailoredDraft) return;
    setActiveTool('resume');
    const cleanRole = sanitizeText(tailoredDraft.role, 120);
    const cleanCompany = sanitizeText(tailoredDraft.company, 80);
    const cleanSkills = sanitizeText(tailoredDraft.skills, 200);
    const cleanDesc = sanitizeText(tailoredDraft.description, 600);

    setTargetRole(cleanRole);
    setTargetCompany(cleanCompany);
    if (cleanSkills) setSkillsInput(cleanSkills);
    if (cleanDesc) setJobDescInput(cleanDesc);
    setTailoredNotice(`Tailored for ${cleanRole} at ${cleanCompany}`);
  }, [tailoredDraft]);

  // 2. Quick Reply Email Drafter state
  const [emailTemplate, setEmailTemplate] =
    useState<EmailTemplateType>('recruiter-reply');
  const [emailTone, setEmailTone] = useState<EmailTone>('Professional');
  const [recruiterName, setRecruiterName] = useState('Alex');
  const [emailRole, setEmailRole] = useState('AI Training Specialist');
  const [emailNotes, setEmailNotes] = useState(
    'Available 25 hrs/week async starting immediately.'
  );
  const [copiedEmail, setCopiedEmail] = useState(false);

  // 3. AI Learning Assistant state
  const [selectedGuideId, setSelectedGuideId] = useState<string>(
    LEARNING_GUIDES[0].id
  );
  const [learningQuery, setLearningQuery] = useState('');

  // 4. Voice Sample AI Prep state (Web Audio API)
  const [isRecording, setIsRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string>('');

  // 5. Interactive AI Evaluation Rubric Simulator state
  const [simulatorAnswers, setSimulatorAnswers] = useState<
    Record<string, 'A' | 'B'>
  >({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      stopVoiceResources();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const stopVoiceResources = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setMicLevel(0);
  };

  // Generated Resume Summary & Cover Letter (sanitized inputs)
  const generatedResumeDoc = useMemo(() => {
    const role = sanitizeText(targetRole, 120) || 'AI & Remote Specialist';
    const company = sanitizeText(targetCompany, 80) || 'your team';
    const skills = skillsInput
      .split(',')
      .map((s) => sanitizeText(s, 40))
      .filter(Boolean);
    const primarySkills =
      skills.slice(0, 4).join(', ') || 'AI Evaluation, Analytical Writing';
    const focusLine =
      sanitizeText(jobDescInput, 500) ||
      'delivering accurate model evaluations, structured rubrics, and reliable remote execution.';

    const summary = [
      `ATS PROFESSIONAL SUMMARY — ${role.toUpperCase()}`,
      `Results-driven ${role} experienced in ${primarySkills}. Proven track record in ${focusLine.charAt(0).toLowerCase() + focusLine.slice(1)} Adept at async remote collaboration, strict quality rubric adherence, and high-precision deliverable turnaround.`,
      '',
      `CORE SKILLS`,
      skills.length > 0
        ? skills.map((s) => `• ${s}`).join('\n')
        : '• AI Evaluation',
    ].join('\n');

    const coverLetter = [
      `COVER LETTER — ${role} at ${company}`,
      '',
      `Dear ${company} Hiring Team,`,
      '',
      `I am writing to express my interest in the ${role} opportunity. With hands-on experience in ${primarySkills}, I align closely with your focus on ${focusLine.slice(0, 180)}${focusLine.length > 180 ? '...' : ''}`,
      '',
      `In previous remote engagements, I consistently maintained top-tier accuracy scores while meeting tight async project milestones. My workflow emphasizes verifiable reasoning, edge-case testing, and clear written documentation.`,
      '',
      `I am ready to begin immediately and complete any calibration assessments required by ${company}. Thank you for your time and consideration.`,
      '',
      `Sincerely,`,
      `[Your Full Name]`,
    ].join('\n');

    return `${summary}\n\n----------------------------------------\n\n${coverLetter}`;
  }, [targetRole, targetCompany, skillsInput, jobDescInput]);

  // Generated Email Draft (sanitized inputs)
  const generatedEmail = useMemo(() => {
    const name = sanitizeText(recruiterName, 80) || 'Hiring Team';
    const role = sanitizeText(emailRole, 120) || 'the open role';
    const notes = sanitizeText(emailNotes, 300);

    const greeting =
      emailTone === 'Confident' ? `Hi ${name},` : `Dear ${name},`;

    let body = '';
    let subject = '';

    if (emailTemplate === 'recruiter-reply') {
      subject = `Application & Availability — ${role}`;
      if (emailTone === 'Professional') {
        body = `Thank you for reaching out regarding the ${role} position. I am very interested in contributing to your upcoming cohort.\n\n${notes ? `Key details: ${notes}\n\n` : ''}Please let me know the next steps or assessment link so I can proceed promptly.`;
      } else if (emailTone === 'Confident') {
        body = `Thanks for connecting about the ${role} role—this aligns directly with my core experience.\n\n${notes ? `${notes}\n\n` : ''}Send over the calibration task or interview link whenever ready, and I will complete it right away.`;
      } else {
        body = `Thank you kindly for sharing details about the ${role} opportunity. I would be grateful for the chance to be considered.\n\n${notes ? `For your reference: ${notes}\n\n` : ''}Looking forward to hearing from you at your convenience.`;
      }
    } else if (emailTemplate === 'interview-confirm') {
      subject = `Interview Confirmation — ${role}`;
      if (emailTone === 'Confident') {
        body = `Confirmed—I will be ready for the ${role} session as scheduled.\n\n${notes ? `Notes: ${notes}\n\n` : ''}Looking forward to walking through my work and technical approach.`;
      } else {
        body = `I am writing to confirm my attendance for the ${role} interview.\n\n${notes ? `Additional details: ${notes}\n\n` : ''}Thank you for coordinating, and I look forward to speaking with you.`;
      }
    } else {
      subject = `Following Up: ${role} Application`;
      body = `I hope your week is going well. I am following up respectfully regarding my recent submission for the ${role} role.\n\n${notes ? `Update: ${notes}\n\n` : ''}Please let me know if any additional samples or calibration checks are needed from my side.`;
    }

    return `Subject: ${subject}\n\n${greeting}\n\n${body}\n\nBest regards,\n[Your Name]`;
  }, [emailTemplate, emailTone, recruiterName, emailRole, emailNotes]);

  const filteredGuides = useMemo(() => {
    const q = sanitizeText(learningQuery, 80).toLowerCase();
    if (!q) return LEARNING_GUIDES;
    return LEARNING_GUIDES.filter(
      (g) =>
        g.prompt.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q)
    );
  }, [learningQuery]);

  const activeGuide =
    filteredGuides.find((g) => g.id === selectedGuideId) ||
    filteredGuides[0] ||
    LEARNING_GUIDES[0];

  const handleCopyResume = async () => {
    const ok = await copyToClipboard(generatedResumeDoc);
    if (ok) {
      setCopiedResume(true);
      window.setTimeout(() => setCopiedResume(false), 2000);
    }
  };

  const handleDownloadResume = () => {
    const blob = new Blob([generatedResumeDoc], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (sanitizeText(targetRole, 60) || 'planetai-resume')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    link.download = `${safeName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyEmail = async () => {
    const ok = await copyToClipboard(generatedEmail);
    if (ok) {
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleStartRecording = async () => {
    setMicError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError(
        'Microphone recording is not supported in this browser or WebView context.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      streamRef.current = stream;

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext: typeof AudioContext})
          .webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(100, Math.round(rms * 320));
        setMicLevel(level);
        rafRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {type: 'audio/webm'});
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stopVoiceResources();
      };

      recorder.start();
      setRecordingSeconds(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow mic access in browser settings to test your voice.'
          : 'Could not access microphone. Ensure a mic is connected and permissions are granted.';
      setMicError(message);
      stopVoiceResources();
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    } else {
      stopVoiceResources();
    }
    setIsRecording(false);
  };

  const toolTabs: {
    id: AIToolKey;
    label: string;
    icon: React.ComponentType<{className?: string}>;
  }[] = [
    {id: 'resume', label: 'Resume & Cover Letter', icon: FileText},
    {id: 'email', label: 'Quick Email Drafter', icon: Mail},
    {id: 'learning', label: 'AI Interview Prep', icon: BookOpen},
    {id: 'simulator', label: 'Rubric Simulator', icon: Scale},
    {id: 'voice', label: 'Voice Sample Prep', icon: Mic},
  ];

  return (
    <section aria-labelledby="ai-suite-heading" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1
              id="ai-suite-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-[#1d3028] tracking-tight"
            >
              AI Career Suite
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#c1d2c4] bg-[#eef4ee] px-2.5 py-1 text-xs font-semibold text-[#47745c]">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              No Signup Required
            </span>
          </div>
          <p className="mt-1.5 text-sm text-[#77847b] max-w-2xl">
            Five 100% free, client-side tools to tailor resumes, draft recruiter replies, practice LLM rubric grading, and test microphone clarity locally.
          </p>
        </div>
      </div>

      {/* Top AI Assistants Quick-Launch Bar */}
      <div className="rounded-2xl border border-[#e2e8e1]/90 bg-[#0D1320] p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#47745c] mb-3">
          <Bot className="w-4 h-4 shrink-0" />
          <span>Top AI Assistants — Quick Launch</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TOP_AI_ASSISTANTS.map((assistant) => (
            <a
              key={assistant.id}
              href={assistant.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-2 rounded-xl border border-[#e2e8e1] bg-white px-3.5 py-2.5 hover:border-cyan-500/45 transition-colors"
            >
              <div className="min-w-0">
                <span className="block text-xs font-bold text-[#25372e] truncate">
                  {assistant.name}
                </span>
                <span className="block text-[11px] text-[#77847b] truncate mt-0.5">
                  {assistant.useCase}
                </span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      </div>

      {/* Tool Selector Tabs */}
      <div
        role="tablist"
        aria-label="AI Career Suite Tools"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5"
      >
        {toolTabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTool === tab.id;
          const isOddLastOnMobile =
            toolTabs.length % 2 === 1 && index === toolTabs.length - 1;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTool(tab.id)}
              className={`inline-flex items-center justify-center gap-2 min-h-[46px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors text-center leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                isOddLastOnMobile ? 'col-span-2 sm:col-span-1' : ''
              } ${
                isActive
                  ? 'border-[#54806b] bg-[#183c32] text-white'
                  : 'border-[#e2e8e1] bg-white text-[#65736b] hover:border-[#d7e0d7] hover:text-[#25372e]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TOOL 1: Resume & Cover Letter Studio */}
      {activeTool === 'resume' && (
        <ResumeStudio
          targetRole={targetRole}
          setTargetRole={setTargetRole}
          targetCompany={targetCompany}
          setTargetCompany={setTargetCompany}
          skillsInput={skillsInput}
          setSkillsInput={setSkillsInput}
          jobDescInput={jobDescInput}
          setJobDescInput={setJobDescInput}
          tailoredNotice={tailoredNotice}
        />
      )}

      {/* TOOL 2: Quick Reply Email Drafter */}
      {activeTool === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div className="rounded-2xl border border-[#e2e8e1] bg-white p-5 sm:p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#1d3028]">
              Email Template & Tone
            </h2>

            <div>
              <p className="text-xs font-medium text-[#65736b] mb-2">
                Scenario
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  {id: 'recruiter-reply', label: 'Recruiter Reply'},
                  {id: 'interview-confirm', label: 'Interview Confirmation'},
                  {id: 'follow-up', label: 'Follow-Up'},
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() =>
                      setEmailTemplate(tpl.id as EmailTemplateType)
                    }
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      emailTemplate === tpl.id
                        ? 'border-[#54806b] bg-cyan-950/60 text-[#54806b]'
                        : 'border-[#e2e8e1] bg-[#f4f6f2] text-[#77847b] hover:text-[#25372e]'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[#65736b] mb-2">Tone</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'Professional',
                    'Confident',
                    'Polite Follow-Up',
                  ] as EmailTone[]
                ).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setEmailTone(tone)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      emailTone === tone
                        ? 'border-[#54806b] bg-[#183c32] text-white'
                        : 'border-[#e2e8e1] bg-[#f4f6f2] text-[#65736b] hover:border-[#d7e0d7]'
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="email-recruiter"
                  className="block text-xs font-medium text-[#65736b] mb-1.5"
                >
                  Recruiter / Contact Name
                </label>
                <input
                  id="email-recruiter"
                  type="text"
                  value={recruiterName}
                  onChange={(e) => setRecruiterName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="email-role"
                  className="block text-xs font-medium text-[#65736b] mb-1.5"
                >
                  Role Title
                </label>
                <input
                  id="email-role"
                  type="text"
                  value={emailRole}
                  onChange={(e) => setEmailRole(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email-notes"
                className="block text-xs font-medium text-[#65736b] mb-1.5"
              >
                Availability or Custom Notes
              </label>
              <textarea
                id="email-notes"
                rows={3}
                value={emailNotes}
                onChange={(e) => setEmailNotes(e.target.value)}
                className="w-full rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2.5 text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#e2e8e1] bg-white p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#1d3028]">
                Ready-to-Send Email
              </h2>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-1.5 rounded-xl bg-[#183c32] text-white text-xs font-bold hover:bg-[#285c4b] transition-colors"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Email</span>
                  </>
                )}
              </button>
            </div>

            <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-[#40534a] leading-relaxed rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-4">
              {generatedEmail}
            </pre>
          </div>
        </div>
      )}

      {/* TOOL 3: AI Learning Assistant */}
      {activeTool === 'learning' && (
        <div className="space-y-5">
          {(targetRole || targetCompany) && (
            <div className="rounded-2xl border border-[#c1d2c4] bg-[#eef4ee] p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#47745c]">
                <BookOpen className="w-4 h-4" />
                <span>YOUR INTERVIEW PREP TARGET</span>
              </div>
              <h2 className="mt-2 text-base font-bold text-[#1d3028]">{targetRole || 'Selected role'}</h2>
              {targetCompany && <p className="mt-0.5 text-sm text-[#65736b]">{targetCompany}</p>}
              {jobDescInput && <p className="mt-2 text-xs leading-relaxed text-[#77847b]">{jobDescInput}</p>}
              {skillsInput && <p className="mt-2 text-xs text-[#54806b]/80">Focus skills: {skillsInput}</p>}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 rounded-2xl border border-[#e2e8e1] bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <h2 className="font-display text-lg font-bold text-[#1d3028]">
                Quick-Prompt Topics
              </h2>
            </div>

            <input
              type="search"
              value={learningQuery}
              onChange={(e) => setLearningQuery(e.target.value)}
              placeholder="Filter prep guides (e.g., RLHF, video, audio)..."
              aria-label="Filter interview prep guides"
              className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] placeholder:text-[#1d3028]0 focus:border-[#54806b] focus:outline-none"
            />

            <div className="space-y-2">
              {filteredGuides.map((guide) => {
                const selected = activeGuide.id === guide.id;
                return (
                  <button
                    key={guide.id}
                    type="button"
                    onClick={() => setSelectedGuideId(guide.id)}
                    className={`w-full min-h-[48px] text-left rounded-xl border p-3.5 transition-colors ${
                      selected
                        ? 'border-[#54806b]/70 bg-[#eef4ee] text-[#1d3028]'
                        : 'border-[#e2e8e1] bg-[#f4f6f2] text-[#65736b] hover:border-[#d7e0d7]'
                    }`}
                  >
                    <span className="block text-sm font-semibold">
                      {guide.prompt}
                    </span>
                    <span className="block text-xs text-[#77847b] mt-0.5">
                      {guide.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-[#e2e8e1] bg-white p-5 sm:p-6 space-y-5">
            <div>
              <span className="text-xs font-semibold text-cyan-400">
                {activeGuide.category}
              </span>
              <h2 className="mt-1 font-display text-xl font-bold text-[#1d3028]">
                {activeGuide.prompt}
              </h2>
              <p className="mt-2 text-sm text-[#65736b] leading-relaxed">
                {activeGuide.summary}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#77847b] mb-2.5">
                Assessment & Qualification Checklist
              </h3>
              <ul className="space-y-2.5">
                {activeGuide.checklist.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-[#40534a]"
                  >
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-4">
              <p className="text-xs font-semibold text-amber-300">
                Common Mistake to Avoid
              </p>
              <p className="mt-1 text-sm text-amber-100/90 leading-relaxed">
                {activeGuide.avoid}
              </p>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* TOOL 4: Voice Sample AI Prep */}
      {activeTool === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Mic Tester & Local Recorder */}
          <div className="rounded-2xl border border-[#e2e8e1] bg-white p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#1d3028]">
                  Browser Mic & Audio Recorder
                </h2>
                <p className="mt-1 text-xs text-[#77847b]">
                  Test clarity and volume levels for Babel Audio, Spout, and LXT voice auditions. Audio stays 100% local in your browser and is never uploaded.
                </p>
              </div>
              <span className="font-mono tabular-nums text-sm font-semibold text-[#47745c] shrink-0">
                {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                {String(recordingSeconds % 60).padStart(2, '0')}
              </span>
            </div>

            {/* Live Volume Meter */}
            <div className="rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#77847b]">Live Input Volume</span>
                <span className="font-mono tabular-nums text-[#47745c]">
                  {micLevel}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#e9eee8]">
                <div
                  className={`h-full transition-all duration-75 ${
                    micLevel > 85
                      ? 'bg-amber-400'
                      : micLevel > 15
                        ? 'bg-cyan-400'
                        : 'bg-slate-600'
                  }`}
                  style={{width: `${micLevel}%`}}
                />
              </div>
              <p className="text-[11px] text-[#77847b]">
                Ideal speaking peaks sit between 35% and 75% without clipping into amber.
              </p>
            </div>

            {micError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200">
                <MicOff className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{micError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#183c32] text-white text-sm font-bold hover:bg-[#285c4b] transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Mic Test & Record</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-400 transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Recording</span>
                </button>
              )}

              {audioUrl && (
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                    setRecordingSeconds(0);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] text-xs font-semibold text-[#40534a] hover:bg-[#e9eee8] transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-[#77847b]" />
                  <span>Clear Clip</span>
                </button>
              )}
            </div>

            {audioUrl && (
              <div className="rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-4 space-y-2">
                <p className="text-xs font-semibold text-[#47745c]">
                  Local Playback Ready (Never Uploaded)
                </p>
                <audio controls src={audioUrl} className="w-full h-10" />
              </div>
            )}
          </div>

          {/* Sample Practice Scripts */}
          <div className="rounded-2xl border border-[#e2e8e1] bg-white p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#1d3028]">
                Sample Practice Scripts
              </h2>
              <span className="text-xs font-medium text-[#47745c]">
                Global English · Audition Ready
              </span>
            </div>

            <div className="space-y-3">
              {VOICE_SCRIPTS.map((script) => (
                <div
                  key={script.title}
                  className="rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#25372e]">
                      {script.title}
                    </h3>
                    <span className="text-[11px] text-cyan-400">
                      {script.context}
                    </span>
                  </div>
                  <p className="text-sm text-[#65736b] leading-relaxed">
                    {script.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TOOL 5: Interactive AI Evaluation Rubric Simulator */}
      {activeTool === 'simulator' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#e2e8e1] bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#1d3028]">
                LLM Evaluation Mini-Simulator
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#77847b]">
                Practice side-by-side Response A vs. Response B grading used on Outlier, Alignerr, DataAnnotation, and micro1 screening quizzes.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="rounded-xl border border-[#c1d2c4] bg-[#eef4ee] px-3.5 py-2 text-center">
                <span className="block text-[10px] font-medium text-[#47745c]">
                  Rubric Score
                </span>
                <span className="font-mono text-sm font-bold text-[#1d3028] tabular-nums">
                  {
                    RUBRIC_SCENARIOS.filter(
                      (s) => simulatorAnswers[s.id] === s.winner
                    ).length
                  }{' '}
                  / {RUBRIC_SCENARIOS.length}
                </span>
              </div>
              {Object.keys(simulatorAnswers).length > 0 && (
                <button
                  type="button"
                  onClick={() => setSimulatorAnswers({})}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] text-xs font-medium text-[#40534a] hover:bg-[#e9eee8] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {RUBRIC_SCENARIOS.map((scenario, idx) => {
              const chosen = simulatorAnswers[scenario.id];
              const isCorrect = chosen === scenario.winner;
              return (
                <div
                  key={scenario.id}
                  className="rounded-2xl border border-[#e2e8e1] bg-white p-5 sm:p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#47745c]">
                      Scenario {idx + 1} · {scenario.dimension}
                    </span>
                    {chosen && (
                      <span
                        className={`text-xs font-bold ${
                          isCorrect ? 'text-[#47745c]' : 'text-amber-300'
                        }`}
                      >
                        {isCorrect
                          ? `✓ Matches Rubric (Response ${scenario.winner})`
                          : `Rubric Winner: Response ${scenario.winner}`}
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-3.5">
                    <span className="block text-[11px] font-semibold text-[#77847b] mb-1">
                      User Prompt
                    </span>
                    <p className="text-sm text-[#25372e]">{scenario.prompt}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(['A', 'B'] as const).map((choice) => {
                      const text =
                        choice === 'A'
                          ? scenario.responseA
                          : scenario.responseB;
                      const selected = chosen === choice;
                      const winnerChoice = scenario.winner === choice;
                      let cardStyle =
                        'border-[#e2e8e1] bg-[#f4f6f2] hover:border-[#a9bcae]';
                      if (chosen) {
                        if (winnerChoice) {
                          cardStyle = 'border-emerald-500/55 bg-emerald-950/25';
                        } else if (selected) {
                          cardStyle = 'border-rose-500/55 bg-rose-950/25';
                        }
                      }

                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() =>
                            setSimulatorAnswers((prev) => ({
                              ...prev,
                              [scenario.id]: choice,
                            }))
                          }
                          className={`text-left rounded-xl border p-4 transition-colors flex flex-col justify-between gap-3 ${cardStyle}`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-bold text-[#40534a]">
                                Response {choice}
                              </span>
                              {selected && (
                                <span className="text-[11px] font-semibold text-[#47745c]">
                                  Your Pick
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs text-[#65736b] leading-relaxed whitespace-pre-wrap">
                              {text}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-[#47745c]">
                            {selected
                              ? 'Selected'
                              : `Select Response ${choice} as Better`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {chosen && (
                    <div className="rounded-xl border border-[#c1d2c4] bg-[#eef4ee] p-3.5 text-xs sm:text-sm text-[#40534a] leading-relaxed">
                      <strong className="text-[#47745c]">
                        Senior Evaluator Note:{' '}
                      </strong>
                      {scenario.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </section>
  );
};
