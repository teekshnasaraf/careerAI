import mongoose, { Document, Schema } from "mongoose";

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

export interface ExtractedSkill {
  name: string;
  category: string;
  kind: string;
  weight: number;
  occurrences: number;
  sections: string[];
  matchedTexts: string[];
  rankingScore: number;
  rank: number;
}

export interface DeterministicScore {
  overall: number;
  subscores: { skillCoverage: number; skillEvidence: number; sectionCompleteness: number; projectEvidence: number; experienceEvidence: number; structuralChecks: number; };
  skillContributions: Array<{ name: string; category: string; weight: number; occurrences: number; sections: string[]; coverageContribution: number; repeatedEvidence: boolean; demonstratedEvidence: boolean; }>;
  strengths: string[];
  weaknesses: string[];
}

export interface IResume extends Document {
  user: mongoose.Types.ObjectId;
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
  extractedSkills?: ExtractedSkill[];
  deterministicScore?: DeterministicScore;
  atsScore?: number;
  status: "uploaded" | "processing" | "parsed" | "failed";
  parsedData?: {
    summary?: string;
    skills?: string[];
    experience?: Array<{
      title: string;
      company: string;
      duration: string;
      bulletPoints: string[];
    }>;
    education?: Array<{
      degree: string;
      institution: string;
      year: string;
      score?: string;
    }>;
    projects?: Array<{
      title: string;
      description: string;
      technologies?: string[];
      links?: string[];
    }>;
    extracurricular?: string;
    achievements?: string;
  };
  sectionChecklist?: SectionChecklistItem[];
  atsBreakdown?: AtsBreakdown;
  aiFeedback?: Array<{
    type: "strength" | "warning" | "tip";
    title: string;
    description: string;
    actionableStep?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<IResume>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      default: "",
    },

    fileSize: {
      type: Number,
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    rawText: {
      type: String,
      default: "",
    },

    cleanedText: {
      type: String,
      default: "",
    },

    sections: {
      summary: { type: String, default: "" },
      education: { type: String, default: "" },
      skills: { type: String, default: "" },
      experience: { type: String, default: "" },
      projects: { type: String, default: "" },
      certifications: { type: String, default: "" },
      achievements: { type: String, default: "" },
      internships: { type: String, default: "" },
      publications: { type: String, default: "" },
      extracurricular: { type: String, default: "" },
    },

    extractedSkills: [{
      name: String,
      category: String,
      kind: String,
      weight: Number,
      occurrences: Number,
      sections: [String],
      matchedTexts: [String],
      rankingScore: Number,
      rank: Number,
    }],

    deterministicScore: {
      overall: Number,
      subscores: { skillCoverage: Number, skillEvidence: Number, sectionCompleteness: Number, projectEvidence: Number, experienceEvidence: Number, structuralChecks: Number },
      skillContributions: [{ name: String, category: String, weight: Number, occurrences: Number, sections: [String], coverageContribution: Number, repeatedEvidence: Boolean, demonstratedEvidence: Boolean }],
      strengths: [String],
      weaknesses: [String],
    },

    atsScore: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["uploaded", "processing", "parsed", "failed"],
      default: "uploaded",
    },

    parsedData: {
      summary: { type: String, default: "" },
      skills: { type: [String], default: [] },
      experience: [
        {
          title: String,
          company: String,
          duration: String,
          bulletPoints: [String],
        },
      ],
      education: [
        {
          degree: String,
          institution: String,
          year: String,
          score: String,
        },
      ],
      projects: [
        {
          title: String,
          description: String,
          technologies: [String],
          links: [String],
        },
      ],
      extracurricular: { type: String, default: "" },
      achievements: { type: String, default: "" },
    },

    sectionChecklist: [
      {
        name: String,
        key: String,
        found: Boolean,
        scoreImpact: String,
        recommendation: String,
      },
    ],

    atsBreakdown: {
      sectionStructureScore: { type: Number, default: 0 },
      skillsCoverageScore: { type: Number, default: 0 },
      readabilityScore: { type: Number, default: 0 },
      impactMetricsScore: { type: Number, default: 0 },
    },

    aiFeedback: [
      {
        type: {
          type: String,
          enum: ["strength", "warning", "tip"],
        },
        title: String,
        description: String,
        actionableStep: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Resume = mongoose.model<IResume>("Resume", resumeSchema);

export default Resume;
