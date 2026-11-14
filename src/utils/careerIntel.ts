import {JobListing, TOP_PLATFORMS} from '../data/jobs';

export const QUICK_SKILL_SUGGESTIONS = [
  'Python',
  'TypeScript',
  'RLHF',
  'Prompt Eval',
  'Voiceover',
  'Data Annotation',
  'Math / STEM',
  'Multilingual',
];

export interface SkillMatchResult {
  score: number;
  matchedSkills: string[];
  totalSkills: number;
}

export function parseUserSkills(rawSkills: string): string[] {
  return rawSkills
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 12);
}

export function computeSkillMatch(
  job: JobListing,
  rawSkills: string
): SkillMatchResult | null {
  const skills = parseUserSkills(rawSkills);
  if (skills.length === 0) return null;

  const haystack = [
    job.title,
    job.category,
    job.description,
    ...job.tags,
    ...job.requirements,
  ]
    .join(' ')
    .toLowerCase();

  const matchedSkills: string[] = [];

  for (const skill of skills) {
    const normalized = skill.toLowerCase();
    const parts = normalized.split(/[/\s]+/).filter((p) => p.length >= 2);
    const hit =
      haystack.includes(normalized) ||
      (parts.length > 1 && parts.some((p) => haystack.includes(p)));
    if (hit) {
      matchedSkills.push(skill);
    }
  }

  const ratio = matchedSkills.length / skills.length;
  const score =
    matchedSkills.length === 0
      ? 0
      : Math.min(99, Math.max(45, Math.round(45 + ratio * 54)));

  return {
    score,
    matchedSkills,
    totalSkills: skills.length,
  };
}

export interface AssessmentPayoutInfo {
  screeningFormat: string;
  screeningDuration: string;
  payoutSchedule: string;
}

export function getAssessmentAndPayoutInfo(
  job: JobListing
): AssessmentPayoutInfo {
  const matchedPlatform = TOP_PLATFORMS.find(
    (p) => p.name.toLowerCase() === job.company.toLowerCase()
  );

  const payoutSchedule =
    matchedPlatform?.payoutSchedule ||
    (job.workType === 'Full-Time Remote'
      ? 'Monthly / Bi-weekly · Direct Payroll'
      : 'Weekly / Bi-weekly · Wise / Stripe / PayPal');

  const companyLower = job.company.toLowerCase();
  if (companyLower.includes('micro1') || companyLower.includes('mercor')) {
    return {
      screeningFormat: 'AI Technical Video Interview',
      screeningDuration: '~15–20 mins',
      payoutSchedule,
    };
  }
  if (job.category === 'Audio/Voice') {
    return {
      screeningFormat: 'Voice Sample & Mic Quality Check',
      screeningDuration: '~10 mins',
      payoutSchedule,
    };
  }
  if (job.category === 'Coding') {
    return {
      screeningFormat: 'Coding Exercise & Rubric Review',
      screeningDuration: '~30–45 mins',
      payoutSchedule,
    };
  }
  if (job.category === 'AI Training') {
    return {
      screeningFormat: 'LLM Rubric & Factuality Quiz',
      screeningDuration: '~20 mins',
      payoutSchedule,
    };
  }
  if (job.category === 'Data Annotation') {
    return {
      screeningFormat: 'Sample Labeling Accuracy Test',
      screeningDuration: '~15–25 mins',
      payoutSchedule,
    };
  }
  return {
    screeningFormat: 'Direct Application & Portfolio Review',
    screeningDuration: '~5–10 mins',
    payoutSchedule,
  };
}
