import api from "../../services/api";

export interface SettingsData {
  profile: {
    name: string;
    phone: string;
    college: string;
    degree: string;
    branch: string;
    graduationYear: string;
    cgpa: string;
    location: string;
    linkedin: string;
    github: string;
    portfolio: string;
    bio: string;
    avatarUrl: string;
  };
  career: {
    preferredRole: string;
    preferredDomain: string;
    preferredCompanies: string[];
    preferredLocation: string;
    workType: string;
    expectedSalary: string;
    experienceLevel: string;
    careerGoal: string;
  };
  learning: {
    weeklyHours: number;
    learningStyle: string;
    preferredLanguage: string;
    preferredDifficulty: string;
    roadmapStyle: string;
  };
  aiPreferences: {
    tone: string;
    explanationDepth: string;
    autoAnalyze: boolean;
    autoUpdateRoadmap: boolean;
    autoGenerateQuestions: boolean;
  };
  notifications: {
    email: boolean;
    interviewReminders: boolean;
    roadmapReminders: boolean;
    weeklyProgress: boolean;
    resumeAlerts: boolean;
  };
}

export const getUserSettingsApi = async (): Promise<{ success: boolean; data: SettingsData }> => {
  const response = await api.get("/settings");
  return response.data;
};

export const updateUserSettingsApi = async (
  settings: Partial<SettingsData>
): Promise<{ success: boolean; data: SettingsData; message: string }> => {
  const response = await api.put("/settings", settings);
  return response.data;
};
