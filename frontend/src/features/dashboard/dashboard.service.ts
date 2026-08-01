import api from "../../services/api";

export interface DashboardStatsData {
  resumeUploaded: boolean;
  resumeScore: number;
  atsScore: number;
  interviewCount: number;
  questionsPracticed: number;
  lastResumeUpload: string | null;
  lastAnalysisDate: string | null;
  targetRole: string;
  skillGapCount: number;
  originalName: string | null;
  fileUrl: string | null;
  publicId: string | null;
}

export const getDashboardStatsApi = async (): Promise<{ success: boolean; data: DashboardStatsData }> => {
  const response = await api.get("/dashboard/stats");
  return response.data;
};
