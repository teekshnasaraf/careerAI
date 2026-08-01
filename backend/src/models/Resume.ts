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

export interface IResume extends Document {
  user: mongoose.Types.ObjectId;
  originalName: string;
  fileName: string;
  fileUrl: string;
  publicId?: string;
  fileSize: number;
  mimeType: string;
  rawText?: string;
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
    }>;
    projects?: Array<{
      title: string;
      description: string;
      technologies?: string[];
    }>;
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
        },
      ],
      projects: [
        {
          title: String,
          description: String,
          technologies: [String],
        },
      ],
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
