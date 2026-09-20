/**
 * projectAnalysis.service.ts
 *
 * Deterministic per-project analysis service.
 * No LLM. No hard-coded project names. No second skill taxonomy.
 *
 * Reuses the existing SKILL_TAXONOMY aliases — skills are matched
 * identically to the way resumeScoring and skillExtractor work.
 *
 * ─── Strength formula (max 100) ──────────────────────────────────────────────
 *
 *   Implementation evidence   0–25   Distinct action verbs in the project text.
 *                                    Counts: 0→0 | 1→10 | 2→18 | 3+→25.
 *                                    Prevents gaming: only distinct verbs count.
 *
 *   Technical depth           0–25   Diminishing-returns on unique taxonomy
 *                                    skill count: 1st→10 | 2nd→7 | 3rd→5 |
 *                                    4th→3 | 5th+→0. Cap = 25.
 *
 *   Measurable outcomes       0–20   Specific outcome patterns (%, user counts,
 *                                    latency) → 20. Bare 2-digit number → 10.
 *
 *   Deployment/link evidence  0–15   Live demo URL → 15 | Repo URL → 10 |
 *                                    Any link → 5 | No links → 0.
 *
 *   Description richness      0–15   Clean text length: 0–30→0 | 31–100→5 |
 *                                    101–200→10 | 201+→15.
 *                                    Ceiling prevents length-gaming.
 *
 * ─── Domain detection ────────────────────────────────────────────────────────
 *
 *   Confidence = (skillMatches×2 + keywordMatches) / maxPossibleSignals.
 *   A domain is emitted only when confidence ≥ 0.25.
 *   A project may have multiple domains.
 *   Domain is NOT inferred from the project title alone.
 */

import { SKILL_TAXONOMY } from "../data/skills/skillTaxonomy";
import type { SkillCategory } from "../data/skills/skillTaxonomy";
import type { StructuredProject } from "./resumeStructuredExtractor.service";

// ─── Exported interfaces ──────────────────────────────────────────────────────

export interface ProjectDomain {
  name: string;
  confidence: number; // 0–1, rounded to 2 dp
}

export interface ProjectStrength {
  overall: number;                // 0–100
  implementationEvidence: number; // 0–25
  technicalDepth: number;         // 0–25
  measurableOutcomes: number;     // 0–20
  deploymentEvidence: number;     // 0–15
  descriptionRichness: number;    // 0–15
}

export interface ProjectEvidence {
  actionVerbs: string[];    // distinct lowercase verbs detected
  hasOutcome: boolean;
  hasLink: boolean;
  hasGitHubLink: boolean;
  hasLiveDemo: boolean;
  descriptionLength: number; // clean character count
}

export interface ProjectAnalysisInput {
  title: string;
  description: string;
  technologies?: string[];
  links?: string[];
}

export interface AnalyzedProject {
  title: string;
  description: string;
  detectedSkills: string[];    // canonical SKILL_TAXONOMY names
  skillCategories: SkillCategory[];
  domains: ProjectDomain[];
  strength: ProjectStrength;
  evidence: ProjectEvidence;
  links: string[];
}

// ─── Internal constants ───────────────────────────────────────────────────────

/**
 * Action verbs signalling genuine implementation work.
 * Only DISTINCT verbs are counted; repeated occurrences are collapsed.
 */
const IMPL_VERB_RE =
  /\b(built|developed|designed|created|implemented|deployed|engineered|architected|optimized|automated|integrated|launched|delivered|improved|migrated|refactored|scaled|configured|trained|tested|wrote|reduced|increased|led|managed|established|leveraged|collaborated)\b/gi;

/**
 * Specific measurable-outcome patterns: percentages, dollar amounts, user/performance counts.
 * More specific than bare number detection to avoid false positives.
 */
const OUTCOME_RE =
  /(?:\b\d+(?:\.\d+)?%|\$\s?\d+(?:,\d+)*|\b\d+\s*[kK]\b|\b\d+\s*(?:users?|customers?|clients?|requests?|transactions?|records?|downloads?|ms|milliseconds?|seconds?|minutes?|hours?|days?|months?|times?\s*faster|x\s*faster|x\s*improvement))/i;

/** Fallback: any 2+ digit number in the text (weaker outcome signal). */
const HAS_NUMBER_RE = /\b\d{2,}\b/;

/** Repository (GitHub/GitLab/Bitbucket) URL. */
const REPO_URL_RE = /https?:\/\/(?:github|gitlab|bitbucket)\.com\/[^\s,;)>"']+/i;

/** Live demo URL — deployed app hosting domains or app/demo/live subdomains/paths. */
const LIVE_DEMO_RE =
  /https?:\/\/[^\s,;)>"']*(?:vercel\.app|netlify\.app|render\.com|fly\.dev|pages\.dev|herokuapp\.com|firebaseapp\.com|github\.io|gitlab\.io|\b(?:demo|app|live)\b)[^\s,;)>"']*/i;

/**
 * Diminishing-returns points per additional unique skill.
 * 1st: 10 | 2nd: 7 | 3rd: 5 | 4th: 3 | 5th+: 0 → cap = 25.
 * Prevents gaming by stacking many low-signal technologies.
 */
export const SKILL_DEPTH_POINTS = [10, 7, 5, 3] as const;

// ─── Taxonomy alias matcher (built once at module load) ───────────────────────

const _escapeRE = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const _sortedAliases = [...SKILL_TAXONOMY]
  .flatMap((def) => def.aliases.map((alias) => ({ alias, def })))
  .sort((a, b) => b.alias.length - a.alias.length); // longest first → no prefix collisions

const _aliasLookup = new Map(
  _sortedAliases.map(({ alias, def }) => [alias.toLowerCase(), def])
);

/**
 * Capture group pattern consistent with skillExtractor.service.ts:
 *   Group 1 = preceding non-word char (discarded)
 *   Group 2 = matched alias text
 */
const _MATCHER_PATTERN = new RegExp(
  `(^|[^A-Za-z0-9])(${_sortedAliases.map(({ alias }) => _escapeRE(alias)).join("|")})(?=$|[^A-Za-z0-9])`,
  "gi"
);

// ─── Domain signal definitions ────────────────────────────────────────────────

export interface DomainSignal {
  name: string;
  /** Canonical SKILL_TAXONOMY names that signal this domain. */
  skillNames: string[];
  /** Case-insensitive keywords in project text. */
  textKeywords: string[];
}

/**
 * Generic domain signals.
 * NOT based on specific project names, company names, or personal data.
 * Confidence is computed from evidence — never assumed from title alone.
 */
export const DOMAIN_SIGNALS: readonly DomainSignal[] = [
  {
    name: "Web Development",
    skillNames: [
      "React", "Angular", "Vue.js", "HTML", "CSS", "Tailwind CSS", "Next.js",
      "Node.js", "Express", "REST API", "GraphQL",
    ],
    textKeywords: [
      "web", "website", "frontend", "backend", "fullstack", "full-stack",
      "full stack", "api", "browser", "http",
    ],
  },
  {
    name: "Mobile Development",
    skillNames: ["Android", "iOS", "React Native"],
    textKeywords: ["mobile", "android", "ios", "smartphone", "tablet", "flutter"],
  },
  {
    name: "AI / Machine Learning",
    skillNames: [
      "Machine Learning", "TensorFlow", "PyTorch", "Scikit-learn", "Generative AI",
    ],
    textKeywords: [
      "model", "training", "inference", "predict", "classifier", "neural network",
      "deep learning", "regression", "classification", "clustering", "generative",
    ],
  },
  {
    name: "Data Science",
    skillNames: ["Pandas", "NumPy", "Data Analysis", "Python"],
    textKeywords: [
      "data", "analysis", "visualization", "dashboard", "statistics",
      "dataset", "notebook", "jupyter", "chart", "plot",
    ],
  },
  {
    name: "Cloud / DevOps",
    skillNames: [
      "AWS", "Microsoft Azure", "Google Cloud", "Docker", "Kubernetes",
      "CI/CD", "Jenkins", "Terraform",
    ],
    textKeywords: [
      "cloud", "deploy", "deployment", "pipeline", "container",
      "infrastructure", "serverless", "microservice",
    ],
  },
  {
    name: "Cybersecurity",
    skillNames: ["OAuth", "Cybersecurity"],
    textKeywords: [
      "security", "authentication", "authorization", "encryption",
      "firewall", "vulnerability", "penetration", "ssl", "tls", "jwt",
    ],
  },
  {
    name: "NLP",
    skillNames: ["Natural Language Processing"],
    textKeywords: [
      "nlp", "text", "sentiment", "language model", "tokenization",
      "named entity", "chatbot", "summarization", "translation",
    ],
  },
  {
    name: "Computer Vision",
    skillNames: ["Python", "TensorFlow", "PyTorch"],
    textKeywords: [
      "image", "vision", "object detection", "ocr", "opencv",
      "face recognition", "segmentation", "video processing",
    ],
  },
] as const;

// ─── Exported sub-score functions (exported for unit testing) ─────────────────

/**
 * Extracts canonical skill names from project text using the SKILL_TAXONOMY.
 * Skills requiring explicit skill-section context (C, Go, R, OS) are skipped
 * to avoid false positives in project description prose.
 * Each canonical skill appears at most once (deduplicated).
 */
export const extractProjectSkills = (text: string): string[] => {
  if (!text.trim()) return [];
  const found = new Map<string, true>();
  // Create a fresh regex instance per call to avoid lastIndex cross-contamination.
  const re = new RegExp(_MATCHER_PATTERN.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const matchedText = match[2];
    if (!matchedText) continue;
    const def = _aliasLookup.get(matchedText.toLowerCase());
    // Skip skills that require explicit skill-section context (too ambiguous in prose).
    if (!def || def.requiresExplicitSkillContext) continue;
    found.set(def.name, true);
  }
  return [...found.keys()];
};

/**
 * Technical depth scoring (0–25).
 * Diminishing returns prevent gaming by stacking many low-value technologies.
 */
export const scoreTechnicalDepth = (skillCount: number): number => {
  let total = 0;
  for (let i = 0; i < Math.min(skillCount, SKILL_DEPTH_POINTS.length); i++) {
    total += SKILL_DEPTH_POINTS[i];
  }
  return Math.min(25, total);
};

/**
 * Description richness (0–15).
 * Ceiling prevents length-gaming — a project cannot score highly on richness
 * alone just by having a very long description.
 */
export const scoreDescriptionRichness = (description: string): number => {
  const cleanLen = description
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim().length;
  if (cleanLen <= 30) return 0;
  if (cleanLen <= 100) return 5;
  if (cleanLen <= 200) return 10;
  return 15;
};

/**
 * Infers project domains from detected skills and full project text.
 * Confidence = (skillMatches × 2 + keywordMatches) / maxPossibleSignals.
 * Only emits a domain when confidence ≥ 0.25.
 * Multiple domains may be emitted; sorted by confidence descending.
 */
export const detectProjectDomains = (
  detectedSkills: string[],
  projectText: string
): ProjectDomain[] => {
  const lowerText = projectText.toLowerCase();
  const skillSet = new Set(detectedSkills.map((s) => s.toLowerCase()));
  const results: ProjectDomain[] = [];

  for (const signal of DOMAIN_SIGNALS) {
    const skillMatches = signal.skillNames.filter((s) =>
      skillSet.has(s.toLowerCase())
    ).length;
    const keywordMatches = signal.textKeywords.filter((kw) =>
      lowerText.includes(kw)
    ).length;
    const maxPossible = signal.skillNames.length * 2 + signal.textKeywords.length;
    if (maxPossible === 0) continue;
    const confidence = Math.min(1, (skillMatches * 2 + keywordMatches) / maxPossible);
    if (confidence >= 0.25) {
      results.push({ name: signal.name, confidence: Math.round(confidence * 100) / 100 });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
};

// ─── Internal sub-score helpers ───────────────────────────────────────────────

const _scoreImplementation = (text: string): { score: number; verbs: string[] } => {
  const matches = [...text.matchAll(new RegExp(IMPL_VERB_RE.source, "gi"))];
  const distinct = new Set(matches.map((m) => m[0].toLowerCase()));
  const verbs = [...distinct];
  const n = distinct.size;
  // 0 verbs → 0 | 1 verb → 10 | 2 verbs → 18 | 3+ → 25
  const score = n === 0 ? 0 : n === 1 ? 10 : n === 2 ? 18 : 25;
  return { score, verbs };
};

const _scoreOutcomes = (text: string): { score: number; hasOutcome: boolean } => {
  const hasOutcome = OUTCOME_RE.test(text);
  return { score: hasOutcome ? 20 : HAS_NUMBER_RE.test(text) ? 10 : 0, hasOutcome };
};

const _scoreDeployment = (
  links: string[]
): { score: number; hasLink: boolean; hasGitHubLink: boolean; hasLiveDemo: boolean } => {
  const hasLink = links.length > 0;
  const hasGitHubLink = links.some((l) => REPO_URL_RE.test(l));
  const hasLiveDemo = links.some((l) => LIVE_DEMO_RE.test(l));
  return {
    score: hasLiveDemo ? 15 : hasGitHubLink ? 10 : hasLink ? 5 : 0,
    hasLink,
    hasGitHubLink,
    hasLiveDemo,
  };
};

// ─── Main entry points ────────────────────────────────────────────────────────

/**
 * Analyzes a single project deterministically. Pure function — no I/O.
 */
export const analyzeProject = (project: ProjectAnalysisInput): AnalyzedProject => {
  const projectText = `${project.title} ${project.description}`.trim();
  const links = project.links ?? [];

  const detectedSkills = extractProjectSkills(projectText);

  const skillDefs = detectedSkills
    .map((name) => SKILL_TAXONOMY.find((d) => d.name === name))
    .filter((d): d is (typeof SKILL_TAXONOMY)[number] => d !== undefined);
  const skillCategories = [...new Set(skillDefs.map((d) => d.category))];

  const { score: implementationEvidence, verbs: actionVerbs } =
    _scoreImplementation(projectText);
  const technicalDepth = scoreTechnicalDepth(detectedSkills.length);
  const { score: measurableOutcomes, hasOutcome } = _scoreOutcomes(projectText);
  const { score: deploymentEvidence, hasLink, hasGitHubLink, hasLiveDemo } =
    _scoreDeployment(links);
  const descriptionRichness = scoreDescriptionRichness(project.description);

  const overall = Math.min(
    100,
    implementationEvidence + technicalDepth + measurableOutcomes +
    deploymentEvidence + descriptionRichness
  );

  const domains = detectProjectDomains(detectedSkills, projectText);

  return {
    title: project.title,
    description: project.description,
    detectedSkills,
    skillCategories,
    domains,
    strength: {
      overall,
      implementationEvidence,
      technicalDepth,
      measurableOutcomes,
      deploymentEvidence,
      descriptionRichness,
    },
    evidence: {
      actionVerbs,
      hasOutcome,
      hasLink,
      hasGitHubLink,
      hasLiveDemo,
      descriptionLength: project.description.trim().length,
    },
    links,
  };
};

/**
 * Analyzes multiple projects and returns them sorted by overall strength descending.
 */
export const analyzeProjects = (projects: ProjectAnalysisInput[]): AnalyzedProject[] =>
  projects.map(analyzeProject).sort((a, b) => b.strength.overall - a.strength.overall);

/**
 * Returns per-project strength scores sorted highest-first.
 * Consumed by resumeScoring.service.ts for portfolio-quality scoring.
 */
export const getProjectStrengthScores = (projects: ProjectAnalysisInput[]): number[] =>
  analyzeProjects(projects).map((p) => p.strength.overall);
