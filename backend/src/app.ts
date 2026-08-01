import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pinoHttp from "pino-http";

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

// Health Check
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CareerAI Backend Running 🚀",
  });
});

export default app;