import mongoose, { Document, Schema } from "mongoose";

export interface IInterviewResponse {
  questionId: string;
  questionText: string;
  category: string;
  skill?: string;
  userAnswer: string;
  accuracy: number;
  communication: number;
  technicalCorrectness: number;
  depth: number;
  confidence: number;
  practicalApplication?: number;
  strengths?: string[];
  gaps?: string[];
  suggestedImprovement?: string;
  betterAnswer: string;
  followupQuestion: string;
  difficultyRating: string;
  recommendedAction?: string;
  score: number;
  evaluatedAt: Date;
}

export interface IAssessedSkillSummary {
  skill: string;
  score: number;
  questionsCount: number;
  status: "strong" | "competent" | "weak";
}

export interface IInterviewSession extends Document {
  user: mongoose.Types.ObjectId;
  mode: string;
  difficulty: string;
  length: number;
  targetCompany: string;
  targetRole: string;
  isAdaptive?: boolean;
  jobDescription?: string;
  targetSkills?: string[];
  assessedSkills?: IAssessedSkillSummary[];
  unassessedSkills?: string[];
  currentDifficulty?: string;
  followupDepth?: number;
  maxFollowupDepth?: number;
  currentQuestionIndex?: number;
  nextAction?: string;
  nextActionReason?: string;
  questions: Array<{
    questionId: string;
    text: string;
    category: string;
    skill?: string;
    difficulty: string;
    isFollowup?: boolean;
    parentQuestionId?: string;
    followupReason?: string;
    resumeReference?: string;
  }>;
  responses: IInterviewResponse[];
  overallScore: number;
  status: "in_progress" | "completed";
  report?: {
    overallScore: number;
    topicBreakdown: Array<{ topic: string; score: number }>;
    assessedSkills?: IAssessedSkillSummary[];
    unassessedSkills?: string[];
    dimensionScores?: {
      technicalCorrectness: number;
      accuracy: number;
      depth: number;
      communication: number;
      practicalApplication: number;
    };
    strengths: string[];
    weaknesses: string[];
    conceptsToRevise: string[];
    suggestedResources: string[];
    suggestedProjects: string[];
    recommendedRoadmapSteps?: string[];
    recommendedNextInterview: string;
    historicalComparison?: {
      previousAverageScore: number;
      scoreDelta: number;
      sessionsAnalyzed: number;
      note: string;
    };
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
    isAdaptive: { type: Boolean, default: false },
    jobDescription: { type: String, default: "" },
    targetSkills: [{ type: String }],
    assessedSkills: [
      {
        skill: String,
        score: Number,
        questionsCount: Number,
        status: { type: String, enum: ["strong", "competent", "weak"] },
      },
    ],
    unassessedSkills: [{ type: String }],
    currentDifficulty: { type: String, default: "Medium" },
    followupDepth: { type: Number, default: 0 },
    maxFollowupDepth: { type: Number, default: 2 },
    currentQuestionIndex: { type: Number, default: 0 },
    nextAction: { type: String, default: "next_skill" },
    nextActionReason: { type: String, default: "" },
    questions: [
      {
        questionId: String,
        text: String,
        category: String,
        skill: String,
        difficulty: String,
        isFollowup: { type: Boolean, default: false },
        parentQuestionId: String,
        followupReason: String,
        resumeReference: String,
      },
    ],
    responses: [
      {
        questionId: String,
        questionText: String,
        category: String,
        skill: String,
        userAnswer: String,
        accuracy: Number,
        communication: Number,
        technicalCorrectness: Number,
        depth: Number,
        confidence: Number,
        practicalApplication: Number,
        strengths: [String],
        gaps: [String],
        suggestedImprovement: String,
        betterAnswer: String,
        followupQuestion: String,
        difficultyRating: String,
        recommendedAction: String,
        score: Number,
        evaluatedAt: { type: Date, default: Date.now },
      },
    ],
    overallScore: { type: Number, default: 0 },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    report: {
      overallScore: Number,
      topicBreakdown: [{ topic: String, score: Number }],
      assessedSkills: [
        {
          skill: String,
          score: Number,
          questionsCount: Number,
          status: { type: String, enum: ["strong", "competent", "weak"] },
        },
      ],
      unassessedSkills: [String],
      dimensionScores: {
        technicalCorrectness: Number,
        accuracy: Number,
        depth: Number,
        communication: Number,
        practicalApplication: Number,
      },
      strengths: [String],
      weaknesses: [String],
      conceptsToRevise: [String],
      suggestedResources: [String],
      suggestedProjects: [String],
      recommendedRoadmapSteps: [String],
      recommendedNextInterview: String,
      historicalComparison: {
        previousAverageScore: Number,
        scoreDelta: Number,
        sessionsAnalyzed: Number,
        note: String,
      },
    },
  },
  { timestamps: true }
);

const InterviewSession = mongoose.model<IInterviewSession>("InterviewSession", interviewSessionSchema);

export default InterviewSession;
