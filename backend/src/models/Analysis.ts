import mongoose, { Document, Schema } from "mongoose";

export interface IAnalysis extends Document {
  user: mongoose.Types.ObjectId;
  resumeId: mongoose.Types.ObjectId;
  resumeScore: number;
  atsScore: number;
  sectionAnalysis: {
    summary: string;
    skills: string;
    education: string;
    projects: string;
    experience: string;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingSkills: string[];
  targetRole?: string;
  skillGapAnalysis?: {
    targetRole: string;
    matchingScore: number;
    missingSkills: string[];
    missingTechnologies: string[];
    learningPriority: string[];
    learningRoadmap: Array<{
      step: string;
      topic: string;
      details: string;
      recommendedResource: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const analysisSchema = new Schema<IAnalysis>(
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
      required: true,
    },

    resumeScore: {
      type: Number,
      required: true,
    },

    atsScore: {
      type: Number,
      required: true,
    },

    sectionAnalysis: {
      summary: { type: String, default: "" },
      skills: { type: String, default: "" },
      education: { type: String, default: "" },
      projects: { type: String, default: "" },
      experience: { type: String, default: "" },
    },

    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },

    targetRole: { type: String, default: "Full Stack Engineer" },

    skillGapAnalysis: {
      targetRole: String,
      matchingScore: Number,
      missingSkills: [String],
      missingTechnologies: [String],
      learningPriority: [String],
      learningRoadmap: [
        {
          step: String,
          topic: String,
          details: String,
          recommendedResource: String,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

const Analysis = mongoose.model<IAnalysis>("Analysis", analysisSchema);

export default Analysis;
