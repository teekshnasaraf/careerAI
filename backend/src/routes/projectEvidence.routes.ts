import { Router } from "express";
import authenticate from "../middleware/auth.middleware";
import {
  analyzeProjectEvidence,
  getProjectEvidence,
  getAllUserProjectEvidence,
  deleteProjectEvidence,
} from "../controllers/projectEvidence.controller";

const router = Router();

router.post("/analyze", authenticate, analyzeProjectEvidence);
router.get("/user", authenticate, getAllUserProjectEvidence);
router.get("/project/:projectTitle", authenticate, getProjectEvidence);
router.delete("/:id", authenticate, deleteProjectEvidence);

export default router;
