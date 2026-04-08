import { Router } from "express";
import { getPublicStoreSettings } from "../controllers/store-settings.controller.js";

const router = Router();

router.get("/", getPublicStoreSettings);

export default router;
