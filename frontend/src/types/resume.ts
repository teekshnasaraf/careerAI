export interface ParsedExperience {
  title: string;
  company: string;
  duration: string;
  bulletPoints: string[];
}

export interface ParsedEducation {
  degree: string;
  institution: string;
  year: string;
}

export interface AIFeedbackItem {
  type: "strength" | "warning" | "tip";
  title: string;
  description: string;
}

export interface ResumeData {
  _id: string;
  user: string;
  originalName: string;
  fileName: string;
  fileUrl: string;
  publicId?: string;
  fileSize: number;
  mimeType: string;
  atsScore?: number;
  status: "uploaded" | "processing" | "parsed" | "failed";
  parsedData?: {
    summary?: string;
    skills?: string[];
    experience?: ParsedExperience[];
    education?: ParsedEducation[];
  };
  aiFeedback?: AIFeedbackItem[];
  createdAt: string;
  updatedAt: string;
}
