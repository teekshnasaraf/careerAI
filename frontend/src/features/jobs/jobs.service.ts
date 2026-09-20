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
