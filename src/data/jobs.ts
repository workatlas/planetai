export type JobCategory =
  | 'All'
  | 'AI Training'
  | 'Audio/Voice'
  | 'Coding'
  | 'Data Annotation'
  | 'Remote';

export type CompanyTier =
  | 'Established Leader'
  | 'Emerging AI Startup'
  | 'Custom Partner';

export type PayUnit = 'hr' | 'yr' | 'project';

export interface JobListing {
  id: string;
  title: string;
  company: string;
  companyShort: string;
  companyTier: CompanyTier;
  companyWebsite?: string;
  companyLogoUrl?: string;
  isCustomEmployerPost?: boolean;
  featured?: boolean;
  verified?: boolean;
  marqueeSpotlight?: boolean;
  category: Exclude<JobCategory, 'All'>;
  payMinUsd: number;
  payMaxUsd: number;
  payUnit: PayUnit;
  location: string;
  workType: 'Async Contract' | 'Full-Time Remote' | 'Part-Time Flexible';
  postedAgo: string;
  urgent?: boolean;
  tags: string[];
  applyUrl: string;
  description: string;
  requirements: string[];
  prepTips: string[];
  contactEmail?: string;
}

export const JOB_CATEGORIES: JobCategory[] = [
  'All',
  'AI Training',
  'Audio/Voice',
  'Coding',
  'Data Annotation',
  'Remote',
];

export const PLATFORM_REFERRAL_URLS: Record<string, string> = {
  micro1:
    'https://company.micro1.ai/register/?referralCode=6b7ac363-af71-444b-97b2-ecc6dcc25f19&utm_source=referral&utm_medium=share&utm_campaign=job_referral',
  babel: 'https://babel.audio',
  'babel audio': 'https://babel.audio',
  mercor: 'https://mercor.com',
  visora: 'https://visora.com',
  spout: 'https://withspout.com',
};

const COMPANY_DOMAINS: Record<string, string> = {
  micro1: 'micro1.ai',
  mercor: 'mercor.com',
  outlier: 'outlier.ai',
  alignerr: 'alignerr.com',
  'appen crowdgen': 'appen.com',
  appen: 'appen.com',
  dataannotation: 'dataannotation.tech',
  'scale ai': 'scale.com',
  'invisible technologies': 'invisible.co',
  labelbox: 'labelbox.com',
  toloka: 'toloka.ai',
  'telus digital ai': 'telusdigital.com',
  'telus international': 'telusdigital.com',
  'rws trainai': 'rws.com',
  rws: 'rws.com',
  welocalize: 'welocalize.com',
  oneforma: 'oneforma.com',
  lxt: 'lxt.ai',
  imerit: 'imerit.net',
  cloudfactory: 'cloudfactory.com',
  sama: 'sama.com',
  braintrust: 'usebraintrust.com',
  turing: 'turing.com',
  toptal: 'toptal.com',
  'hugging face': 'huggingface.co',
  runway: 'runwayml.com',
  'babel audio': 'babel.audio',
  visora: 'visora.com',
  spout: 'withspout.com',
  'productive playhouse': 'productiveplayhouse.com',
  mindrift: 'mindrift.ai',
  prolific: 'prolific.com',
  parency: 'parency.ai',
  'surge ai': 'surgehq.ai',
  'snorkel ai': 'snorkel.ai',
  cohere: 'cohere.com',
  'anthropic (contract evaluator)': 'anthropic.com',
  anthropic: 'anthropic.com',
  'perplexity ai': 'perplexity.ai',
  perplexity: 'perplexity.ai',
  'mistral ai': 'mistral.ai',
  mistral: 'mistral.ai',
  elevenlabs: 'elevenlabs.io',
  synthesia: 'synthesia.io',
  heygen: 'heygen.com',
  pika: 'pika.art',
  suno: 'suno.com',
  udio: 'udio.com',
  'harvey ai': 'harvey.ai',
  glean: 'glean.com',
  'character.ai': 'character.ai',
  remotasks: 'remotasks.com',
  lionbridge: 'lionbridge.com',
  clickworker: 'clickworker.com',
  andela: 'andela.com',
  bairesdev: 'bairesdev.com',
  deel: 'deel.com',
  gitlab: 'gitlab.com',
  automattic: 'automattic.com',
  zapier: 'zapier.com',
  openai: 'openai.com',
  assemblyai: 'assemblyai.com',
};

function sanitizeHttpsLogoUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getCompanyDomain(
  company: string,
  websiteOrApplyUrl?: string
): string | null {
  const key = company.trim().toLowerCase();
  if (COMPANY_DOMAINS[key]) {
    return COMPANY_DOMAINS[key];
  }
  const safe = sanitizeHttpsLogoUrl(websiteOrApplyUrl);
  if (!safe) return null;
  try {
    const hostname = new URL(safe).hostname.replace(/^www\./i, '').toLowerCase();
    if (hostname === 'company.micro1.ai') return 'micro1.ai';
    return hostname || null;
  } catch {
    return null;
  }
}

export function getCompanyLogoUrl(
  company: string,
  explicitLogoUrl?: string,
  websiteOrApplyUrl?: string
): string | null {
  const safeExplicit = sanitizeHttpsLogoUrl(explicitLogoUrl);
  if (safeExplicit) {
    return safeExplicit;
  }

  const domain = getCompanyDomain(company, websiteOrApplyUrl);
  if (!domain) return null;

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain
  )}&sz=128`;
}

export function resolveApplyUrl(company: string, fallbackUrl: string): string {
  const key = company.trim().toLowerCase();
  if (PLATFORM_REFERRAL_URLS[key]) {
    return PLATFORM_REFERRAL_URLS[key];
  }
  for (const [partner, url] of Object.entries(PLATFORM_REFERRAL_URLS)) {
    const pattern = new RegExp(`\\b${partner}\\b`, 'i');
    if (pattern.test(key)) {
      return url;
    }
  }
  return fallbackUrl;
}

export function formatPayRate(
  minUsd: number,
  maxUsd: number,
  unit: PayUnit
): string {
  const suffix = unit === 'hr' ? '/hr' : unit === 'yr' ? '/yr' : '/task';

  if (unit === 'yr') {
    const minK = Math.round(minUsd / 1000);
    const maxK = Math.round(maxUsd / 1000);
    return minK === maxK ? `$${minK}k${suffix}` : `$${minK}k-$${maxK}k${suffix}`;
  }

  return minUsd === maxUsd
    ? `$${minUsd}${suffix}`
    : `$${minUsd}-$${maxUsd}${suffix}`;
}

const BASE_INITIAL_JOBS: JobListing[] = [
  // =========================================================================
  // 25 ESTABLISHED MARKET LEADERS
  // =========================================================================
  {
    id: 'est-01',
    title: 'Senior Python & TypeScript AI Code Reviewer',
    company: 'micro1',
    companyShort: 'M1',
    companyTier: 'Established Leader',
    category: 'Coding',
    payMinUsd: 55,
    payMaxUsd: 85,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Async Contract',
    postedAgo: '14m ago',
    urgent: true,
    tags: ['Python', 'TypeScript', 'RLHF', 'Unit Testing'],
    applyUrl: 'https://micro1.ai',
    description:
      'Evaluate, refactor, and author production-grade Python and TypeScript solutions to train frontier reasoning and code-generation models.',
    requirements: [
      '3+ years shipping production Python or TypeScript applications',
      'Strong grasp of edge-case debugging and algorithmic complexity',
      'Clear written technical reasoning in English',
    ],
    prepTips: [
      'Speak through time/space trade-offs clearly during the 15-minute micro1 AI screening.',
      'Highlight concrete unit testing and PR code-review experience.',
    ],
  },
  {
    id: 'est-02',
    title: 'AI-Vetted Full-Stack React & Node.js Engineer',
    company: 'micro1',
    companyShort: 'M1',
    companyTier: 'Established Leader',
    category: 'Remote',
    payMinUsd: 60,
    payMaxUsd: 95,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Full-Time Remote',
    postedAgo: '28m ago',
    urgent: true,
    tags: ['React', 'Node.js', 'PostgreSQL', 'System Design'],
    applyUrl: 'https://micro1.ai',
    description:
      'Join vetted global engineering teams matched through micro1 to build scalable full-stack web products and AI-enabled workflows.',
    requirements: [
      '4+ years building React, TypeScript, and Node.js services',
      'Experience owning end-to-end API design and database schemas',
      'Reliable async communication across distributed teams',
    ],
    prepTips: [
      'Prepare a 60-second walkthrough of a production architecture you led.',
      'Ensure quiet lighting and strong mic audio before starting the AI interview.',
    ],
  },
  {
    id: 'est-03',
    title: 'Full-Stack AI Evaluation Engineer (React / Node)',
    company: 'Mercor',
    companyShort: 'MC',
    category: 'Coding',
    companyTier: 'Established Leader',
    payMinUsd: 65,
    payMaxUsd: 100,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Async Contract',
    postedAgo: '45m ago',
    urgent: true,
    tags: ['React', 'Node.js', 'SQL', 'SWE-Bench'],
    applyUrl: 'https://mercor.com',
    description:
      'Build real-world repository benchmarks, isolate flaky tests, and grade autonomous coding agents against production GitHub pull requests.',
    requirements: [
      '4+ years full-stack software engineering experience',
      'Docker, Git, and automated test harness experience',
      'Ability to review unfamiliar TypeScript and Python codebases quickly',
    ],
    prepTips: [
      'Be ready to explain how you reproduce bugs deterministically in Docker.',
      'Keep your GitHub portfolio and concise bullet resume ready.',
    ],
  },
  {
    id: 'est-04',
    title: 'Senior Applied ML & Agentic Workflow Specialist',
    company: 'Mercor',
    companyShort: 'MC',
    companyTier: 'Established Leader',
    category: 'AI Training',
    payMinUsd: 75,
    payMaxUsd: 120,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '1h ago',
    urgent: true,
    tags: ['LLM Agents', 'Tool Calling', 'Python', 'Evaluations'],
    applyUrl: 'https://mercor.com',
    description:
      'Design multi-step tool-use tasks and evaluate autonomous reasoning agents on structured API orchestration and code execution.',
    requirements: [
      'Hands-on experience building or evaluating LLM tool-calling pipelines',
      'Strong Python scripting and JSON schema design skills',
      '15–35 hours/week flexible async availability',
    ],
    prepTips: [
      'Practice describing failure modes in multi-step agent trajectories.',
      'Emphasize precision in writing grading rubrics.',
    ],
  },
  {
    id: 'est-05',
    title: 'STEM & Mathematical Reasoning AI Trainer',
    company: 'Outlier',
    companyShort: 'OU',
    companyTier: 'Established Leader',
    category: 'AI Training',
    payMinUsd: 40,
    payMaxUsd: 65,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Async Contract',
    postedAgo: '1h ago',
    urgent: true,
    tags: ['Mathematics', 'LaTeX', 'Step-by-Step Proofs', 'RLHF'],
    applyUrl: 'https://outlier.ai/',
    description:
      'Verify formal proofs, solve competition-level math problems, and rank model chain-of-thought derivations for next-generation STEM models.',
    requirements: [
      'Strong background in Calculus, Linear Algebra, or Discrete Math',
      'Proficiency formatting mathematical expressions in LaTeX',
      'Consistent quality score above 90% on calibration tasks',
    ],
    prepTips: [
      'Double-check every arithmetic step when spotting subtle model hallucinations.',
      'Read project-specific LaTeX formatting conventions carefully before submitting.',
    ],
  },
  {
    id: 'est-06',
    title: 'Multilingual LLM Reasoning & Rubric Specialist',
    company: 'Alignerr',
    companyShort: 'AL',
    companyTier: 'Established Leader',
    category: 'AI Training',
    payMinUsd: 35,
    payMaxUsd: 60,
    payUnit: 'hr',
    location: 'Global Remote (PH Welcome)',
    workType: 'Part-Time Flexible',
    postedAgo: '2h ago',
    urgent: true,
    tags: ['Rubric Grading', 'Factuality', 'Tagalog / English', 'LLM Eval'],
    applyUrl: 'https://www.alignerr.com/',
    description:
      'Design complex adversarial prompts and multi-step grading rubrics to measure hallucination rates and reasoning depth across frontier models.',
    requirements: [
      'Bachelor’s degree or equivalent specialized domain expertise',
      'Detail-oriented analytical writing and fact-checking skills',
      '15–30 hrs/week availability on flexible schedule',
    ],
    prepTips: [
      'Focus on binary, unambiguous rubric criteria during onboarding assessments.',
      'Verify all external facts with authoritative primary sources.',
    ],
  },
  {
    id: 'est-07',
    title: 'Multilingual Search & Social Relevance Evaluator',
    company: 'Appen CrowdGen',
    companyShort: 'AP',
    companyTier: 'Established Leader',
    category: 'Data Annotation',
    payMinUsd: 16,
    payMaxUsd: 25,
    payUnit: 'hr',
    location: 'PH / Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '2h ago',
    tags: ['Search Quality', 'Localization', 'Web Eval', 'Flexible'],
    applyUrl: 'https://crowdgen.com/',
    description:
      'Assess search engine result relevance, cultural accuracy, and local query intent across desktop and mobile web experiences.',
    requirements: [
      'Fluency in English plus regional Tagalog or APAC languages',
      'Consistent weekly availability of 10–20 hours',
      'Pass project qualification guidelines quiz',
    ],
    prepTips: [
      'Keep the official rating guidelines open as a reference during qualification.',
      'Pay close attention to user location intent vs. informational queries.',
    ],
  },
  {
    id: 'est-08',
    title: 'Coding & Data Science AI Trainer (SQL / Pandas)',
    company: 'DataAnnotation',
    companyShort: 'DA',
    companyTier: 'Established Leader',
    category: 'Coding',
    payMinUsd: 40,
    payMaxUsd: 58,
    payUnit: 'hr',
    location: 'Remote (Select Regions)',
    workType: 'Async Contract',
    postedAgo: '3h ago',
    tags: ['SQL', 'Python', 'Pandas', 'Data Visualization'],
    applyUrl: 'https://www.dataannotation.tech/',
    description:
      'Write clean data pipelines, debug analytical SQL queries, and evaluate model-generated notebooks for accuracy and chart clarity.',
    requirements: [
      'Proficiency in Python data stack (Pandas, NumPy, Matplotlib)',
      'Strong SQL query optimization and debugging skills',
      'Self-paced async task completion',
    ],
    prepTips: [
      'Take your time on the starter coding assessment—accuracy outweighs speed.',
      'Always execute code snippets locally to verify edge cases.',
    ],
  },
  {
    id: 'est-09',
    title: 'Red-Teaming & AI Safety Policy Evaluator',
    company: 'Scale AI',
    companyShort: 'SC',
    companyTier: 'Established Leader',
    category: 'AI Training',
    payMinUsd: 32,
    payMaxUsd: 52,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '3h ago',
    tags: ['AI Safety', 'Red Teaming', 'Policy Alignment', 'RLHF'],
    applyUrl: 'https://scale.com/careers',
    description:
      'Stress-test conversational assistants against edge-case safety policies and author principled, neutral refusal and helpfulness responses.',
    requirements: [
      'Strong critical reasoning and nuanced policy interpretation',
      'Comfortable reviewing sensitive adversarial prompts professionally',
      '10+ hours per week commitment',
    ],
    prepTips: [
      'Practice balancing helpfulness vs. harm-prevention without over-refusing benign prompts.',
      'Cite exact policy clauses in your review notes.',
    ],
  },
  {
    id: 'est-10',
    title: 'Enterprise Document & Financial Table Annotator',
    company: 'Invisible Technologies',
    companyShort: 'IV',
    companyTier: 'Established Leader',
    category: 'Data Annotation',
    payMinUsd: 19,
    payMaxUsd: 32,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Async Contract',
    postedAgo: '4h ago',
    tags: ['OCR Verification', 'JSON Schema', 'Document AI', 'QA'],
    applyUrl: 'https://www.invisible.co/join-us',
    description:
      'Extract structured fields from dense invoices, PDFs, and financial filings to validate enterprise document-parsing pipelines.',
    requirements: [
      'High accuracy verifying tabular figures and JSON schemas',
      'Comfortable with multi-monitor or split-screen workflows',
      '20+ hours/week availability preferred',
    ],
    prepTips: [
      'Double-check decimal alignment and currency symbols in OCR tables.',
      'Use keyboard shortcuts to maintain speed without sacrificing precision.',
    ],
  },
  {
    id: 'est-11',
    title: 'Computer Vision & Segmentation Quality Specialist',
    company: 'Labelbox',
    companyShort: 'LB',
    companyTier: 'Established Leader',
    category: 'Data Annotation',
    payMinUsd: 24,
    payMaxUsd: 38,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Async Contract',
    postedAgo: '5h ago',
    tags: ['Polygon Masking', 'Vision QA', 'Ontology', 'Active Learning'],
    applyUrl: 'https://labelbox.com/company/careers/',
    description:
      'Audit pixel-level semantic masks, refine labeling ontologies, and benchmark visual edge cases for enterprise computer vision teams.',
    requirements: [
      'Prior experience with polygon/brush segmentation workflows',
      'Sharp attention to visual boundaries and occlusion rules',
      'Clear written feedback for labeling teams',
    ],
    prepTips: [
      'Zoom into 200% around thin object edges like wires and foliage.',
      'Document recurring ontology edge cases concisely.',
    ],
  },
  {
    id: 'est-12',
    title: 'Multimodal Data & Prompt Calibration Specialist',
    company: 'Toloka',
    companyShort: 'TL',
    companyTier: 'Established Leader',
    category: 'AI Training',
    payMinUsd: 22,
    payMaxUsd: 40,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '5h ago',
    tags: ['Multimodal Eval', 'Prompt Design', 'Quality Audit', 'RLHF'],
    applyUrl: 'https://toloka.ai/',
    description:
      'Create gold-standard image-text evaluation sets and rank model responses across visual reasoning and OCR comprehension tasks.',
    requirements: [
      'Strong English comprehension and structured reasoning',
      'Experience evaluating text-plus-image AI outputs',
      'Consistent high-trust score on calibration batches',
    ],
    prepTips: [
      'Verify that the model actually read text inside the image rather than guessing from context.',
    ],
  },
  {
    id: 'est-13',
    title: 'Personalized Internet Ads & Search Assessor',
    company: 'TELUS Digital AI',
    companyShort: 'TD',
    companyTier: 'Established Leader',
    category: 'Data Annotation',
    payMinUsd: 15,
    payMaxUsd: 22,
    payUnit: 'hr',
    location: 'Philippines / Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '6h ago',
    tags: ['Ads Quality', 'Search Rater', 'Regional Market', 'Flexible'],
    applyUrl: 'https://www.telusdigital.com/careers',
    description:
      'Rate digital ad landing pages, keyword match intent, and regional relevance for major global search platforms.',
    requirements: [
      'Residing in target locale with strong local web familiarity',
      'Minimum 10–20 hours weekly rating availability',
      'Pass multi-part open-book qualification exam',
    ],
    prepTips: [
      'Focus on "Needs Met" vs. "Page Quality" distinctions in the handbook.',
    ],
  },
  {
    id: 'est-14',
    title: 'Bilingual Localization & LLM Tone Evaluator',
    company: 'RWS TrainAI',
    companyShort: 'RW',
    companyTier: 'Established Leader',
    category: 'AI Training',
    payMinUsd: 20,
    payMaxUsd: 34,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '7h ago',
    tags: ['Localization', 'Translation QA', 'Cultural Nuance', 'LLM'],
    applyUrl: 'https://www.rws.com/about/careers/',
    description:
      'Review machine-translated dialogues and refine idiomatic phrasing, register, and cultural accuracy for global AI assistants.',
    requirements: [
      'Native-level fluency in Tagalog, Japanese, Spanish, or French + English',
      'Background in linguistics, translation, or copyediting',
      'Comfort working in web-based CAT/evaluation tools',
    ],
    prepTips: [
      'Watch out for literal word-for-word translations that break natural conversational tone.',
    ],
  },
  {
    id: 'est-15',
    title: 'Search Relevance & Multimodal Ads Quality Rater',
    company: 'Welocalize',
    companyShort: 'WL',
    companyTier: 'Established Leader',
    category: 'Data Annotation',
    payMinUsd: 16,
    payMaxUsd: 24,
    payUnit: 'hr',
    location: 'Philippines / Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '8h ago',
    tags: ['Search Quality', 'Intent Matching', 'Localization', 'Web Eval'],
    applyUrl: 'https://www.welocalize.com/careers/',
    description:
      'Evaluate search engine ranking relevance, regional query intent, and landing page utility across web and mobile queries.',
    requirements: [
      'Strong awareness of local culture, slang, and web trends',
      'Minimum 10 hrs/week consistent rating schedule',
      'Pass open-book guidelines qualification exam',
    ],
    prepTips: [
      'Use browser bookmarks to jump quickly to key sections of the rating guide during the exam.',
    ],
  },
  {
    id: 'est-16',
    title: 'Multilingual Audio Transcription & Speech QA',
    company: 'OneForma',
    companyShort: 'OF',
    companyTier: 'Established Leader',
    category: 'Audio/Voice',
    payMinUsd: 18,
    payMaxUsd: 28,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Async Contract',
    postedAgo: '9h ago',
    tags: ['Transcription', 'Timestamping', 'Speech QA', 'Remote'],
    applyUrl: 'https://www.oneforma.com/',
    description:
      'Transcribe natural speech recordings and verify speaker diarization, punctuation, and noise tags across multi-accent audio batches.',
    requirements: [
      'Over-ear headphones and quiet work environment',
      '98%+ spelling and punctuation accuracy',
      'Pass platform language certification test',
    ],
    prepTips: [
      'Review verbatim vs. clean-read transcription conventions before starting each batch.',
    ],
  },
  {
    id: 'est-17',
    title: 'Natural Speech Collection & Wake-Word QA Tester',
    company: 'LXT',
    companyShort: 'LX',
    companyTier: 'Established Leader',
    category: 'Audio/Voice',
    payMinUsd: 18,
    payMaxUsd: 29,
    payUnit: 'hr',
    location: 'PH / Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '10h ago',
    tags: ['Voice QA', 'Mobile Audio', 'Pronunciation', 'Speech AI'],
    applyUrl: 'https://www.lxt.ai/jobs/',
    description:
      'Record short command utterances across everyday acoustic environments and audit pronunciation accuracy for smart voice devices.',
    requirements: [
      'Modern Android or iOS smartphone for field audio capture',
      'Attention to clipping, echo, and transcription fidelity',
      'Weekly PayPal or Wise payout options',
    ],
    prepTips: [
      'Use PlanetAI Voice Sample Prep to test your peak levels before recording batches.',
    ],
  },
  {
    id: 'est-18',
    title: 'Medical Imaging & Geospatial Polygon Annotator',
    company: 'iMerit',
    companyShort: 'IM',
    companyTier: 'Established Leader',
    category: 'Data Annotation',
    payMinUsd: 18,
    payMaxUsd: 30,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Async Contract',
    postedAgo: '11h ago',
    tags: ['Medical AI', 'Geospatial', 'Polygon Labeling', 'QA'],
    applyUrl: 'https://imerit.net/careers/',
    description:
      'Annotate high-resolution satellite imagery and clinical scan regions under structured expert review guidelines.',
    requirements: [
      'High precision with mouse or stylus polygon tools',
      'Strong adherence to data security and confidentiality protocols',
      'Consistent weekly deliverable cadence',
    ],
    prepTips: [
      'Practice distinguishing shadow artifacts from physical structure boundaries in aerial imagery.',
    ],
  },
  {
    id: 'est-19',
    title: 'High-Precision Autonomous Vision Data Analyst',
    company: 'CloudFactory',
    companyShort: 'CF',
    companyTier: 'Established Leader',
    category: 'Data Annotation',
    payMinUsd: 16,
    payMaxUsd: 26,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '12h ago',
    tags: ['Autonomous Vehicles', '3D Cuboids', 'Tracking', 'QA'],
    applyUrl: 'https://www.cloudfactory.com/careers',
    description:
      'Label 3D cuboids, lane markings, and pedestrian trajectories across multi-camera sensor feeds for robotics perception teams.',
    requirements: [
      'Spatial awareness and steady frame-by-frame tracking accuracy',
      'Stable broadband and 1080p+ monitor',
      'Team-oriented async feedback habits',
    ],
    prepTips: [
      'Check cuboid orientation arrows carefully across consecutive frames.',
    ],
  },
  {
    id: 'est-20',
    title: 'Ethical AI & Computer Vision Bounding Box Specialist',
    company: 'Sama',
    companyShort: 'SM',
    companyTier: 'Established Leader',
    category: 'Data Annotation',
    payMinUsd: 17,
    payMaxUsd: 27,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Async Contract',
    postedAgo: '14h ago',
    tags: ['Computer Vision', 'Quality Assurance', 'Retail AI', 'Labeling'],
    applyUrl: 'https://www.sama.com/careers/',
    description:
      'Deliver audit-ready object detection labels and attribute tags for retail automation, agriculture, and robotics models.',
    requirements: [
      'Proven accuracy in image classification or bounding-box tooling',
      'Ability to follow multi-attribute decision trees',
      '20+ hours/week preferred availability',
    ],
    prepTips: [
      'Verify occluded object rules before annotating partially hidden items.',
    ],
  },
  {
    id: 'est-21',
    title: 'Remote Senior TypeScript & AI Frontend Consultant',
    company: 'Braintrust',
    companyShort: 'BT',
    companyTier: 'Established Leader',
    category: 'Remote',
    payMinUsd: 70,
    payMaxUsd: 115,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Full-Time Remote',
    postedAgo: '15h ago',
    tags: ['TypeScript', 'React', 'AI UX', 'Zero-Fee Talent Network'],
    applyUrl: 'https://www.usebraintrust.com/',
    description:
      'Work directly with enterprise engineering teams on production AI interfaces, streaming chat UX, and data visualization dashboards.',
    requirements: [
      '5+ years modern TypeScript and React production leadership',
      'Portfolio of shipped web applications with high accessibility standards',
      'Strong async and client stakeholder communication',
    ],
    prepTips: [
      'Complete your Braintrust profile verification badges to unlock direct client invites.',
    ],
  },
  {
    id: 'est-22',
    title: 'Remote LLM Post-Training Engineer (Go / Rust)',
    company: 'Turing',
    companyShort: 'TR',
    companyTier: 'Established Leader',
    category: 'Remote',
    payMinUsd: 115000,
    payMaxUsd: 155000,
    payUnit: 'yr',
    location: 'Worldwide Remote',
    workType: 'Full-Time Remote',
    postedAgo: '16h ago',
    tags: ['Go', 'Rust', 'Distributed Systems', 'Full-Time'],
    applyUrl: 'https://www.turing.com/jobs',
    description:
      'Partner directly with frontier AI research teams to author complex systems-programming benchmarks and evaluate agentic tool use.',
    requirements: [
      '5+ years backend systems engineering with Go or Rust',
      'Experience designing containerized benchmark environments',
      'Full-time overlap with US Pacific morning hours (3 hrs/day)',
    ],
    prepTips: [
      'Refresh concurrency primitives and memory-safety patterns before technical screens.',
    ],
  },
  {
    id: 'est-23',
    title: 'Freelance Applied AI & LLM Systems Architect',
    company: 'Toptal',
    companyShort: 'TP',
    companyTier: 'Established Leader',
    category: 'Coding',
    payMinUsd: 80,
    payMaxUsd: 140,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Full-Time Remote',
    postedAgo: '18h ago',
    tags: ['RAG Pipelines', 'Python', 'Vector DB', 'Architecture'],
    applyUrl: 'https://www.toptal.com/talent/apply',
    description:
      'Architect retrieval-augmented generation pipelines, evaluation frameworks, and latency-optimized inference services for vetted clients.',
    requirements: [
      'Deep expertise in Python, embeddings, and hybrid search retrieval',
      'Proven production deployment of LLM systems at scale',
      'Pass Toptal technical screening and live architecture project',
    ],
    prepTips: [
      'Be prepared to justify chunking strategies and eval metrics with concrete trade-offs.',
    ],
  },
  {
    id: 'est-24',
    title: 'Open-Source ML Benchmark & Datasets Contributor',
    company: 'Hugging Face',
    companyShort: 'HF',
    companyTier: 'Established Leader',
    category: 'Coding',
    payMinUsd: 125000,
    payMaxUsd: 175000,
    payUnit: 'yr',
    location: 'Global Remote',
    workType: 'Full-Time Remote',
    postedAgo: '20h ago',
    tags: ['Transformers', 'PyTorch', 'Open Source', 'Eval Harnesses'],
    applyUrl: 'https://huggingface.co/jobs',
    description:
      'Curate transparent evaluation benchmarks, maintain dataset loaders, and collaborate with the global open-source ML community.',
    requirements: [
      'Strong Python & PyTorch background with open-source contributions',
      'Familiarity with Hugging Face Datasets, Hub, and evaluation suites',
      'Clear public technical writing and documentation skills',
    ],
    prepTips: [
      'Link active GitHub PRs, open-source datasets, or model cards in your application.',
    ],
  },
  {
    id: 'est-25',
    title: 'Generative Video Aesthetics & Motion Evaluator',
    company: 'Runway',
    companyShort: 'RN',
    companyTier: 'Established Leader',
    category: 'AI Training',
    payMinUsd: 35,
    payMaxUsd: 60,
    payUnit: 'hr',
    location: 'Remote (Global Async)',
    workType: 'Part-Time Flexible',
    postedAgo: '1d ago',
    tags: ['Video AI', 'Cinematography', 'Temporal Consistency', 'RLHF'],
    applyUrl: 'https://runwayml.com/careers',
    description:
      'Evaluate generated video clips for physical realism, camera motion continuity, lighting coherence, and prompt adherence.',
    requirements: [
      'Background in video editing, VFX, animation, or visual design',
      'Sharp eye for frame-to-frame temporal artifacts',
      'Clear structured critique skills',
    ],
    prepTips: [
      'Use film terminology (depth of field, motion blur, parallax) when documenting flaws.',
    ],
  },

  // =========================================================================
  // 25 EMERGING & FAST-GROWING AI COMPANIES
  // =========================================================================
  {
    id: 'emg-01',
    title: 'Conversational Voice Actor & Expressive Audio Annotator',
    company: 'Babel Audio',
    companyShort: 'BB',
    companyTier: 'Emerging AI Startup',
    category: 'Audio/Voice',
    payMinUsd: 24,
    payMaxUsd: 38,
    payUnit: 'hr',
    location: 'PH / APAC Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '22m ago',
    urgent: true,
    tags: ['Speech Data', 'Prosody', 'Studio Mic', 'Voice AI'],
    applyUrl: 'https://babel.audio',
    description:
      'Record natural multi-turn dialogues and label acoustic nuances, emotional tone, and turn-taking cues for real-time voice synthesis models.',
    requirements: [
      'Quiet recording environment with USB or XLR condenser microphone',
      'Natural conversational delivery and clear articulation',
      'Reliable high-speed broadband connection',
    ],
    prepTips: [
      'Run a 15-second mic test in PlanetAI Voice Sample Prep before submitting your audition.',
      'Keep breathing natural and avoid scripted "radio announcer" cadence.',
    ],
  },
  {
    id: 'emg-02',
    title: 'Bilingual English–Tagalog Voice Dialogue Contributor',
    company: 'Babel Audio',
    companyShort: 'BB',
    companyTier: 'Emerging AI Startup',
    category: 'Audio/Voice',
    payMinUsd: 22,
    payMaxUsd: 35,
    payUnit: 'hr',
    location: 'Philippines / Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '39m ago',
    urgent: true,
    tags: ['Tagalog', 'Bilingual', 'Conversational AI', 'Weekly Pay'],
    applyUrl: 'https://babel.audio',
    description:
      'Participate in guided natural two-speaker voice sessions in English and Tagalog to improve low-latency conversational speech models.',
    requirements: [
      'Native fluency in Tagalog and conversational English',
      'Echo-free room and wired headset or condenser mic',
      '8–20 hours/week flexible scheduling',
    ],
    prepTips: [
      'Practice the sample voice scripts inside the AI Tools tab for smooth pacing.',
    ],
  },
  {
    id: 'emg-03',
    title: 'Multimodal Video & Spatial Scene Annotator',
    company: 'Visora',
    companyShort: 'VS',
    companyTier: 'Emerging AI Startup',
    category: 'Data Annotation',
    payMinUsd: 20,
    payMaxUsd: 32,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '52m ago',
    urgent: true,
    tags: ['Computer Vision', 'Bounding Boxes', 'Temporal Events', 'QA'],
    applyUrl: 'https://visora.com',
    description:
      'Segment dynamic video frames, annotate object trajectories, and verify spatial occlusion labels for robotics and vision-language models.',
    requirements: [
      'High visual precision and patience with frame-by-frame tooling',
      'Desktop or laptop with 1080p+ display',
      'Pass short calibration assessment upon onboarding',
    ],
    prepTips: [
      'Check start/end event timestamps down to the exact frame transition.',
    ],
  },
  {
    id: 'emg-04',
    title: 'Embodied Robotics Action-Captioning Specialist',
    company: 'Visora',
    companyShort: 'VS',
    companyTier: 'Emerging AI Startup',
    category: 'AI Training',
    payMinUsd: 24,
    payMaxUsd: 38,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Async Contract',
    postedAgo: '1h ago',
    urgent: true,
    tags: ['Robotics Data', 'Action Labeling', 'Video Captioning', 'Vision'],
    applyUrl: 'https://visora.com',
    description:
      'Author precise action-sequence descriptions and verify grasp/contact labels for household and industrial robotics training datasets.',
    requirements: [
      'Clear, descriptive English writing for physical step sequences',
      'Attention to left/right spatial orientation and object states',
      '15+ hours/week consistent availability',
    ],
    prepTips: [
      'Describe hand-object contact states explicitly ("grasps handle with right hand, lifts vertically").',
    ],
  },
  {
    id: 'emg-05',
    title: 'Acoustic Phonetics & Dialect Transcription Specialist',
    company: 'Spout',
    companyShort: 'SP',
    companyTier: 'Emerging AI Startup',
    category: 'Audio/Voice',
    payMinUsd: 26,
    payMaxUsd: 42,
    payUnit: 'hr',
    location: 'Global Remote (APAC / EMEA)',
    workType: 'Async Contract',
    postedAgo: '1h ago',
    urgent: true,
    tags: ['ASR Transcription', 'Phonetics', 'Noise Tagging', 'Multilingual'],
    applyUrl: 'https://withspout.com',
    description:
      'Transcribe overlapping multi-speaker audio streams with timestamped disfluency markers to improve speech recognition accuracy.',
    requirements: [
      'Near-native fluency in English plus Tagalog, Cebuano, or Spanish',
      'Studio headphones for subtle background noise detection',
      'Experience with ELAN, Praat, or web waveform editors is a plus',
    ],
    prepTips: [
      'Replay ambiguous overlaps at 0.75x speed to capture exact filler words.',
    ],
  },
  {
    id: 'emg-06',
    title: 'Micro-Task Audio QA & Expressive Prompt Contributor',
    company: 'Spout',
    companyShort: 'SP',
    companyTier: 'Emerging AI Startup',
    category: 'Audio/Voice',
    payMinUsd: 20,
    payMaxUsd: 34,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '2h ago',
    tags: ['Voice Clips', 'Audio QA', 'Micro-Tasks', 'Flexible'],
    applyUrl: 'https://withspout.com',
    description:
      'Complete quick, high-accuracy voice verification and short conversational recording tasks on a flexible async schedule.',
    requirements: [
      'Quiet workspace and clean desktop or USB microphone',
      'Consistent adherence to acoustic clipping and noise checks',
      'Weekly payout readiness via Wise or PayPal',
    ],
    prepTips: [
      'Leave half a second of silence before and after each prompt clip.',
    ],
  },
  {
    id: 'emg-07',
    title: 'Voice Acting & Multilingual Script Contributor',
    company: 'Productive Playhouse',
    companyShort: 'PP',
    companyTier: 'Emerging AI Startup',
    category: 'Audio/Voice',
    payMinUsd: 22,
    payMaxUsd: 35,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '3h ago',
    tags: ['Voice Talent', 'Reading Scripts', 'Prosody', 'Audio AI'],
    applyUrl: 'https://www.productiveplayhouse.com/',
    description:
      'Deliver natural, expressive readings of diverse conversational and instructional scripts for next-gen speech synthesis.',
    requirements: [
      'Clear vocal tone and quiet home recording setup',
      'Ability to adjust emotional delivery across prompt categories',
      'Reliable turnaround on assigned recording batches',
    ],
    prepTips: [
      'Hydrate before sessions and keep a consistent 15 cm distance from your mic.',
    ],
  },
  {
    id: 'emg-08',
    title: 'Editorial AI Tutor & Creative Writing Specialist',
    company: 'Mindrift',
    companyShort: 'MD',
    companyTier: 'Emerging AI Startup',
    category: 'AI Training',
    payMinUsd: 22,
    payMaxUsd: 36,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '3h ago',
    tags: ['Copyediting', 'Tone Calibration', 'Fact Checking', 'Writing'],
    applyUrl: 'https://mindrift.ai/',
    description:
      'Craft high-signal golden responses, rewrite robotic phrasing, and refine stylistic consistency across long-form AI outputs.',
    requirements: [
      'Published writing, journalism, or editorial background',
      'Exceptional grammar and structural clarity',
      'Flexible async deliverables with weekly payouts',
    ],
    prepTips: [
      'Eliminate generic AI filler ("In today’s fast-paced world...") during writing tests.',
    ],
  },
  {
    id: 'emg-09',
    title: 'AI Alignment & Behavioral Preference Participant',
    company: 'Prolific',
    companyShort: 'PR',
    companyTier: 'Emerging AI Startup',
    category: 'AI Training',
    payMinUsd: 18,
    payMaxUsd: 30,
    payUnit: 'hr',
    location: 'Remote (Global Cohort)',
    workType: 'Part-Time Flexible',
    postedAgo: '4h ago',
    tags: ['Human Eval', 'Preference Ranking', 'Research', 'Instant Pay'],
    applyUrl: 'https://www.prolific.com/ai-training',
    description:
      'Participate in specialized AI model preference evaluations, multi-turn chat studies, and domain-specific human feedback tasks.',
    requirements: [
      'Verified participant profile and strong English comprehension',
      'Thoughtful, non-repetitive written feedback on model pairs',
      'Honest attention-check completion',
    ],
    prepTips: [
      'Keep your "About You" skills and coding/language filters fully updated.',
    ],
  },
  {
    id: 'emg-10',
    title: 'Frontier AI Workflow & Quality Calibration Analyst',
    company: 'Parency',
    companyShort: 'PY',
    companyTier: 'Emerging AI Startup',
    category: 'Data Annotation',
    payMinUsd: 25,
    payMaxUsd: 42,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Async Contract',
    postedAgo: '5h ago',
    tags: ['Calibration', 'Eval QA', 'Rubrics', 'Structured Data'],
    applyUrl: 'https://parency.ai/',
    description:
      'Audit labeled datasets, spot inter-annotator drift, and maintain high signal-to-noise quality across enterprise AI pipelines.',
    requirements: [
      'Prior QA or lead annotator experience on AI datasets',
      'Strong analytical eye for edge-case disagreements',
      'Clear documentation habits',
    ],
    prepTips: [
      'Provide concrete examples when explaining why two annotator labels diverge.',
    ],
  },
  {
    id: 'emg-11',
    title: 'Coding & Complex Reasoning RLHF Specialist',
    company: 'Surge AI',
    companyShort: 'SG',
    companyTier: 'Emerging AI Startup',
    category: 'Coding',
    payMinUsd: 45,
    payMaxUsd: 75,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Async Contract',
    postedAgo: '5h ago',
    tags: ['Python', 'RLHF', 'Creative Coding', 'Factuality'],
    applyUrl: 'https://www.surgehq.ai/',
    description:
      'Write challenging multi-step coding and reasoning prompts designed to expose subtle logic flaws in frontier language models.',
    requirements: [
      'Strong software engineering or quantitative academic background',
      'Ability to write original adversarial prompts from scratch',
      'High rating consistency on calibration tasks',
    ],
    prepTips: [
      'Design prompts that test multi-constraint reasoning rather than trivia lookup.',
    ],
  },
  {
    id: 'emg-12',
    title: 'Programmatic Labeling & Weak Supervision Engineer',
    company: 'Snorkel AI',
    companyShort: 'SN',
    companyTier: 'Emerging AI Startup',
    category: 'Coding',
    payMinUsd: 65,
    payMaxUsd: 105,
    payUnit: 'hr',
    location: 'Remote',
    workType: 'Async Contract',
    postedAgo: '6h ago',
    tags: ['Python', 'Data Curation', 'NLP', 'Model Alignment'],
    applyUrl: 'https://snorkel.ai/careers/',
    description:
      'Develop programmatic labeling functions, curate fine-tuning datasets, and benchmark specialized enterprise domain models.',
    requirements: [
      '3+ years Python data engineering or applied NLP experience',
      'Experience with programmatic data curation and evaluation metrics',
      'Strong collaborative documentation skills',
    ],
    prepTips: [
      'Review precision/recall trade-offs in heuristic labeling functions.',
    ],
  },
  {
    id: 'emg-13',
    title: 'Enterprise RAG & Multilingual Response Evaluator',
    company: 'Cohere',
    companyShort: 'CH',
    companyTier: 'Emerging AI Startup',
    category: 'AI Training',
    payMinUsd: 35,
    payMaxUsd: 55,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Async Contract',
    postedAgo: '7h ago',
    tags: ['RAG Grounding', 'Citations', 'Multilingual', 'Enterprise AI'],
    applyUrl: 'https://cohere.com/careers',
    description:
      'Verify citation grounding, hallucination boundaries, and multilingual retrieval accuracy for enterprise command models.',
    requirements: [
      'High precision verifying long-context document citations',
      'Fluency in English plus a second global business language',
      'Experience evaluating grounded Q&A outputs',
    ],
    prepTips: [
      'Always check whether a cited paragraph truly entails the model’s claim.',
    ],
  },
  {
    id: 'emg-14',
    title: 'Contract AI Alignment & Reasoning Evaluator',
    company: 'Anthropic (Contract Evaluator)',
    companyShort: 'AN',
    companyTier: 'Emerging AI Startup',
    category: 'AI Training',
    payMinUsd: 45,
    payMaxUsd: 75,
    payUnit: 'hr',
    location: 'Remote (Select Regions)',
    workType: 'Async Contract',
    postedAgo: '8h ago',
    tags: ['Constitutional AI', 'Reasoning', 'Coding Eval', 'Safety'],
    applyUrl: 'https://www.anthropic.com/careers',
    description:
      'Evaluate complex technical, coding, and nuanced policy responses to improve helpfulness, honesty, and harmlessness.',
    requirements: [
      'Exceptional analytical writing and critical reasoning skills',
      'Domain depth in software engineering, law, math, or sciences',
      'Consistent high-quality rubric explanations',
    ],
    prepTips: [
      'Prioritize nuanced reasoning and intellectual honesty over surface-level style.',
    ],
  },
  {
    id: 'emg-15',
    title: 'Real-Time Search Grounding & Citation Rater',
    company: 'Perplexity AI',
    companyShort: 'PX',
    companyTier: 'Emerging AI Startup',
    category: 'Data Annotation',
    payMinUsd: 25,
    payMaxUsd: 42,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '9h ago',
    tags: ['Search Synthesis', 'Source Quality', 'Factuality', 'Web Research'],
    applyUrl: 'https://www.perplexity.ai/hub/careers',
    description:
      'Grade real-time answer synthesis, source authority ranking, and inline web citation accuracy across breaking queries.',
    requirements: [
      'Strong web research and source-credibility assessment skills',
      'Fast, accurate reading comprehension',
      '15+ hours/week flexible schedule',
    ],
    prepTips: [
      'Distinguish authoritative primary documentation from SEO aggregator blogs.',
    ],
  },
  {
    id: 'emg-16',
    title: 'European & Multilingual Code Reasoning Contributor',
    company: 'Mistral AI',
    companyShort: 'MS',
    companyTier: 'Emerging AI Startup',
    category: 'Coding',
    payMinUsd: 50,
    payMaxUsd: 80,
    payUnit: 'hr',
    location: 'Remote (EMEA / Global)',
    workType: 'Async Contract',
    postedAgo: '10h ago',
    tags: ['Python', 'C++', 'Multilingual', 'Open Weights'],
    applyUrl: 'https://mistral.ai/careers/',
    description:
      'Contribute verified multilingual instruction pairs and high-signal coding solutions for open-weight frontier models.',
    requirements: [
      'Proficiency in Python, TypeScript, or C++',
      'Fluency in English plus French, German, Spanish, or Italian',
      'Clean, idiomatic coding style',
    ],
    prepTips: [
      'Write concise explanations alongside runnable, well-typed code samples.',
    ],
  },
  {
    id: 'emg-17',
    title: 'Professional Voice Contributor & Dialect Narrator',
    company: 'ElevenLabs',
    companyShort: 'EL',
    companyTier: 'Emerging AI Startup',
    category: 'Audio/Voice',
    payMinUsd: 30,
    payMaxUsd: 55,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '11h ago',
    tags: ['Voice Cloning', 'Studio Audio', 'Narration', 'Royalties'],
    applyUrl: 'https://elevenlabs.io/payouts',
    description:
      'Contribute clean studio-grade narration and expressive speech samples for verified voice libraries and dubbing workflows.',
    requirements: [
      'Broadcast-quality condenser mic and treated recording space',
      '30+ minutes of clean, noise-free speech samples',
      'Consistent pacing and clear diction',
    ],
    prepTips: [
      'Keep room tone ultra-quiet and avoid mouth clicks or harsh sibilance.',
    ],
  },
  {
    id: 'emg-18',
    title: 'Multilingual Avatar Lip-Sync & Prosody Reviewer',
    company: 'Synthesia',
    companyShort: 'SY',
    companyTier: 'Emerging AI Startup',
    category: 'Audio/Voice',
    payMinUsd: 24,
    payMaxUsd: 38,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '12h ago',
    tags: ['Video Dubbing', 'Lip Sync QA', 'Prosody', 'Localization'],
    applyUrl: 'https://www.synthesia.io/careers',
    description:
      'Audit AI-dubbed enterprise training videos for phoneme-to-lip alignment, natural stress patterns, and pronunciation accuracy.',
    requirements: [
      'Sharp audio-visual synchronization perception',
      'Bilingual proficiency in English and APAC/European languages',
      'Reliable desktop monitor and studio headphones',
    ],
    prepTips: [
      'Check plosive consonants (p, b, m) for tight visual frame alignment.',
    ],
  },
  {
    id: 'emg-19',
    title: 'AI Video Translation & Expressive Voice QA',
    company: 'HeyGen',
    companyShort: 'HG',
    companyTier: 'Emerging AI Startup',
    category: 'Audio/Voice',
    payMinUsd: 25,
    payMaxUsd: 40,
    payUnit: 'hr',
    location: 'Worldwide Remote',
    workType: 'Async Contract',
    postedAgo: '14h ago',
    tags: ['Voice Dubbing', 'Translation QA', 'Creator AI', 'Audio'],
    applyUrl: 'https://www.heygen.com/careers',
    description:
      'Evaluate translated creator videos for natural voice timbre preservation, timing fit, and idiomatic script accuracy.',
    requirements: [
      'Strong sense of conversational rhythm and dubbing timing',
      'Fluency in English plus Tagalog, Spanish, or Mandarin',
      'Detail-oriented QA reporting',
    ],
    prepTips: [
      'Suggest tighter wording when translated phrases run longer than the original clip.',
    ],
  },
  {
    id: 'emg-20',
    title: 'Visual Effects & Prompt-to-Video Quality Rater',
    company: 'Pika',
    companyShort: 'PK',
    companyTier: 'Emerging AI Startup',
    category: 'Data Annotation',
    payMinUsd: 22,
    payMaxUsd: 36,
    payUnit: 'hr',
    location: 'Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '15h ago',
    tags: ['Video Generation', 'Visual QA', 'Motion Physics', 'Prompt Eval'],
    applyUrl: 'https://pika.art/',
    description:
      'Compare generated short-form video clips for object permanence, smooth physics, and camera control adherence.',
    requirements: [
      'Creative visual eye and familiarity with generative media tools',
      'Consistent preference grading across side-by-side comparisons',
      '10+ hours/week flexible commitment',
    ],
    prepTips: [
      'Look closely at hands, background text, and object continuity across cuts.',
    ],
  },
  {
    id: 'emg-21',
    title: 'Music Genre Tagging & Vocal Melody Evaluator',
    company: 'Suno',
    companyShort: 'SU',
    companyTier: 'Emerging AI Startup',
    category: 'Audio/Voice',
    payMinUsd: 25,
    payMaxUsd: 42,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '16h ago',
    tags: ['Music AI', 'Audio Tagging', 'Arrangement', 'Lyrics QA'],
    applyUrl: 'https://suno.com/careers',
    description:
      'Label instrumentation, vocal clarity, tempo transitions, and genre fidelity for generative audio and songwriting models.',
    requirements: [
      'Music production, audio engineering, or songwriting background',
      'Studio headphones or monitor speakers',
      'Familiarity with diverse global music genres',
    ],
    prepTips: [
      'Note subtle mix muddiness, vocal artifacts, or tempo drift cleanly.',
    ],
  },
  {
    id: 'emg-22',
    title: 'Audio Mastering & Musicality Preference Analyst',
    company: 'Udio',
    companyShort: 'UD',
    companyTier: 'Emerging AI Startup',
    category: 'Audio/Voice',
    payMinUsd: 26,
    payMaxUsd: 45,
    payUnit: 'hr',
    location: 'Remote',
    workType: 'Async Contract',
    postedAgo: '18h ago',
    tags: ['Audio Mastering', 'Music Eval', 'Stem Clarity', 'RLHF'],
    applyUrl: 'https://www.udio.com/',
    description:
      'Rank paired musical generations for stereo imaging, lyrical intelligibility, harmonic progression, and production polish.',
    requirements: [
      'Trained ear in mixing, mastering, or musical arrangement',
      'Clear written rationale describing sonic differences',
      'Flexible weekly task volume',
    ],
    prepTips: [
      'Evaluate both musicality and technical mix balance independently.',
    ],
  },
  {
    id: 'emg-23',
    title: 'Domain Expert — Legal Document & Clause AI Reviewer',
    company: 'Harvey AI',
    companyShort: 'HV',
    companyTier: 'Emerging AI Startup',
    category: 'Remote',
    payMinUsd: 85,
    payMaxUsd: 135,
    payUnit: 'hr',
    location: 'Remote (Global Legal Experts)',
    workType: 'Part-Time Flexible',
    postedAgo: '19h ago',
    tags: ['Legal AI', 'Contract Review', 'Citations', 'Domain Expert'],
    applyUrl: 'https://www.harvey.ai/careers',
    description:
      'Audit legal summarization outputs, verify statutory citations, and grade complex contract analysis reasoning.',
    requirements: [
      'JD, LLB, or licensed legal/paralegal contract review background',
      'Extreme precision in citation verification and clause risk flagging',
      'Strict confidentiality and async discipline',
    ],
    prepTips: [
      'Flag any hallucinated case numbers or misquoted clause thresholds immediately.',
    ],
  },
  {
    id: 'emg-24',
    title: 'Enterprise Knowledge Search & Connector QA Engineer',
    company: 'Glean',
    companyShort: 'GL',
    companyTier: 'Emerging AI Startup',
    category: 'Remote',
    payMinUsd: 130000,
    payMaxUsd: 175000,
    payUnit: 'yr',
    location: 'Remote',
    workType: 'Full-Time Remote',
    postedAgo: '21h ago',
    tags: ['Enterprise Search', 'TypeScript', 'Python', 'Eval Pipelines'],
    applyUrl: 'https://www.glean.com/careers',
    description:
      'Build automated relevance benchmarks and permission-aware search test harnesses across enterprise SaaS knowledge graphs.',
    requirements: [
      '3+ years software or QA automation engineering in Python/TypeScript',
      'Understanding of search ranking metrics (NDCG, MRR)',
      'Strong remote collaboration habits',
    ],
    prepTips: [
      'Prepare examples of how you measure search relevance regressions in CI.',
    ],
  },
  {
    id: 'emg-25',
    title: 'Conversational Persona & Roleplay Quality Evaluator',
    company: 'Character.ai',
    companyShort: 'CA',
    companyTier: 'Emerging AI Startup',
    category: 'AI Training',
    payMinUsd: 24,
    payMaxUsd: 38,
    payUnit: 'hr',
    location: 'Global Remote',
    workType: 'Part-Time Flexible',
    postedAgo: '1d ago',
    tags: ['Dialogue AI', 'Persona Consistency', 'Creative Writing', 'Memory'],
    applyUrl: 'https://character.ai/careers',
    description:
      'Test multi-turn conversational memory, character voice consistency, and engaging dialogue pacing across interactive AI personas.',
    requirements: [
      'Strong creative writing and character dialogue instincts',
      'Ability to spot out-of-character drift over 30+ message turns',
      '10+ hours/week flexible availability',
    ],
    prepTips: [
      'Track subtle contradictions in persona backstory across long multi-turn threads.',
    ],
  },
];

interface ExpansionCompany {
  name: string;
  short: string;
  tier: CompanyTier;
  url: string;
  primaryCategory: Exclude<JobCategory, 'All'>;
  minHourly: number;
  maxHourly: number;
}

interface ExpansionTrack {
  category: Exclude<JobCategory, 'All'>;
  titlePrefix: string;
  payUnit: PayUnit;
  workType: JobListing['workType'];
  location: string;
  tags: string[];
  descriptionTemplate: (company: string) => string;
  requirements: string[];
  prepTips: string[];
}

const EXPANSION_COMPANIES: ExpansionCompany[] = [
  {name: 'micro1', short: 'M1', tier: 'Established Leader', url: 'https://micro1.ai', primaryCategory: 'Coding', minHourly: 55, maxHourly: 95},
  {name: 'Mercor', short: 'MC', tier: 'Established Leader', url: 'https://mercor.com', primaryCategory: 'Coding', minHourly: 65, maxHourly: 115},
  {name: 'Babel Audio', short: 'BB', tier: 'Emerging AI Startup', url: 'https://babel.audio', primaryCategory: 'Audio/Voice', minHourly: 22, maxHourly: 38},
  {name: 'Visora', short: 'VS', tier: 'Emerging AI Startup', url: 'https://visora.com', primaryCategory: 'Data Annotation', minHourly: 20, maxHourly: 36},
  {name: 'Spout', short: 'SP', tier: 'Emerging AI Startup', url: 'https://withspout.com', primaryCategory: 'Audio/Voice', minHourly: 22, maxHourly: 40},
  {name: 'Alignerr', short: 'AL', tier: 'Established Leader', url: 'https://www.alignerr.com/', primaryCategory: 'AI Training', minHourly: 35, maxHourly: 60},
  {name: 'Appen', short: 'AP', tier: 'Established Leader', url: 'https://crowdgen.com/', primaryCategory: 'Data Annotation', minHourly: 18, maxHourly: 30},
  {name: 'DataAnnotation', short: 'DA', tier: 'Established Leader', url: 'https://www.dataannotation.tech/', primaryCategory: 'AI Training', minHourly: 25, maxHourly: 45},
  {name: 'Outlier', short: 'OU', tier: 'Established Leader', url: 'https://outlier.ai/', primaryCategory: 'AI Training', minHourly: 35, maxHourly: 65},
  {name: 'Remotasks', short: 'RT', tier: 'Established Leader', url: 'https://www.remotasks.com/', primaryCategory: 'Data Annotation', minHourly: 18, maxHourly: 32},
  {name: 'Scale AI', short: 'SC', tier: 'Established Leader', url: 'https://scale.com/careers', primaryCategory: 'AI Training', minHourly: 32, maxHourly: 55},
  {name: 'Telus International', short: 'TI', tier: 'Established Leader', url: 'https://www.telusdigital.com/careers', primaryCategory: 'Remote', minHourly: 18, maxHourly: 28},
  {name: 'Welocalize', short: 'WL', tier: 'Established Leader', url: 'https://www.welocalize.com/careers/', primaryCategory: 'Remote', minHourly: 19, maxHourly: 30},
  {name: 'RWS', short: 'RW', tier: 'Established Leader', url: 'https://www.rws.com/about/careers/', primaryCategory: 'Data Annotation', minHourly: 20, maxHourly: 34},
  {name: 'Lionbridge', short: 'LB', tier: 'Established Leader', url: 'https://careers.lionbridge.com/', primaryCategory: 'Audio/Voice', minHourly: 20, maxHourly: 32},
  {name: 'OneForma', short: 'OF', tier: 'Established Leader', url: 'https://www.oneforma.com/', primaryCategory: 'Data Annotation', minHourly: 18, maxHourly: 29},
  {name: 'Clickworker', short: 'CW', tier: 'Established Leader', url: 'https://www.clickworker.com/', primaryCategory: 'Data Annotation', minHourly: 15, maxHourly: 25},
  {name: 'Toloka', short: 'TK', tier: 'Established Leader', url: 'https://toloka.ai/tolokers/', primaryCategory: 'AI Training', minHourly: 20, maxHourly: 36},
  {name: 'Turing', short: 'TU', tier: 'Established Leader', url: 'https://www.turing.com/jobs', primaryCategory: 'Coding', minHourly: 50, maxHourly: 90},
  {name: 'Andela', short: 'AN', tier: 'Established Leader', url: 'https://www.andela.com/join-andela', primaryCategory: 'Coding', minHourly: 48, maxHourly: 85},
  {name: 'Toptal', short: 'TT', tier: 'Established Leader', url: 'https://www.toptal.com/talent/apply', primaryCategory: 'Coding', minHourly: 65, maxHourly: 120},
  {name: 'BairesDev', short: 'BD', tier: 'Established Leader', url: 'https://www.bairesdev.com/careers/', primaryCategory: 'Coding', minHourly: 42, maxHourly: 75},
  {name: 'Deel', short: 'DL', tier: 'Established Leader', url: 'https://www.deel.com/careers/', primaryCategory: 'Remote', minHourly: 40, maxHourly: 70},
  {name: 'GitLab', short: 'GL', tier: 'Established Leader', url: 'https://about.gitlab.com/jobs/', primaryCategory: 'Coding', minHourly: 60, maxHourly: 105},
  {name: 'Automattic', short: 'AU', tier: 'Established Leader', url: 'https://automattic.com/work-with-us/', primaryCategory: 'Remote', minHourly: 45, maxHourly: 80},
  {name: 'Zapier', short: 'ZP', tier: 'Established Leader', url: 'https://zapier.com/jobs', primaryCategory: 'Remote', minHourly: 48, maxHourly: 85},
  {name: 'Hugging Face', short: 'HF', tier: 'Established Leader', url: 'https://huggingface.co/jobs', primaryCategory: 'Coding', minHourly: 65, maxHourly: 110},
  {name: 'Cohere', short: 'CH', tier: 'Emerging AI Startup', url: 'https://cohere.com/careers', primaryCategory: 'AI Training', minHourly: 42, maxHourly: 72},
  {name: 'Anthropic', short: 'AT', tier: 'Emerging AI Startup', url: 'https://www.anthropic.com/careers', primaryCategory: 'AI Training', minHourly: 50, maxHourly: 85},
  {name: 'OpenAI', short: 'OA', tier: 'Established Leader', url: 'https://openai.com/careers/', primaryCategory: 'AI Training', minHourly: 55, maxHourly: 95},
  {name: 'Perplexity', short: 'PX', tier: 'Emerging AI Startup', url: 'https://www.perplexity.ai/hub/careers', primaryCategory: 'AI Training', minHourly: 34, maxHourly: 58},
  {name: 'Mistral', short: 'MS', tier: 'Emerging AI Startup', url: 'https://mistral.ai/careers/', primaryCategory: 'Coding', minHourly: 58, maxHourly: 98},
  {name: 'Runway', short: 'RN', tier: 'Emerging AI Startup', url: 'https://runwayml.com/careers', primaryCategory: 'Data Annotation', minHourly: 30, maxHourly: 52},
  {name: 'ElevenLabs', short: 'EL', tier: 'Emerging AI Startup', url: 'https://elevenlabs.io/careers', primaryCategory: 'Audio/Voice', minHourly: 28, maxHourly: 50},
  {name: 'AssemblyAI', short: 'AS', tier: 'Emerging AI Startup', url: 'https://www.assemblyai.com/careers', primaryCategory: 'Audio/Voice', minHourly: 32, maxHourly: 56},
];

const EXPANSION_TRACKS: ExpansionTrack[] = [
  {
    category: 'AI Training',
    titlePrefix: 'RLHF Factuality & Prompt Grading Specialist',
    payUnit: 'hr',
    workType: 'Async Contract',
    location: 'Worldwide Remote',
    tags: ['RLHF', 'Factuality', 'Prompt Eval', 'LLM'],
    descriptionTemplate: (company) =>
      `Audit multi-turn LLM outputs, rank model responses against factual rubrics, and write concise improvement rationales for ${company}.`,
    requirements: [
      'Strong analytical reading comprehension and fact-checking accuracy',
      'Ability to follow multi-page rubric instructions consistently',
      'Reliable desktop setup with 10+ hrs/week async availability',
    ],
    prepTips: [
      'Always verify numerical claims and dates before scoring truthfulness.',
      'Explain why the winning response outperforms on all rubric criteria.',
    ],
  },
  {
    category: 'Coding',
    titlePrefix: 'AI Code Evaluation & Unit Test Reviewer',
    payUnit: 'hr',
    workType: 'Async Contract',
    location: 'Global Remote',
    tags: ['Python', 'TypeScript', 'Unit Testing', 'Code Review'],
    descriptionTemplate: (company) =>
      `Benchmark synthesized code snippets, write edge-case unit tests, and debug algorithmic failures across repositories for ${company}.`,
    requirements: [
      'Proficiency in Python, TypeScript, Go, or SQL debugging',
      'Experience writing deterministic unit and regression test suites',
      'Clear written technical justification for bug fixes',
    ],
    prepTips: [
      'Test boundary inputs (empty arrays, nulls, timeouts) when scoring code.',
      'Keep refactored reference implementations clean and idiomatic.',
    ],
  },
  {
    category: 'Audio/Voice',
    titlePrefix: 'Expressive Speech & ASR Quality Contributor',
    payUnit: 'hr',
    workType: 'Part-Time Flexible',
    location: 'Worldwide Remote',
    tags: ['Voiceover', 'ASR', 'Prosody', 'Audio QA'],
    descriptionTemplate: (company) =>
      `Record natural conversational speech clips and verify speaker turn segmentation and acoustic clarity for ${company} voice models.`,
    requirements: [
      'Quiet recording environment free of echo or background hum',
      'Clear articulation with natural conversational pacing',
      'External USB/XLR microphone or clean headset input',
    ],
    prepTips: [
      'Warm up your mic and verify peak levels stay between -12 dB and -6 dB.',
      'Leave 0.5 seconds of room tone before and after each spoken line.',
    ],
  },
  {
    category: 'Data Annotation',
    titlePrefix: 'Multimodal Bounding Box & QA Annotator',
    payUnit: 'hr',
    workType: 'Async Contract',
    location: 'Worldwide Remote',
    tags: ['Data Annotation', 'Computer Vision', 'QA', 'Segmentation'],
    descriptionTemplate: (company) =>
      `Label complex image, video, and document layouts with pixel-accurate masks and verify taxonomy consistency at ${company}.`,
    requirements: [
      'High visual precision and patience for detailed labeling guidelines',
      '1080p+ display with stable broadband connection',
      'Track record meeting 96%+ QA audit thresholds',
    ],
    prepTips: [
      'Zoom in on object edges and check occlusion rules in the taxonomy guide.',
      'Double-check class labels before submitting each batch.',
    ],
  },
  {
    category: 'Remote',
    titlePrefix: 'Async AI Operations & Quality Specialist',
    payUnit: 'hr',
    workType: 'Full-Time Remote',
    location: 'Anywhere Remote',
    tags: ['Remote Ops', 'Quality Assurance', 'Workflows', 'Async'],
    descriptionTemplate: (company) =>
      `Coordinate distributed annotator guidelines, audit QA throughput dashboards, and streamline async documentation workflows at ${company}.`,
    requirements: [
      '2+ years in remote operations, QA, or technical support',
      'Strong async written communication in English',
      'Comfort with spreadsheets, issue trackers, and SOP documentation',
    ],
    prepTips: [
      'Highlight concrete async collaboration habits and SLA tracking metrics.',
      'Prepare concise examples of catching systemic quality regressions.',
    ],
  },
];

const SPECIALTY_FOCUSES = [
  'STEM & Quantitative Reasoning',
  'Safety & Policy Alignment',
  'Search Relevance & Citations',
  'Multilingual Localization QA',
  'Tool-Use & Agentic Workflows',
  'Long-Context Document Synthesis',
  'SQL & Data Pipeline Verification',
  'Conversational Dialogue Fluency',
  'OCR & Structured Table Extraction',
  'Latency & Edge-Case Benchmarking',
  'Technical Documentation & API QA',
];

const POSTED_AGO_SLOTS = [
  '12m ago',
  '28m ago',
  '45m ago',
  '1h ago',
  '2h ago',
  '3h ago',
  '5h ago',
  '8h ago',
  '12h ago',
  '1d ago',
  '2d ago',
];

function generateExpandedJobs(): JobListing[] {
  const generated: JobListing[] = [];
  // Synthetic role variations are intentionally disabled. Only manually curated guides remain public.
  const totalToGenerate = 0;

  for (let i = 0; i < totalToGenerate; i++) {
    const num = 51 + i;
    const company = EXPANSION_COMPANIES[i % EXPANSION_COMPANIES.length];
    const passIndex = Math.floor(i / EXPANSION_COMPANIES.length);
    const track =
      passIndex === 0
        ? EXPANSION_TRACKS.find(
            (t) => t.category === company.primaryCategory
          ) || EXPANSION_TRACKS[0]
        : EXPANSION_TRACKS[(i + passIndex) % EXPANSION_TRACKS.length];

    const specialty = SPECIALTY_FOCUSES[(i * 3 + passIndex) % SPECIALTY_FOCUSES.length];
    const isAnnual = track.workType === 'Full-Time Remote' && i % 4 === 0;
    const payUnit: PayUnit = isAnnual ? 'yr' : 'hr';

    const baseMin =
      track.category === 'Coding'
        ? Math.max(company.minHourly, 42)
        : track.category === 'AI Training'
          ? Math.max(22, Math.min(company.minHourly, 48))
          : Math.max(16, Math.min(company.minHourly, 34));
    const baseMax =
      track.category === 'Coding'
        ? Math.max(baseMin + 20, company.maxHourly)
        : track.category === 'AI Training'
          ? Math.max(baseMin + 15, Math.min(company.maxHourly, 72))
          : Math.max(baseMin + 10, Math.min(company.maxHourly, 48));

    const payMinUsd = isAnnual ? baseMin * 1850 : baseMin + (passIndex % 4) * 2;
    const payMaxUsd = isAnnual ? baseMax * 1950 : baseMax + (passIndex % 4) * 3;

    const title = `${track.titlePrefix} — ${specialty}`;

    generated.push({
      id: `gen-job-${num}`,
      title,
      company: company.name,
      companyShort: company.short,
      companyTier: company.tier,
      category: track.category,
      payMinUsd,
      payMaxUsd,
      payUnit,
      location: track.location,
      workType: track.workType,
      postedAgo: POSTED_AGO_SLOTS[i % POSTED_AGO_SLOTS.length],
      urgent: i % 7 === 0,
      tags: Array.from(
        new Set([...track.tags.slice(0, 3), specialty.split(' ')[0]])
      ),
      applyUrl: resolveApplyUrl(company.name, company.url),
      description: `${track.descriptionTemplate(company.name)} Focus area: ${specialty}.`,
      requirements: track.requirements,
      prepTips: track.prepTips,
    });
  }

  return generated;
}

export const INITIAL_JOBS: JobListing[] = BASE_INITIAL_JOBS.map((job) => ({
  ...job,
  // Compensation is not sourced from a live vacancy; never display it as an advertised rate.
  payMinUsd: 0,
  payMaxUsd: 0,
}));

export interface PlatformSummary {
  name: string;
  short: string;
  tier: CompanyTier;
  focus: string;
  typicalMinUsd: number;
  typicalMaxUsd: number;
  payoutSchedule: string;
  url: string;
}

export const TOP_PLATFORMS: PlatformSummary[] = [
  {
    name: 'micro1',
    short: 'M1',
    tier: 'Established Leader',
    focus: 'AI-vetted engineering, Python/TS coding & frontier model evaluation',
    typicalMinUsd: 55,
    typicalMaxUsd: 95,
    payoutSchedule: 'Bi-weekly · Wise / Bank',
    url: 'https://company.micro1.ai/register/?referralCode=6b7ac363-af71-444b-97b2-ecc6dcc25f19&utm_source=referral&utm_medium=share&utm_campaign=job_referral',
  },
  {
    name: 'Mercor',
    short: 'MC',
    tier: 'Established Leader',
    focus: 'High-rate SWE benchmarks, agentic coding & domain experts',
    typicalMinUsd: 65,
    typicalMaxUsd: 120,
    payoutSchedule: 'Weekly · Stripe Connect',
    url: 'https://mercor.com',
  },
  {
    name: 'Alignerr',
    short: 'AL',
    tier: 'Established Leader',
    focus: 'Reasoning rubrics, STEM grading & multilingual LLM training',
    typicalMinUsd: 35,
    typicalMaxUsd: 60,
    payoutSchedule: 'Weekly · Stripe / Deel',
    url: 'https://www.alignerr.com/',
  },
  {
    name: 'Outlier',
    short: 'OU',
    tier: 'Established Leader',
    focus: 'RLHF, math proofs, coding verification & generalist reasoning',
    typicalMinUsd: 40,
    typicalMaxUsd: 65,
    payoutSchedule: 'Weekly · PayPal / AirTM',
    url: 'https://outlier.ai/',
  },
  {
    name: 'Babel Audio',
    short: 'BB',
    tier: 'Emerging AI Startup',
    focus: 'Conversational audio recording, voice acting & prosody labeling',
    typicalMinUsd: 22,
    typicalMaxUsd: 38,
    payoutSchedule: 'Weekly · Wise / PayPal',
    url: 'https://babel.audio',
  },
  {
    name: 'Visora',
    short: 'VS',
    tier: 'Emerging AI Startup',
    focus: 'Multimodal video segmentation, robotics & spatial vision annotation',
    typicalMinUsd: 20,
    typicalMaxUsd: 38,
    payoutSchedule: 'Bi-weekly · Wise / Payoneer',
    url: 'https://visora.com',
  },
  {
    name: 'Spout',
    short: 'SP',
    tier: 'Emerging AI Startup',
    focus: 'Acoustic phonetics, dialect ASR transcription & audio micro-tasks',
    typicalMinUsd: 20,
    typicalMaxUsd: 42,
    payoutSchedule: 'Weekly · Wise / PayPal',
    url: 'https://withspout.com',
  },
  {
    name: 'Scale AI',
    short: 'SC',
    tier: 'Established Leader',
    focus: 'Red-teaming, AI safety policy alignment & multimodal evals',
    typicalMinUsd: 32,
    typicalMaxUsd: 52,
    payoutSchedule: 'Weekly · Stripe / PayPal',
    url: 'https://scale.com/careers',
  },
  {
    name: 'Surge AI',
    short: 'SG',
    tier: 'Emerging AI Startup',
    focus: 'Complex coding prompts, RLHF & adversarial reasoning sets',
    typicalMinUsd: 45,
    typicalMaxUsd: 75,
    payoutSchedule: 'Weekly · PayPal / Bank',
    url: 'https://www.surgehq.ai/',
  },
];
