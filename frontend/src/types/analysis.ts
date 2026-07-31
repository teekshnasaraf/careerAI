export interface LearningRoadmapItem {
  step: string;
  topic: string;
  details: string;
  recommendedResource: string;
}

export interface AiSkillGapResult {
  targetRole: string;
  matchingScore: number;
  missingSkills: string[];
  missingTechnologies: string[];
  learningPriority: string[];
  learningRoadmap: LearningRoadmapItem[];
}

export interface AiSectionImprovement {
  improvedContent: string;
  keyChanges: string[];
}

export interface AnalysisData {
  _id: string;
  user: string;
  resumeId: string;
  resumeScore: number;
  atsScore: number;
  sectionAnalysis: {
    summary: string;
    skills: string;
    education: string;
    projects: string;
    experience: string;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingSkills: string[];
  targetRole?: string;
  skillGapAnalysis?: AiSkillGapResult;
  createdAt: string;
  updatedAt: string;
}
