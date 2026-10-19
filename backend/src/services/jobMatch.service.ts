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
  classificationReason?: string;
  scoreContribution?: number;
  potentialContribution?: number;
  scoreImpactExplanation?: string;
  missingExplanation?: string;
}

export interface JobMatchCategorySummary {
  total: number;
  matched: number;
  missing: number;
  weightPerItem: number;
  totalPossibleWeight: number;
  earnedWeight: number;
}

export interface JobMatchScoreBreakdown {
  totalRecognizedRequirements: number;
  totalMatchedRequirements: number;
  totalMissingRequirements: number;
  totalPossibleWeightedScore: number;
  earnedWeightedScore: number;
  finalMatchPercentage: number | null;
  priorityWeights: {
    required: number;
    preferred: number;
    unspecified: number;
  };
  categories: {
    required: JobMatchCategorySummary;
    preferred: JobMatchCategorySummary;
    unspecified: JobMatchCategorySummary;
  };
  calculationFormula: string;
  summaryExplanation: string;
}

export interface PrioritizedMissingSkill {
  name: string;
  category: string;
  priority: RequirementPriority;
  priorityWeight: number;
  potentialScoreImpact: number;
  classificationReason: string;
  recommendation: string;
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
  scoreBreakdown?: JobMatchScoreBreakdown;
  prioritizedMissingSkills?: PrioritizedMissingSkill[];
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
 * 5. Provides transparent score contribution and classification reasons per requirement.
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
      scoreBreakdown: {
        totalRecognizedRequirements: 0,
        totalMatchedRequirements: 0,
        totalMissingRequirements: 0,
        totalPossibleWeightedScore: 0,
        earnedWeightedScore: 0,
        finalMatchPercentage: null,
        priorityWeights: {
          required: JOB_MATCH_PRIORITY_WEIGHTS.required,
          preferred: JOB_MATCH_PRIORITY_WEIGHTS.preferred,
          unspecified: JOB_MATCH_PRIORITY_WEIGHTS.unspecified,
        },
        categories: {
          required: { total: 0, matched: 0, missing: 0, weightPerItem: 1.0, totalPossibleWeight: 0, earnedWeight: 0 },
          preferred: { total: 0, matched: 0, missing: 0, weightPerItem: 0.5, totalPossibleWeight: 0, earnedWeight: 0 },
          unspecified: { total: 0, matched: 0, missing: 0, weightPerItem: 0.75, totalPossibleWeight: 0, earnedWeight: 0 },
        },
        calculationFormula:
          "(Sum of weights of matched recognized requirements / Sum of weights of all recognized requirements) × 100",
        summaryExplanation: "No recognized skills were found in the job description.",
      },
      prioritizedMissingSkills: [],
    };
  }

  // Pre-calculate total weight for requirement-level contribution calculations
  const totalWeightRaw = requirements.reduce(
    (sum, req) => sum + (JOB_MATCH_PRIORITY_WEIGHTS[req.priority] ?? 0.75),
    0
  );

  // Index resume skills case-insensitively by canonical name
  const resumeSkills = new Map(
    extractedSkills.map((skill) => [skill.name.toLowerCase(), skill])
  );

  const breakdown: JobMatchBreakdown[] = requirements.map((requirement) => {
    const resumeSkill = resumeSkills.get(requirement.name.toLowerCase());
    const requirementWeight = JOB_MATCH_PRIORITY_WEIGHTS[requirement.priority];
    const matched = Boolean(resumeSkill);
    const potentialContribution =
      totalWeightRaw === 0
        ? 0
        : Math.round((requirementWeight / totalWeightRaw) * 10000) / 100;
    const scoreContribution = matched ? potentialContribution : 0;

    const classificationReason =
      requirement.classificationReason ||
      (requirement.priority === "required"
        ? "Classified as required requirement (weight 1.0)"
        : requirement.priority === "preferred"
        ? "Classified as preferred qualification (weight 0.5)"
        : "Classified as general technical requirement (weight 0.75)");

    const missingExplanation = matched
      ? undefined
      : `This ${requirement.priority} skill (weight ${requirementWeight}) was recognized in the job description but was not detected in any section of your resume.`;

    const scoreImpactExplanation = matched
      ? `+${scoreContribution}% added to overall match score`
      : `0% earned; worth up to +${potentialContribution}% if added to your resume`;

    return {
      name: requirement.name,
      category: requirement.category,
      priority: requirement.priority,
      matched,
      requirementWeight,
      contribution: matched ? requirementWeight : 0,
      classificationReason,
      scoreContribution,
      potentialContribution,
      scoreImpactExplanation,
      missingExplanation,
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

  const buildCategorySummary = (priority: RequirementPriority): JobMatchCategorySummary => {
    const items = breakdown.filter((item) => item.priority === priority);
    const matchedItems = items.filter((item) => item.matched);
    const missingItems = items.filter((item) => !item.matched);
    const weightPerItem = JOB_MATCH_PRIORITY_WEIGHTS[priority];
    return {
      total: items.length,
      matched: matchedItems.length,
      missing: missingItems.length,
      weightPerItem,
      totalPossibleWeight: Math.round(items.length * weightPerItem * 100) / 100,
      earnedWeight: Math.round(matchedItems.length * weightPerItem * 100) / 100,
    };
  };

  const reqSummary = buildCategorySummary("required");
  const prefSummary = buildCategorySummary("preferred");
  const unspecSummary = buildCategorySummary("unspecified");

  const scoreBreakdown: JobMatchScoreBreakdown = {
    totalRecognizedRequirements: breakdown.length,
    totalMatchedRequirements: breakdown.filter((i) => i.matched).length,
    totalMissingRequirements: breakdown.filter((i) => !i.matched).length,
    totalPossibleWeightedScore: Math.round(totalWeight * 100) / 100,
    earnedWeightedScore: Math.round(matchedWeight * 100) / 100,
    finalMatchPercentage: overallScore,
    priorityWeights: {
      required: JOB_MATCH_PRIORITY_WEIGHTS.required,
      preferred: JOB_MATCH_PRIORITY_WEIGHTS.preferred,
      unspecified: JOB_MATCH_PRIORITY_WEIGHTS.unspecified,
    },
    categories: {
      required: reqSummary,
      preferred: prefSummary,
      unspecified: unspecSummary,
    },
    calculationFormula:
      "(Sum of weights of matched recognized requirements / Sum of weights of all recognized requirements) × 100",
    summaryExplanation:
      overallScore === null
        ? "No recognized skills were found in the job description."
        : `Matched ${Math.round(matchedWeight * 100) / 100} of ${Math.round(totalWeight * 100) / 100} weighted points across ${breakdown.length} recognized skills.`,
  };

  const priorityRankOrder: Record<RequirementPriority, number> = {
    required: 3,
    unspecified: 2,
    preferred: 1,
  };

  const prioritizedMissingSkills: PrioritizedMissingSkill[] = breakdown
    .filter((item) => !item.matched)
    .sort((a, b) => {
      // 1. Required (1.0) before Unspecified (0.75) before Preferred (0.5)
      const rankDiff = priorityRankOrder[b.priority] - priorityRankOrder[a.priority];
      if (rankDiff !== 0) return rankDiff;
      // 2. Higher potential impact first
      const impactDiff = (b.potentialContribution ?? 0) - (a.potentialContribution ?? 0);
      if (impactDiff !== 0) return impactDiff;
      // 3. Alphabetical
      return a.name.localeCompare(b.name);
    })
    .map((item) => {
      const potential = item.potentialContribution ?? 0;
      let recommendation = "";
      if (item.priority === "required") {
        recommendation = `High impact: Adding verified projects or experience in ${item.name} could increase your match score by +${potential}%.`;
      } else if (item.priority === "unspecified") {
        recommendation = `Recommended skill: Demonstrating ${item.name} in your resume can add +${potential}% to your match score.`;
      } else {
        recommendation = `Bonus qualification: Highlighting ${item.name} would add +${potential}% and differentiate your application.`;
      }

      return {
        name: item.name,
        category: item.category,
        priority: item.priority,
        priorityWeight: item.requirementWeight,
        potentialScoreImpact: potential,
        classificationReason:
          item.classificationReason || `Classified as ${item.priority} requirement`,
        recommendation,
      };
    });

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
    scoreBreakdown,
    prioritizedMissingSkills,
  };
};

