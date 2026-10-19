import api from "../../services/api";

export interface QuestionEntry {
  questionId: string;
  text: string;
  category: string;
  skill?: string;
  difficulty: string;
  isFollowup?: boolean;
  parentQuestionId?: string;
  followupReason?: string;
  resumeReference?: string;
  repositoryFinding?: string;
  fileReference?: string;
}

export interface EvaluationEntry {
  questionId: string;
  questionText: string;
  category: string;
  skill?: string;
  userAnswer: string;
  accuracy: number;
  communication: number;
  technicalCorrectness: number;
  depth: number;
  confidence: number;
  practicalApplication?: number;
  strengths?: string[];
  gaps?: string[];
  suggestedImprovement?: string;
  betterAnswer: string;
  followupQuestion: string;
  difficultyRating: string;
  recommendedAction?: string;
  score: number;
  evaluatedAt: string;
}

export interface AssessedSkillSummary {
  skill: string;
  score: number;
  questionsCount: number;
  status: "strong" | "competent" | "weak";
}

export interface InterviewSessionData {
  _id: string;
  user: string;
  mode: string;
  difficulty: string;
  length: number;
  targetCompany: string;
  targetRole: string;
  isAdaptive?: boolean;
  jobDescription?: string;
  targetSkills?: string[];
  assessedSkills?: AssessedSkillSummary[];
  unassessedSkills?: string[];
  currentDifficulty?: string;
  followupDepth?: number;
  maxFollowupDepth?: number;
  currentQuestionIndex?: number;
  nextAction?: string;
  nextActionReason?: string;
  projectEvidenceId?: string;
  projectContext?: {
    projectTitle: string;
    repositoryUrl: string;
    findingsSummary?: string;
    primaryTechnologies?: string[];
  };
  questions: QuestionEntry[];
  responses: EvaluationEntry[];
  overallScore: number;
  status: "in_progress" | "completed";
  report?: {
    overallScore: number;
    topicBreakdown: Array<{ topic: string; score: number }>;
    assessedSkills?: AssessedSkillSummary[];
    unassessedSkills?: string[];
    dimensionScores?: {
      technicalCorrectness: number;
      accuracy: number;
      depth: number;
      communication: number;
      practicalApplication: number;
    };
    strengths: string[];
    weaknesses: string[];
    conceptsToRevise: string[];
    suggestedResources: string[];
    suggestedProjects: string[];
    recommendedRoadmapSteps?: string[];
    recommendedNextInterview: string;
    historicalComparison?: {
      previousAverageScore: number;
      scoreDelta: number;
      sessionsAnalyzed: number;
      note: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface InterviewStatsData {
  questionsSolved: number;
  mockInterviewsCompleted: number;
  averageInterviewScore: number;
  confidenceLevel: string;
  weakestTopic: string;
  strongestTopic: string;
  recentSessions: InterviewSessionData[];
}

export const getInterviewStatsApi = async (): Promise<{ success: boolean; data: InterviewStatsData }> => {
  const response = await api.get("/interview/stats");
  return response.data;
};

export const getActiveInterviewSessionApi = async (): Promise<{ success: boolean; data: InterviewSessionData | null }> => {
  const response = await api.get("/interview/active");
  return response.data;
};

export const getInterviewSessionByIdApi = async (
  sessionId: string
): Promise<{ success: boolean; data: InterviewSessionData }> => {
  const response = await api.get(`/interview/session/${sessionId}`);
  return response.data;
};

export const startInterviewSessionApi = async (params: {
  mode: string;
  difficulty: string;
  length: number;
  targetCompany: string;
  targetRole: string;
  jobDescription?: string;
  isAdaptive?: boolean;
  projectEvidenceId?: string;
}): Promise<{ success: boolean; data: InterviewSessionData }> => {
  const response = await api.post("/interview/start", params);
  return response.data;
};

export const submitQuestionAnswerApi = async (params: {
  sessionId: string;
  questionId: string;
  questionText: string;
  userAnswer: string;
}): Promise<{
  success: boolean;
  data: {
    sessionId: string;
    evaluation: EvaluationEntry;
    nextQuestion?: QuestionEntry;
    isFinished?: boolean;
    report?: InterviewSessionData["report"];
    session?: InterviewSessionData;
  };
}> => {
  const response = await api.post("/interview/submit-answer", params);
  return response.data;
};

export const finishInterviewSessionApi = async (
  sessionId: string
): Promise<{ success: boolean; data: InterviewSessionData }> => {
  const response = await api.post("/interview/finish", { sessionId });
  return response.data;
};
