import { Router } from "express";
import authenticate from "../middleware/auth.middleware";
import { getProgressStats } from "../controllers/progress.controller";

const router = Router();

router.get("/stats", authenticate, getProgressStats);

export default router;
