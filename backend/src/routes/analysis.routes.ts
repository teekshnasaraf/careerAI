import { Router } from "express";
import authenticate from "../middleware/auth.middleware";
import {
  getLatestAnalysis,
  runResumeAnalysis,
  improveSection,
  runSkillGapAnalysis,
} from "../controllers/analysis.controller";

const router = Router();

router.get("/latest", authenticate, getLatestAnalysis);
router.post("/resume", authenticate, runResumeAnalysis);
router.post("/improve-section", authenticate, improveSection);
router.post("/skill-gap", authenticate, runSkillGapAnalysis);

export default router;
