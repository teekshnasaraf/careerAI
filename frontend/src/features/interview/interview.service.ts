import api from "../../services/api";

export interface QuestionEntry {
  questionId: string;
  text: string;
  category: string;
  difficulty: string;
  resumeReference?: string;
}

export interface EvaluationEntry {
  questionId: string;
  questionText: string;
  category: string;
  userAnswer: string;
  accuracy: number;
  communication: number;
  technicalCorrectness: number;
  depth: number;
  confidence: number;
  betterAnswer: string;
  followupQuestion: string;
  difficultyRating: string;
  score: number;
  evaluatedAt: string;
}

export interface InterviewSessionData {
  _id: string;
  user: string;
  mode: string;
  difficulty: string;
  length: number;
  targetCompany: string;
  targetRole: string;
  questions: QuestionEntry[];
  responses: EvaluationEntry[];
  overallScore: number;
  status: "in_progress" | "completed";
  report?: {
    overallScore: number;
    topicBreakdown: Array<{ topic: string; score: number }>;
    strengths: string[];
    weaknesses: string[];
    conceptsToRevise: string[];
    suggestedResources: string[];
    suggestedProjects: string[];
    recommendedNextInterview: string;
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

export const startInterviewSessionApi = async (params: {
  mode: string;
  difficulty: string;
  length: number;
  targetCompany: string;
  targetRole: string;
}): Promise<{ success: boolean; data: InterviewSessionData }> => {
  const response = await api.post("/interview/start", params);
  return response.data;
};

export const submitQuestionAnswerApi = async (params: {
  sessionId: string;
  questionId: string;
  questionText: string;
  userAnswer: string;
}): Promise<{ success: boolean; data: { sessionId: string; evaluation: EvaluationEntry } }> => {
  const response = await api.post("/interview/submit-answer", params);
  return response.data;
};

export const finishInterviewSessionApi = async (
  sessionId: string
): Promise<{ success: boolean; data: InterviewSessionData }> => {
  const response = await api.post("/interview/finish", { sessionId });
  return response.data;
};
