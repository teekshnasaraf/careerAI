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

export interface ParsedProject {
  title: string;
  description: string;
  technologies?: string[];
}

export interface SectionChecklistItem {
  name: string;
  key: string;
  found: boolean;
  scoreImpact: string;
  recommendation: string;
}

export interface AtsBreakdown {
  sectionStructureScore: number;
  skillsCoverageScore: number;
  readabilityScore: number;
  impactMetricsScore: number;
}

export interface AIFeedbackItem {
  type: "strength" | "warning" | "tip";
  title: string;
  description: string;
  actionableStep?: string;
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
    projects?: ParsedProject[];
  };
  sectionChecklist?: SectionChecklistItem[];
  atsBreakdown?: AtsBreakdown;
  aiFeedback?: AIFeedbackItem[];
  createdAt: string;
  updatedAt: string;
}
