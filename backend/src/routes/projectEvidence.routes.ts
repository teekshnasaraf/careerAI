import { Router } from "express";
import authenticate from "../middleware/auth.middleware";
import {
  analyzeProjectEvidence,
  getProjectEvidence,
  getAllUserProjectEvidence,
  getProjectEvidenceById,
  deleteProjectEvidence,
  getGitHubStatus,
} from "../controllers/projectEvidence.controller";

const router = Router();

router.post("/analyze", authenticate, analyzeProjectEvidence);
router.get("/", authenticate, getAllUserProjectEvidence);
router.get("/user", authenticate, getAllUserProjectEvidence);
router.get("/status", authenticate, getGitHubStatus);
router.get("/project/:projectTitle", authenticate, getProjectEvidence);
router.get("/:id", authenticate, getProjectEvidenceById);
router.delete("/:id", authenticate, deleteProjectEvidence);

export default router;
