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
  score?: string;
}

export interface ParsedProject {
  title: string;
  description: string;
  technologies?: string[];
  links?: string[];
}

export interface ProjectDomain {
  name: string;
  confidence: number;
}

export interface ProjectAnalysis {
  title: string;
  description: string;
  detectedSkills: string[];
  domains: ProjectDomain[];
  strength: {
    overall: number;
    implementationEvidence: number;
    technicalDepth: number;
    measurableOutcomes: number;
    deploymentEvidence: number;
    descriptionRichness: number;
  };
  evidence: {
    actionVerbs: string[];
    hasOutcome: boolean;
    hasLink: boolean;
    hasGitHubLink: boolean;
    hasLiveDemo: boolean;
    descriptionLength: number;
  };
  links: string[];
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
  rawText?: string;
  cleanedText?: string;
  sections?: {
    summary: string;
    education: string;
    skills: string;
    experience: string;
    projects: string;
    certifications: string;
    achievements: string;
    internships: string;
    publications: string;
    extracurricular: string;
  };
  atsScore?: number;
  status: "uploaded" | "processing" | "parsed" | "failed";
  parsedData?: {
    summary?: string;
    skills?: string[];
    experience?: ParsedExperience[];
    education?: ParsedEducation[];
    projects?: ParsedProject[];
    extracurricular?: string;
    achievements?: string;
  };
  sectionChecklist?: SectionChecklistItem[];
  atsBreakdown?: AtsBreakdown;
  aiFeedback?: AIFeedbackItem[];
  /** Dynamically computed project analysis — not stored in DB, returned by getLatestResume. */
  projectAnalysis?: ProjectAnalysis[];
  createdAt: string;
  updatedAt: string;
}
