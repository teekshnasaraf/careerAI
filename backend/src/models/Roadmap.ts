import mongoose, { Document, Schema } from "mongoose";

export interface IRoadmapStep {
  stepNumber: number;
  phase: number;
  phaseTitle: string;
  skillName: string;
  category: string;
  priority: "required" | "preferred" | "unspecified" | "prerequisite";
  isDirectRequirement: boolean;
  reason: string;
  prerequisites: string[];
  unlockedSkills: string[];
  learningObjective: string;
  suggestedActivities: string[];
  practicalExercise: string;
  projectDeliverable: string;
  completionCriteria: string;
  status: "not_started" | "in_progress" | "completed";
  completedAt?: Date;
}

export interface IRoadmap extends Document {
  user: mongoose.Types.ObjectId;
  jobTitle: string;
  jobDescriptionSnippet: string;
  totalSteps: number;
  completedSteps: number;
  completionPercentage: number;
  targetMissingSkills: string[];
  unmetPrerequisites: string[];
  demonstratedSkills: string[];
  steps: IRoadmapStep[];
  rationale: string;
  createdAt: Date;
  updatedAt: Date;
}

const roadmapStepSchema = new Schema<IRoadmapStep>(
  {
    stepNumber: { type: Number, required: true },
    phase: { type: Number, required: true },
    phaseTitle: { type: String, required: true },
    skillName: { type: String, required: true },
    category: { type: String, required: true },
    priority: {
      type: String,
      enum: ["required", "preferred", "unspecified", "prerequisite"],
      required: true,
    },
    isDirectRequirement: { type: Boolean, required: true },
    reason: { type: String, required: true },
    prerequisites: [{ type: String }],
    unlockedSkills: [{ type: String }],
    learningObjective: { type: String, required: true },
    suggestedActivities: [{ type: String }],
    practicalExercise: { type: String, required: true },
    projectDeliverable: { type: String, required: true },
    completionCriteria: { type: String, required: true },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    completedAt: { type: Date },
  },
  { _id: false }
);

const roadmapSchema = new Schema<IRoadmap>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobTitle: { type: String, default: "Software Engineer" },
    jobDescriptionSnippet: { type: String, default: "" },
    totalSteps: { type: Number, default: 0 },
    completedSteps: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 },
    targetMissingSkills: [{ type: String }],
    unmetPrerequisites: [{ type: String }],
    demonstratedSkills: [{ type: String }],
    steps: [roadmapStepSchema],
    rationale: { type: String, default: "" },
  },
  { timestamps: true }
);

const Roadmap = mongoose.model<IRoadmap>("Roadmap", roadmapSchema);

export default Roadmap;
