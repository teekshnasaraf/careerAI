import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pinoHttp from "pino-http";
import authRoutes from "./routes/auth.routes";

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

app.use("/api/auth", authRoutes);

// Health Check Route
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CareerAI Backend Running 🚀",
  });
});

export default app;