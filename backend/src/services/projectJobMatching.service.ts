/**
 * projectJobMatching.service.ts
 *
 * Deterministic per-project job-relevance scoring.
 * Does NOT replace or modify the existing overall JD match score in
 * jobMatch.service.ts — this is an ADDITIONAL evidence layer.
 *
 * ─── Relevance formula (0–100) ────────────────────────────────────────────────
 *
 *   Required skill coverage    45%   matched required skills / total required
 *                                    When JD has no required skills → full credit.
 *
 *   Preferred skill coverage   20%   matched preferred skills / total preferred
 *                                    When JD has no preferred skills → full credit.
 *
 *   Domain alignment           20%   weighted Jaccard between project domains
 *                                    (confidence-weighted) and JD-inferred domains.
 *
 *   Responsibility alignment   15%   fraction of project's detected skills that
 *                                    appear anywhere in the JD text (captures
 *                                    skills mentioned in prose / responsibilities
 *                                    sections beyond the formal requirements list).
 *
 * ─── Job Value (0–100) ───────────────────────────────────────────────────────
 *
 *   40% × Project Strength + 60% × Relevance
 *
 *   A technically strong but irrelevant project is not highly valuable for this JD.
 *   A highly relevant but weak project is valuable, but capped by evidence quality.
 *
 * ─── Existing scores UNCHANGED ────────────────────────────────────────────────
 *
 *   The existing calculateJobMatch formula (weighted required/preferred/unspecified)
 *   and JOB_MATCH_PRIORITY_WEIGHTS (required=1.0 / preferred=0.5 / unspecified=0.75)
 *   are not touched.
 */

import type { AnalyzedProject } from "./projectAnalysis.service";
import { DOMAIN_SIGNALS } from "./projectAnalysis.service";
import type { ParsedJobDescription, JobRequirement } from "./jobDescription.service";

// ─── Exported types ───────────────────────────────────────────────────────────

export interface ProjectJobRelevance {
  title: string;
  relevanceScore: number;           // 0–100
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  domainAlignment: number;          // 0–1
  responsibilityAlignment: number;  // 0–1
  jobValue: number;                 // 0–100 (strength × 40% + relevance × 60%)
}

// ─── Documented weights ───────────────────────────────────────────────────────

export const PROJECT_RELEVANCE_WEIGHTS = {
  requiredSkillCoverage: 0.45,
  preferredSkillCoverage: 0.20,
  domainAlignment: 0.20,
  responsibilityAlignment: 0.15,
} as const;

export const JOB_VALUE_WEIGHTS = {
  strength: 0.40,
  relevance: 0.60,
} as const;

// ─── JD domain inference ──────────────────────────────────────────────────────

/**
 * Infers which broad domains a JD targets from the canonical skill names in its
 * requirements.  Uses the same DOMAIN_SIGNALS as project analysis so that the
 * project↔JD comparison is symmetric and reuses no extra taxonomy.
 */
const _inferJdDomains = (requirements: JobRequirement[]): Set<string> => {
  const jdSkillNames = new Set(requirements.map((r) => r.name.toLowerCase()));
  const domains = new Set<string>();
  for (const signal of DOMAIN_SIGNALS) {
    const matches = signal.skillNames.filter((s) => jdSkillNames.has(s.toLowerCase())).length;
    if (matches >= 1) domains.add(signal.name);
  }
  return domains;
};

// ─── Domain alignment ─────────────────────────────────────────────────────────

/**
 * Weighted Jaccard: for each project domain, if it appears in the JD's inferred
 * domains, add its confidence to the numerator.  Sum of all project domain
 * confidences is the denominator.  Returns 0–1.
 */
const _domainAlignment = (
  projectDomains: AnalyzedProject["domains"],
  jdDomains: Set<string>
): number => {
  if (projectDomains.length === 0 || jdDomains.size === 0) return 0;
  let weightedMatch = 0;
  let totalConfidence = 0;
  for (const pd of projectDomains) {
    totalConfidence += pd.confidence;
    if (jdDomains.has(pd.name)) weightedMatch += pd.confidence;
  }
  return totalConfidence === 0 ? 0 : Math.min(1, weightedMatch / totalConfidence);
};

// ─── Responsibility alignment ─────────────────────────────────────────────────

/**
 * Measures what fraction of the project's detected taxonomy skills appear
 * anywhere in the JD text (including prose sections like "Responsibilities").
 * This captures alignment beyond the formal JD requirements list.
 * Returns 0–1.
 */
const _responsibilityAlignment = (
  projectSkills: string[],
  jdText: string
): number => {
  if (projectSkills.length === 0) return 0;
  const lowerJd = jdText.toLowerCase();
  const matched = projectSkills.filter((skill) =>
    lowerJd.includes(skill.toLowerCase())
  ).length;
  return Math.min(1, matched / projectSkills.length);
};

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Computes per-project job relevance for a list of analyzed projects against a
 * parsed job description.  Pure function — no I/O.
 *
 * When the JD has no recognized skills, all relevance scores are 0.
 * Project strength (already computed) is unchanged — it is independent of the JD.
 */
export const calculateProjectRelevance = (
  analyzedProjects: AnalyzedProject[],
  parsedJd: ParsedJobDescription
): ProjectJobRelevance[] => {
  // No recognized JD skills → relevance is 0 for all projects
  if (!parsedJd.requirements.length) {
    return analyzedProjects.map((p) => ({
      title: p.title,
      relevanceScore: 0,
      matchedRequiredSkills: [],
      missingRequiredSkills: [],
      matchedPreferredSkills: [],
      missingPreferredSkills: [],
      domainAlignment: 0,
      responsibilityAlignment: 0,
      jobValue: Math.round(p.strength.overall * JOB_VALUE_WEIGHTS.strength),
    }));
  }

  const jdDomains = _inferJdDomains(parsedJd.requirements);

  const requiredReqs = parsedJd.requirements.filter((r) => r.priority === "required");
  const preferredReqs = parsedJd.requirements.filter((r) => r.priority === "preferred");

  return analyzedProjects.map((project) => {
    const projectSkillSet = new Set(
      project.detectedSkills.map((s) => s.toLowerCase())
    );

    // ── Required skill coverage ──────────────────────────────────────────────
    const matchedReq = requiredReqs.filter((r) =>
      projectSkillSet.has(r.name.toLowerCase())
    );
    const missingReq = requiredReqs.filter(
      (r) => !projectSkillSet.has(r.name.toLowerCase())
    );
    // When JD has no required skills, grant full coverage (not a penalty).
    const reqCoverage =
      requiredReqs.length === 0 ? 1 : matchedReq.length / requiredReqs.length;

    // ── Preferred skill coverage ─────────────────────────────────────────────
    const matchedPref = preferredReqs.filter((r) =>
      projectSkillSet.has(r.name.toLowerCase())
    );
    const missingPref = preferredReqs.filter(
      (r) => !projectSkillSet.has(r.name.toLowerCase())
    );
    const prefCoverage =
      preferredReqs.length === 0 ? 1 : matchedPref.length / preferredReqs.length;

    // ── Domain alignment ─────────────────────────────────────────────────────
    const domainAlignment = _domainAlignment(project.domains, jdDomains);

    // ── Responsibility alignment ─────────────────────────────────────────────
    const responsibilityAlignment = _responsibilityAlignment(
      project.detectedSkills,
      parsedJd.cleanedText
    );

    // ── Composite relevance (0–100) ──────────────────────────────────────────
    const relevanceRaw =
      reqCoverage * PROJECT_RELEVANCE_WEIGHTS.requiredSkillCoverage +
      prefCoverage * PROJECT_RELEVANCE_WEIGHTS.preferredSkillCoverage +
      domainAlignment * PROJECT_RELEVANCE_WEIGHTS.domainAlignment +
      responsibilityAlignment * PROJECT_RELEVANCE_WEIGHTS.responsibilityAlignment;

    const relevanceScore = Math.min(100, Math.round(relevanceRaw * 100));

    // ── Job value (0–100) ────────────────────────────────────────────────────
    const jobValue = Math.min(
      100,
      Math.round(
        project.strength.overall * JOB_VALUE_WEIGHTS.strength +
        relevanceScore * JOB_VALUE_WEIGHTS.relevance
      )
    );

    return {
      title: project.title,
      relevanceScore,
      matchedRequiredSkills: matchedReq.map((r) => r.name),
      missingRequiredSkills: missingReq.map((r) => r.name),
      matchedPreferredSkills: matchedPref.map((r) => r.name),
      missingPreferredSkills: missingPref.map((r) => r.name),
      domainAlignment: Math.round(domainAlignment * 100) / 100,
      responsibilityAlignment: Math.round(responsibilityAlignment * 100) / 100,
      jobValue,
    };
  });
};
