import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pinoHttp from "pino-http";

import path from "path";

import authRoutes from "./routes/auth.routes";
import resumeRoutes from "./routes/resume.routes";

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

// Health Check
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CareerAI Backend Running 🚀",
  });
});

export default app;