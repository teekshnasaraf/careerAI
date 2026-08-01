import mongoose, { Document, Schema } from "mongoose";

export interface IProgress extends Document {
  user: mongoose.Types.ObjectId;
  scoreHistory: Array<{
    date: string;
    resumeScore: number;
    atsScore: number;
    interviewScore: number;
    questionsSolved: number;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
    unlockedAt?: Date;
    icon: string;
  }>;
  timeline: Array<{
    id: string;
    title: string;
    description: string;
    category: "resume" | "interview" | "analysis" | "learning";
    timestamp: Date;
  }>;
  weakTopics: Array<{
    topic: string;
    mistakeCount: number;
    lastReviewed: Date;
  }>;
  weeklyCoachReport: {
    whatImproved: string[];
    whatDeclined: string[];
    nextStep: string;
    placementReadiness: number;
    interviewReadiness: number;
    personalizedAdvice: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const progressSchema = new Schema<IProgress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    scoreHistory: [
      {
        date: String,
        resumeScore: Number,
        atsScore: Number,
        interviewScore: Number,
        questionsSolved: Number,
      },
    ],
    achievements: [
      {
        id: String,
        title: String,
        description: String,
        unlocked: { type: Boolean, default: false },
        unlockedAt: Date,
        icon: String,
      },
    ],
    timeline: [
      {
        id: String,
        title: String,
        description: String,
        category: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    weakTopics: [
      {
        topic: String,
        mistakeCount: { type: Number, default: 1 },
        lastReviewed: { type: Date, default: Date.now },
      },
    ],
    weeklyCoachReport: {
      whatImproved: [String],
      whatDeclined: [String],
      nextStep: String,
      placementReadiness: Number,
      interviewReadiness: Number,
      personalizedAdvice: String,
    },
  },
  { timestamps: true }
);

const Progress = mongoose.model<IProgress>("Progress", progressSchema);

export default Progress;
