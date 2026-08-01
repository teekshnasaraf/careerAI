import { Router } from "express";
import authenticate from "../middleware/auth.middleware";
import { getUserSettings, updateUserSettings } from "../controllers/settings.controller";

const router = Router();

router.get("/", authenticate, getUserSettings);
router.put("/", authenticate, updateUserSettings);

export default router;
