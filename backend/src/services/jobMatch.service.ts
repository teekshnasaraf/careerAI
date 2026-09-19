import type { JobRequirement, RequirementPriority } from "./jobDescription.service";

export interface ResumeSkillForMatch {
  name: string;
  category: string;
  kind?: string;
  weight?: number;
  occurrences: number;
  sections: string[];
  matchedTexts: string[];
  rankingScore?: number;
  rank?: number;
}

export interface JobMatchBreakdown {
  name: string;
  category: string;
  priority: RequirementPriority;
  matched: boolean;
  requirementWeight: number;
  contribution: number;
  resumeEvidence?: {
    occurrences: number;
    sections: string[];
    matchedTexts: string[];
  };
}

export interface JobMatchResult {
  overallScore: number | null;
  scoreExplanation?: string;
  matchedRequired: JobMatchBreakdown[];
  missingRequired: JobMatchBreakdown[];
  matchedPreferred: JobMatchBreakdown[];
  missingPreferred: JobMatchBreakdown[];
  matchedUnspecified: JobMatchBreakdown[];
  missingUnspecified: JobMatchBreakdown[];
  additionalResumeSkills: ResumeSkillForMatch[];
  breakdown: JobMatchBreakdown[];
  // Backwards compatibility aliases
  unspecifiedMatched?: JobMatchBreakdown[];
  unspecifiedMissing?: JobMatchBreakdown[];
}

/**
 * Deterministic requirement priority weights:
 * - Required = 1.0
 * - Preferred = 0.5
 * - Unspecified = 0.75
 */
export const JOB_MATCH_PRIORITY_WEIGHTS: Record<RequirementPriority, number> = {
  required: 1.0,
  preferred: 0.5,
  unspecified: 0.75,
};

/**
 * Deterministic Job Match Scoring Formula:
 *
 * weighted matched requirements
 * /
 * weighted total requirements
 * * 100
 *
 * Example:
 * Required:
 * React = 1.0, Node.js = 1.0, SQL = 1.0
 * Preferred:
 * AWS = 0.5
 *
 * Resume matches: React, Node.js, AWS
 * Matched weight = 1.0 + 1.0 + 0.5 = 2.5
 * Total weight = 1.0 + 1.0 + 1.0 + 0.5 = 3.5
 * Score = 2.5 / 3.5 * 100 = 71.43
 *
 * Notes:
 * 1. If the JD contains no recognized skills, score is null with an explanatory note.
 * 2. Additional resume skills do not inflate the score.
 * 3. Multiple mentions of the same skill in JD are treated as ONE requirement.
 * 4. Only the final score is rounded to 2 decimal places.
 */
export const calculateJobMatch = (
  requirements: JobRequirement[],
  extractedSkills: ResumeSkillForMatch[]
): JobMatchResult => {
  if (!requirements || requirements.length === 0) {
    return {
      overallScore: null,
      scoreExplanation: "No recognized skills were found in the job description.",
      matchedRequired: [],
      missingRequired: [],
      matchedPreferred: [],
      missingPreferred: [],
      matchedUnspecified: [],
      missingUnspecified: [],
      unspecifiedMatched: [],
      unspecifiedMissing: [],
      additionalResumeSkills: [...extractedSkills],
      breakdown: [],
    };
  }

  // Index resume skills case-insensitively by canonical name
  const resumeSkills = new Map(
    extractedSkills.map((skill) => [skill.name.toLowerCase(), skill])
  );

  const breakdown: JobMatchBreakdown[] = requirements.map((requirement) => {
    const resumeSkill = resumeSkills.get(requirement.name.toLowerCase());
    const requirementWeight = JOB_MATCH_PRIORITY_WEIGHTS[requirement.priority];
    const matched = Boolean(resumeSkill);

    return {
      name: requirement.name,
      category: requirement.category,
      priority: requirement.priority,
      matched,
      requirementWeight,
      contribution: matched ? requirementWeight : 0,
      ...(resumeSkill
        ? {
            resumeEvidence: {
              occurrences: resumeSkill.occurrences,
              sections: [...resumeSkill.sections],
              matchedTexts: [...resumeSkill.matchedTexts],
            },
          }
        : {}),
    };
  });

  const totalWeight = breakdown.reduce((sum, item) => sum + item.requirementWeight, 0);
  const matchedWeight = breakdown.reduce((sum, item) => sum + item.contribution, 0);

  const overallScore =
    totalWeight === 0 ? null : Math.round((matchedWeight / totalWeight) * 10000) / 100;

  const byPriority = (priority: RequirementPriority, matched: boolean) =>
    breakdown.filter((item) => item.priority === priority && item.matched === matched);

  const requested = new Set(requirements.map((req) => req.name.toLowerCase()));
  const additionalResumeSkills = extractedSkills.filter(
    (skill) => !requested.has(skill.name.toLowerCase())
  );

  const matchedRequired = byPriority("required", true);
  const missingRequired = byPriority("required", false);
  const matchedPreferred = byPriority("preferred", true);
  const missingPreferred = byPriority("preferred", false);
  const matchedUnspecified = byPriority("unspecified", true);
  const missingUnspecified = byPriority("unspecified", false);

  return {
    overallScore,
    scoreExplanation:
      overallScore === null
        ? "No recognized skills were found in the job description."
        : undefined,
    matchedRequired,
    missingRequired,
    matchedPreferred,
    missingPreferred,
    matchedUnspecified,
    missingUnspecified,
    unspecifiedMatched: matchedUnspecified,
    unspecifiedMissing: missingUnspecified,
    additionalResumeSkills,
    breakdown,
  };
};
