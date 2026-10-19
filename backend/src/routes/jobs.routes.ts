import { Router } from "express";
import authenticate from "../middleware/auth.middleware";
import { matchJobDescription } from "../controllers/jobMatch.controller";
import {
  generateLearningRoadmap,
  getActiveRoadmap,
  updateRoadmapStepStatus,
} from "../controllers/roadmap.controller";

const router = Router();
router.post("/match", authenticate, matchJobDescription);
router.post("/roadmap", authenticate, generateLearningRoadmap);
router.get("/roadmap", authenticate, getActiveRoadmap);
router.patch("/roadmap/step", authenticate, updateRoadmapStepStatus);

export default router;

