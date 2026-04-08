import { Router } from "express";
import { login, me, register } from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { loginInputSchema, registerInputSchema } from "../models/user.model.js";

const router = Router();

router.post("/register", validateBody(registerInputSchema), register);
router.post("/login", validateBody(loginInputSchema), login);
router.get("/me", authMiddleware, me);

export default router;
