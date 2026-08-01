import { Router } from "express";
import authenticate from "../middleware/auth.middleware";
import {
  startInterviewSession,
  submitQuestionAnswer,
  finishInterviewSession,
  getInterviewHistoryStats,
} from "../controllers/interview.controller";

const router = Router();

router.get("/stats", authenticate, getInterviewHistoryStats);
router.post("/start", authenticate, startInterviewSession);
router.post("/submit-answer", authenticate, submitQuestionAnswer);
router.post("/finish", authenticate, finishInterviewSession);

export default router;
