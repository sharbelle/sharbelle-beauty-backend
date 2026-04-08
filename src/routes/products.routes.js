import { Router } from "express";
import { getProducts, getPublicProductFilters } from "../controllers/products.controller.js";
import { validateQuery } from "../middlewares/validate.middleware.js";
import { productListQuerySchema } from "../models/product.model.js";

const router = Router();

router.get("/filters", getPublicProductFilters);
router.get("/", validateQuery(productListQuerySchema), getProducts);

export default router;
