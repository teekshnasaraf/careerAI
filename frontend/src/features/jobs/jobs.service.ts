import api from "../../services/api";

export interface JobMatchBreakdown {
  name: string;
  category: string;
  priority: "required" | "preferred" | "unspecified";
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
  priority: "required" | "preferred" | "unspecified";
  priorityWeight: number;
  potentialScoreImpact: number;
  classificationReason: string;
  recommendation: string;
}

export interface AdditionalResumeSkill {
  name: string;
  category: string;
  occurrences: number;
  sections: string[];
  matchedTexts: string[];
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
  additionalResumeSkills: AdditionalResumeSkill[];
  breakdown: JobMatchBreakdown[];
  // Backwards compatibility aliases
  unspecifiedMatched?: JobMatchBreakdown[];
  unspecifiedMissing?: JobMatchBreakdown[];
  scoreBreakdown?: JobMatchScoreBreakdown;
  prioritizedMissingSkills?: PrioritizedMissingSkill[];
}

export interface ProjectJobRelevance {
  title: string;
  relevanceScore: number;           // 0–100
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  domainAlignment: number;          // 0–1
  responsibilityAlignment: number;  // 0–1
  jobValue: number;                 // 0–100
}

export interface JobMatchResponse {
  success: boolean;
  message?: string;
  match: JobMatchResult;
  /** Per-project relevance scores for this specific JD. Absent when no projects are parsed. */
  projectRelevance?: ProjectJobRelevance[];
  data?: {
    jobRequirements: Array<{
      name: string;
      category: string;
      priority: "required" | "preferred" | "unspecified";
      occurrences: number;
    }>;
    totalDetectedRequirements: number;
    match: JobMatchResult;
  };
}

export const matchJobDescriptionApi = async (
  jobDescription: string,
  resumeId?: string
): Promise<JobMatchResponse> => {
  const response = await api.post("/jobs/match", {
    jobDescription,
    resumeId,
  });
  return response.data;
};

export interface RoadmapStep {
  stepNumber: number;
  phase: number;
  phaseTitle: string;
  skillName: string;
  category: string;
  priority: "required" | "preferred" | "unspecified" | "prerequisite";
  isDirectRequirement: boolean;
  reason: string;
  prerequisites: string[];
  unlockedSkills: string[];
  learningObjective: string;
  suggestedActivities: string[];
  practicalExercise: string;
  projectDeliverable: string;
  completionCriteria: string;
  status: "not_started" | "in_progress" | "completed";
  completedAt?: string;
}

export interface SkillGraphNode {
  name: string;
  category: string;
  isDemonstrated: boolean;
  isJobRequirement: boolean;
  jobPriority?: "required" | "preferred" | "unspecified" | "prerequisite";
  priorityWeight: number;
  prerequisites: string[];
  dependents: string[];
  unlockedTargetSkills: string[];
  status: "not_started" | "in_progress" | "completed";
}

export interface SkillGraphEdge {
  from: string;
  to: string;
  type: "prerequisite";
}

export interface SkillDependencyGraph {
  nodes: SkillGraphNode[];
  edges: SkillGraphEdge[];
  totalTargetSkills: number;
  totalPrerequisites: number;
  demonstratedCount: number;
  unmetCount: number;
}

export interface PersonalizedRoadmap {
  _id?: string;
  targetRole: string;
  jobDescriptionSummary: string;
  totalSteps: number;
  completedSteps: number;
  completionPercentage: number;
  targetMissingSkillsCount: number;
  unmetPrerequisitesCount: number;
  demonstratedPrerequisitesCount: number;
  phases: Array<{
    phaseNumber: number;
    title: string;
    description: string;
    stepCount: number;
  }>;
  steps: RoadmapStep[];
  graph: SkillDependencyGraph;
  rationale: string;
}

export interface RoadmapResponse {
  success: boolean;
  data: {
    roadmap: PersonalizedRoadmap;
    match?: JobMatchResult;
  };
  warning?: string;
  message?: string;
}

export const generateJobRoadmapApi = async (
  jobDescription: string,
  resumeId?: string,
  jobTitle?: string
): Promise<RoadmapResponse> => {
  const response = await api.post("/jobs/roadmap", {
    jobDescription,
    resumeId,
    jobTitle,
  });
  return response.data;
};

export const getActiveRoadmapApi = async (): Promise<{
  success: boolean;
  data: PersonalizedRoadmap | null;
}> => {
  const response = await api.get("/jobs/roadmap");
  return response.data;
};

export const updateRoadmapStepStatusApi = async (
  roadmapId: string,
  skillName: string,
  status: "not_started" | "in_progress" | "completed"
): Promise<{
  success: boolean;
  data: PersonalizedRoadmap;
  warning?: string;
}> => {
  const response = await api.patch("/jobs/roadmap/step", {
    roadmapId,
    skillName,
    status,
  });
  return response.data;
};

