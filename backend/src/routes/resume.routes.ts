import { Router } from "express";
import authenticate from "../middleware/auth.middleware";
import { uploadResumeFile } from "../middleware/upload";
import {
  uploadResume,
  getLatestResume,
  deleteResume,
} from "../controllers/resume.controller";

const router = Router();

router.post(
  "/upload",
  authenticate,
  uploadResumeFile.single("resume"),
  uploadResume
);

router.get("/latest", authenticate, getLatestResume);

router.delete("/:id", authenticate, deleteResume);

export default router;
