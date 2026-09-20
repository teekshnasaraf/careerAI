import mongoose, { Document, Schema } from "mongoose";

export interface IUserSettings extends Document {
  user: mongoose.Types.ObjectId;
  profile: {
    name: string;
    phone: string;
    college: string;
    degree: string;
    branch: string;
    graduationYear: string;
    cgpa: string;
    location: string;
    linkedin: string;
    github: string;
    portfolio: string;
    bio: string;
    avatarUrl: string;
  };
  career: {
    preferredRole: string;
    preferredDomain: string;
    preferredCompanies: string[];
    preferredLocation: string;
    workType: string;
    expectedSalary: string;
    experienceLevel: string;
    careerGoal: string;
  };
  learning: {
    weeklyHours: number;
    learningStyle: string;
    preferredLanguage: string;
    preferredDifficulty: string;
    roadmapStyle: string;
  };
  aiPreferences: {
    tone: string;
    explanationDepth: string;
    autoAnalyze: boolean;
    autoUpdateRoadmap: boolean;
    autoGenerateQuestions: boolean;
  };
  notifications: {
    email: boolean;
    interviewReminders: boolean;
    roadmapReminders: boolean;
    weeklyProgress: boolean;
    resumeAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSettingsSchema = new Schema<IUserSettings>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    profile: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      college: { type: String, default: "" },
      degree: { type: String, default: "" },
      branch: { type: String, default: "" },
      graduationYear: { type: String, default: "" },
      cgpa: { type: String, default: "" },
      location: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
      portfolio: { type: String, default: "" },
      bio: { type: String, default: "" },
      avatarUrl: { type: String, default: "" },
    },
    career: {
      preferredRole: { type: String, default: "" },
      preferredDomain: { type: String, default: "" },
      preferredCompanies: { type: [String], default: [] },
      preferredLocation: { type: String, default: "" },
      workType: { type: String, default: "" },
      expectedSalary: { type: String, default: "" },
      experienceLevel: { type: String, default: "" },
      careerGoal: { type: String, default: "" },
    },
    learning: {
      weeklyHours: { type: Number, default: 0 },
      learningStyle: { type: String, default: "" },
      preferredLanguage: { type: String, default: "" },
      preferredDifficulty: { type: String, default: "" },
      roadmapStyle: { type: String, default: "" },
    },
    aiPreferences: {
      // tone/explanationDepth start empty so the user explicitly chooses their preference.
      // Boolean toggles remain true — these are functional defaults, not personal data.
      tone: { type: String, default: "" },
      explanationDepth: { type: String, default: "" },
      autoAnalyze: { type: Boolean, default: true },
      autoUpdateRoadmap: { type: Boolean, default: true },
      autoGenerateQuestions: { type: Boolean, default: true },
    },
    notifications: {
      email: { type: Boolean, default: true },
      interviewReminders: { type: Boolean, default: true },
      roadmapReminders: { type: Boolean, default: true },
      weeklyProgress: { type: Boolean, default: true },
      resumeAlerts: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const UserSettings = mongoose.model<IUserSettings>("UserSettings", userSettingsSchema);

export default UserSettings;
