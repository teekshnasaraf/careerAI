import mongoose, { Document, Schema } from "mongoose";

export interface IAnalysis extends Document {
  user: mongoose.Types.ObjectId;
  resumeId: mongoose.Types.ObjectId;
  resumeScore: number;
  atsScore: number;
  sectionScores: {
    summaryScore: number;
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    projectsScore: number;
  };
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
  recommendedKeywords: string[];
  actionVerbs: string[];
  formattingSuggestions: string[];
  topPriorityImprovements: string[];
  targetRole: string;
  skillGapAnalysis?: {
    targetRole: string;
    matchingScore: number;
    missingSkills: string[];
    missingTechnologies: string[];
    prioritySkills: string[];
    recommendedProjects: Array<{
      title: string;
      difficulty: string;
      description: string;
      technologies: string[];
    }>;
    interviewTopics: string[];
    certificationSuggestions: string[];
    learningRoadmap: Array<{
      step: string;
      topic: string;
      priority: string;
      estimatedHours: number;
      prerequisites: string[];
      details: string;
      recommendedResource: string;
      weeklyPlan: string[];
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

    resumeScore: { type: Number, required: true },
    atsScore: { type: Number, required: true },

    sectionScores: {
      summaryScore: { type: Number, default: 75 },
      skillsScore: { type: Number, default: 70 },
      experienceScore: { type: Number, default: 70 },
      educationScore: { type: Number, default: 85 },
      projectsScore: { type: Number, default: 80 },
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
    recommendedKeywords: { type: [String], default: [] },
    actionVerbs: { type: [String], default: [] },
    formattingSuggestions: { type: [String], default: [] },
    topPriorityImprovements: { type: [String], default: [] },

    targetRole: { type: String, default: "Full Stack Engineer" },

    skillGapAnalysis: {
      targetRole: String,
      matchingScore: Number,
      missingSkills: [String],
      missingTechnologies: [String],
      prioritySkills: [String],
      recommendedProjects: [
        {
          title: String,
          difficulty: String,
          description: String,
          technologies: [String],
        },
      ],
      interviewTopics: [String],
      certificationSuggestions: [String],
      learningRoadmap: [
        {
          step: String,
          topic: String,
          priority: String,
          estimatedHours: Number,
          prerequisites: [String],
          details: String,
          recommendedResource: String,
          weeklyPlan: [String],
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
