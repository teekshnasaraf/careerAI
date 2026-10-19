import api from "../../services/api";

export type EvidenceStatus = "supported" | "partially_supported" | "not_found" | "unable_to_assess";
export type EvidenceType = "source_code" | "declared_dependency" | "documentation" | "configuration" | "metadata" | "none";

export interface FileReference {
  path: string;
  lineRange?: string;
  snippet?: string;
  source: string;
}

export interface ClaimAssessment {
  skill: string;
  status: EvidenceStatus;
  evidenceType: EvidenceType;
  fileReferences: FileReference[];
  explanation: string;
  limitations?: string;
}

export interface ArchitecturalSignals {
  hasApiRoutes: boolean;
  hasDatabaseModels: boolean;
  hasAuthentication: boolean;
  hasTests: boolean;
  hasCiCd: boolean;
  hasDocker: boolean;
  hasDocumentation: boolean;
  keyFindings: Array<{
    title: string;
    description: string;
    fileReference?: string;
  }>;
}

export interface DeclaredDependency {
  name: string;
  version?: string;
  file: string;
  category: string;
}

export interface ObservedImport {
  name: string;
  file: string;
  occurrences: number;
}

export interface ProjectEvidenceData {
  _id: string;
  user: string;
  resumeId?: string;
  projectTitle: string;
  repositoryUrl: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  metadata: {
    description: string;
    stars: number;
    forks: number;
    openIssues: number;
    primaryLanguage: string;
    languages: Record<string, number>;
    isArchived: boolean;
    license: string;
    updatedAt: string;
  };
  filesScanned: Array<{
    path: string;
    type: "manifest" | "source" | "test" | "config" | "docs" | "other";
    size: number;
  }>;
  declaredDependencies: DeclaredDependency[];
  observedImports: ObservedImport[];
  architecturalSignals: ArchitecturalSignals;
  claimAssessments: ClaimAssessment[];
  summary: {
    totalClaims: number;
    supportedCount: number;
    partiallySupportedCount: number;
    notFoundCount: number;
    unableToAssessCount: number;
    primaryTechnologies: string[];
    observedStrengths: string[];
    verificationGaps: string[];
    limitationsDisclaimer: string;
  };
  interviewQuestions: Array<{
    questionText: string;
    targetSkill: string;
    difficulty: "Easy" | "Medium" | "Hard";
    motivation: string;
    fileReference?: string;
  }>;
  analyzedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const analyzeProjectEvidenceApi = async (params: {
  projectTitle: string;
  repositoryUrl: string;
  resumeId?: string;
  claimedSkills?: string[];
}): Promise<{ success: boolean; message: string; data: ProjectEvidenceData }> => {
  const response = await api.post("/project-evidence/analyze", params);
  return response.data;
};

export const getProjectEvidenceApi = async (
  projectTitle: string
): Promise<{ success: boolean; data: ProjectEvidenceData | null }> => {
  const response = await api.get(`/project-evidence/project/${encodeURIComponent(projectTitle)}`);
  return response.data;
};

export const getAllUserProjectEvidenceApi = async (): Promise<{
  success: boolean;
  data: ProjectEvidenceData[];
}> => {
  const response = await api.get("/project-evidence/user");
  return response.data;
};

export const deleteProjectEvidenceApi = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/project-evidence/${id}`);
  return response.data;
};
