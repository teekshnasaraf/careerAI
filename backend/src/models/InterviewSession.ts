import mongoose, { Document, Schema } from "mongoose";

export interface IInterviewResponse {
  questionId: string;
  questionText: string;
  category: string;
  userAnswer: string;
  accuracy: number;
  communication: number;
  technicalCorrectness: number;
  depth: number;
  confidence: number;
  betterAnswer: string;
  followupQuestion: string;
  difficultyRating: string;
  score: number;
  evaluatedAt: Date;
}

export interface IInterviewSession extends Document {
  user: mongoose.Types.ObjectId;
  mode: string;
  difficulty: string;
  length: number;
  targetCompany: string;
  targetRole: string;
  questions: Array<{
    questionId: string;
    text: string;
    category: string;
    difficulty: string;
    resumeReference?: string;
  }>;
  responses: IInterviewResponse[];
  overallScore: number;
  status: "in_progress" | "completed";
  report?: {
    overallScore: number;
    topicBreakdown: Array<{ topic: string; score: number }>;
    strengths: string[];
    weaknesses: string[];
    conceptsToRevise: string[];
    suggestedResources: string[];
    suggestedProjects: string[];
    recommendedNextInterview: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const interviewSessionSchema = new Schema<IInterviewSession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mode: { type: String, required: true },
    difficulty: { type: String, required: true },
    length: { type: Number, required: true },
    targetCompany: { type: String, default: "General Tech Company" },
    targetRole: { type: String, default: "Full Stack Engineer" },
    questions: [
      {
        questionId: String,
        text: String,
        category: String,
        difficulty: String,
        resumeReference: String,
      },
    ],
    responses: [
      {
        questionId: String,
        questionText: String,
        category: String,
        userAnswer: String,
        accuracy: Number,
        communication: Number,
        technicalCorrectness: Number,
        depth: Number,
        confidence: Number,
        betterAnswer: String,
        followupQuestion: String,
        difficultyRating: String,
        score: Number,
        evaluatedAt: { type: Date, default: Date.now },
      },
    ],
    overallScore: { type: Number, default: 0 },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    report: {
      overallScore: Number,
      topicBreakdown: [{ topic: String, score: Number }],
      strengths: [String],
      weaknesses: [String],
      conceptsToRevise: [String],
      suggestedResources: [String],
      suggestedProjects: [String],
      recommendedNextInterview: String,
    },
  },
  { timestamps: true }
);

const InterviewSession = mongoose.model<IInterviewSession>("InterviewSession", interviewSessionSchema);

export default InterviewSession;
