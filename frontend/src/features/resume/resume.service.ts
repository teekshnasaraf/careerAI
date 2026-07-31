import api from "../../services/api";
import type { ResumeData } from "../../types/resume";

export interface ResumeApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const uploadResumeApi = async (file: File): Promise<ResumeApiResponse<ResumeData>> => {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await api.post("/resume/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const getLatestResumeApi = async (): Promise<ResumeApiResponse<ResumeData | null>> => {
  const response = await api.get("/resume/latest");
  return response.data;
};

export const deleteResumeApi = async (id: string): Promise<ResumeApiResponse<null>> => {
  const response = await api.delete(`/resume/${id}`);
  return response.data;
};
