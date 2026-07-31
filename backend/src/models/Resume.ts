import mongoose, { Document, Schema } from "mongoose";

export interface IResume extends Document {
  user: mongoose.Types.ObjectId;
  originalName: string;
  fileName: string;
  fileUrl: string;
  publicId?: string;
  fileSize: number;
  mimeType: string;
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
  };
  aiFeedback?: Array<{
    type: "strength" | "warning" | "tip";
    title: string;
    description: string;
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
    },

    aiFeedback: [
      {
        type: {
          type: String,
          enum: ["strength", "warning", "tip"],
        },
        title: String,
        description: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Resume = mongoose.model<IResume>("Resume", resumeSchema);

export default Resume;
