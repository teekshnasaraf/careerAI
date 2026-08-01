export interface RecommendedProject {
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  description: string;
  technologies: string[];
}

export interface LearningRoadmapItem {
  step: string;
  topic: string;
  priority: "High" | "Medium" | "Low";
  estimatedHours: number;
  prerequisites: string[];
  details: string;
  recommendedResource: string;
  weeklyPlan: string[];
}

export interface AiSkillGapResult {
  targetRole: string;
  matchingScore: number;
  missingSkills: string[];
  missingTechnologies: string[];
  prioritySkills: string[];
  recommendedProjects: RecommendedProject[];
  interviewTopics: string[];
  certificationSuggestions: string[];
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
  sectionScores: {
    summaryScore: number;
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    projectsScore: number;
  };
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
  recommendedKeywords: string[];
  actionVerbs: string[];
  formattingSuggestions: string[];
  topPriorityImprovements: string[];
  targetRole: string;
  skillGapAnalysis?: AiSkillGapResult;
  createdAt: string;
  updatedAt: string;
}
