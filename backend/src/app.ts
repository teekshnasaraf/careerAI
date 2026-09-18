import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import pinoHttp from "pino-http";
import multer from "multer";

import path from "path";

import authRoutes from "./routes/auth.routes";
import resumeRoutes from "./routes/resume.routes";
import analysisRoutes from "./routes/analysis.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import interviewRoutes from "./routes/interview.routes";
import progressRoutes from "./routes/progress.routes";
import settingsRoutes from "./routes/settings.routes";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(pinoHttp());

// Static file serving for uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/settings", settingsRoutes);

// Keep upload validation errors JSON-shaped for the frontend. Other errors remain
// generic so internal implementation details are never exposed to clients.
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    const isTooLarge = error.code === "LIMIT_FILE_SIZE";
    res.status(isTooLarge ? 413 : 400).json({
      success: false,
      message: isTooLarge
        ? "Resume file is too large. Maximum allowed size is 5 MB."
        : "The resume upload is invalid.",
    });
    return;
  }

  if (error.message === "Invalid file type. Only PDF and DOCX files are allowed.") {
    res.status(415).json({ success: false, message: error.message });
    return;
  }

  res.status(500).json({ success: false, message: "Server error processing request" });
});

// Health Check
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CareerAI Backend Running 🚀",
  });
});

export default app;
