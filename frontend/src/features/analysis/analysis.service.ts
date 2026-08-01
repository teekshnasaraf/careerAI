import api from "../../services/api";
import type { AnalysisData, AiSectionImprovement } from "../../types/analysis";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const getLatestAnalysisApi = async (): Promise<ApiResponse<AnalysisData | null>> => {
  const response = await api.get("/analysis/latest");
  return response.data;
};

export const runResumeAnalysisApi = async (): Promise<ApiResponse<AnalysisData>> => {
  const response = await api.post("/analysis/resume");
  return response.data;
};

export const improveSectionApi = async (
  sectionType: string,
  content: string
): Promise<ApiResponse<AiSectionImprovement>> => {
  const response = await api.post("/analysis/improve-section", { sectionType, content });
  return response.data;
};

export const runSkillGapAnalysisApi = async (
  targetRole: string
): Promise<ApiResponse<AnalysisData>> => {
  const response = await api.post("/analysis/skill-gap", { targetRole });
  return response.data;
};
