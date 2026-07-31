import { Router } from "express";

import validate from "../middleware/validate";
import authenticate from "../middleware/auth.middleware";

import {
  register,
  login,
  getCurrentUser,
} from "../controllers/auth.controller";

import {
  registerSchema,
  loginSchema,
} from "../validators/auth.validator";

const router = Router();

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.get("/me", authenticate, getCurrentUser);

export default router;