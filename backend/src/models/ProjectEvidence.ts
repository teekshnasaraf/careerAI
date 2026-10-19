import mongoose, { Document, Schema } from "mongoose";

export type EvidenceStatus = "supported" | "partially_supported" | "not_found" | "unable_to_assess";
export type EvidenceType = "source_code" | "declared_dependency" | "documentation" | "configuration" | "metadata" | "none";

export interface IClaimAssessment {
  skill: string;
  status: EvidenceStatus;
  evidenceType: EvidenceType;
  fileReferences: Array<{
    path: string;
    lineRange?: string;
    snippet?: string;
    source: string;
  }>;
  explanation: string;
  limitations?: string;
}

export interface IArchitecturalSignals {
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

export interface IProjectEvidenceSummary {
  totalClaims: number;
  supportedCount: number;
  partiallySupportedCount: number;
  notFoundCount: number;
  unableToAssessCount: number;
  primaryTechnologies: string[];
  observedStrengths: string[];
  verificationGaps: string[];
  limitationsDisclaimer: string;
}

export interface IProjectInterviewQuestion {
  questionText: string;
  targetSkill: string;
  difficulty: "Easy" | "Medium" | "Hard";
  motivation: string;
  fileReference?: string;
}

export interface IProjectEvidence extends Document {
  user: mongoose.Types.ObjectId;
  resumeId?: mongoose.Types.ObjectId;
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
  declaredDependencies: Array<{
    name: string;
    version?: string;
    file: string;
    category: string;
  }>;
  observedImports: Array<{
    name: string;
    file: string;
    occurrences: number;
  }>;
  architecturalSignals: IArchitecturalSignals;
  claimAssessments: IClaimAssessment[];
  summary: IProjectEvidenceSummary;
  interviewQuestions: IProjectInterviewQuestion[];
  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const claimAssessmentSchema = new Schema<IClaimAssessment>(
  {
    skill: { type: String, required: true },
    status: {
      type: String,
      enum: ["supported", "partially_supported", "not_found", "unable_to_assess"],
      required: true,
    },
    evidenceType: {
      type: String,
      enum: ["source_code", "declared_dependency", "documentation", "configuration", "metadata", "none"],
      required: true,
    },
    fileReferences: [
      {
        path: { type: String, required: true },
        lineRange: { type: String },
        snippet: { type: String },
        source: { type: String, required: true },
      },
    ],
    explanation: { type: String, required: true },
    limitations: { type: String },
  },
  { _id: false }
);

const projectInterviewQuestionSchema = new Schema<IProjectInterviewQuestion>(
  {
    questionText: { type: String, required: true },
    targetSkill: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    motivation: { type: String, required: true },
    fileReference: { type: String },
  },
  { _id: false }
);

const projectEvidenceSchema = new Schema<IProjectEvidence>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
    },
    projectTitle: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    repositoryUrl: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: String,
      required: true,
      trim: true,
    },
    repo: {
      type: String,
      required: true,
      trim: true,
    },
    defaultBranch: {
      type: String,
      default: "main",
    },
    metadata: {
      description: { type: String, default: "" },
      stars: { type: Number, default: 0 },
      forks: { type: Number, default: 0 },
      openIssues: { type: Number, default: 0 },
      primaryLanguage: { type: String, default: "" },
      languages: { type: Map, of: Number, default: {} },
      isArchived: { type: Boolean, default: false },
      license: { type: String, default: "" },
      updatedAt: { type: String, default: "" },
    },
    filesScanned: [
      {
        path: { type: String, required: true },
        type: { type: String, enum: ["manifest", "source", "test", "config", "docs", "other"], required: true },
        size: { type: Number, default: 0 },
      },
    ],
    declaredDependencies: [
      {
        name: { type: String, required: true },
        version: { type: String },
        file: { type: String, required: true },
        category: { type: String, default: "runtime" },
      },
    ],
    observedImports: [
      {
        name: { type: String, required: true },
        file: { type: String, required: true },
        occurrences: { type: Number, default: 1 },
      },
    ],
    architecturalSignals: {
      hasApiRoutes: { type: Boolean, default: false },
      hasDatabaseModels: { type: Boolean, default: false },
      hasAuthentication: { type: Boolean, default: false },
      hasTests: { type: Boolean, default: false },
      hasCiCd: { type: Boolean, default: false },
      hasDocker: { type: Boolean, default: false },
      hasDocumentation: { type: Boolean, default: false },
      keyFindings: [
        {
          title: { type: String, required: true },
          description: { type: String, required: true },
          fileReference: { type: String },
        },
      ],
    },
    claimAssessments: [claimAssessmentSchema],
    summary: {
      totalClaims: { type: Number, default: 0 },
      supportedCount: { type: Number, default: 0 },
      partiallySupportedCount: { type: Number, default: 0 },
      notFoundCount: { type: Number, default: 0 },
      unableToAssessCount: { type: Number, default: 0 },
      primaryTechnologies: [{ type: String }],
      observedStrengths: [{ type: String }],
      verificationGaps: [{ type: String }],
      limitationsDisclaimer: {
        type: String,
        default:
          "Repository evidence indicates presence or absence of implementation signals. It does not certify individual authorship or work distribution in collaborative projects.",
      },
    },
    interviewQuestions: [projectInterviewQuestionSchema],
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user and projectTitle
projectEvidenceSchema.index({ user: 1, projectTitle: 1 });
// Compound index for user and repositoryUrl
projectEvidenceSchema.index({ user: 1, repositoryUrl: 1 });

const ProjectEvidence = mongoose.model<IProjectEvidence>("ProjectEvidence", projectEvidenceSchema);

export default ProjectEvidence;
