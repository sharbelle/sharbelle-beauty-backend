import { Router } from "express";
import { subscribe } from "../controllers/waitlist.controller.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { waitlistSubscribeInputSchema } from "../models/waitlist.model.js";

const router = Router();

router.post("/", validateBody(waitlistSubscribeInputSchema), subscribe);

export default router;
