import api from "../../services/api";

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  icon: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  category: "resume" | "interview" | "analysis" | "learning";
  timestamp: string;
}

export interface WeakTopicItem {
  topic: string;
  mistakeCount: number;
  lastReviewed: string;
}

export interface ProgressStatsData {
  currentResumeScore: number;
  currentAtsScore: number;
  interviewAverage: number;
  roadmapCompletion: number;
  questionsSolved: number;
  skillsMastered: number;
  projectsCompleted: number;
  studyHours: number;
  scoreHistory: Array<{
    date: string;
    resumeScore: number;
    atsScore: number;
    interviewScore: number;
    questionsSolved: number;
  }>;
  achievements: AchievementItem[];
  timeline: TimelineItem[];
  weakTopics: WeakTopicItem[];
  weeklyCoachReport: {
    whatImproved: string[];
    whatDeclined: string[];
    nextStep: string;
    placementReadiness: number;
    interviewReadiness: number;
    personalizedAdvice: string;
  };
}

export const getProgressStatsApi = async (): Promise<{ success: boolean; data: ProgressStatsData }> => {
  const response = await api.get("/progress/stats");
  return response.data;
};
