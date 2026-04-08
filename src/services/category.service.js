import { isValidObjectId } from "mongoose";
import ApiError from "../helpers/ApiError.js";
import { CategoryModel } from "../models/category.model.js";
import slugify from "../utils/slugify.js";

const normalizeSubcategories = (values = []) => {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
};

const buildUniqueSlug = async (baseName, excludeId = null) => {
  const baseSlug = slugify(baseName) || `category-${Date.now()}`;
  let attempt = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await CategoryModel.findOne({ slug: attempt }).select("_id").lean();

    if (!existing || (excludeId && existing._id.toString() === excludeId.toString())) {
      return attempt;
    }

    attempt = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

export const listPublicCategories = async () => {
  return CategoryModel.find({ isActive: true }).sort({ name: 1 });
};

export const listAdminCategories = async () => {
  return CategoryModel.find().sort({ name: 1 });
};

export const createCategory = async (payload) => {
  const normalizedName = payload.name.trim();

  const existing = await CategoryModel.findOne({
    name: {
      $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    },
  })
    .select("_id")
    .lean();

  if (existing) {
    throw new ApiError(409, "Category already exists", "CATEGORY_EXISTS");
  }

  const slug = await buildUniqueSlug(normalizedName);

  return CategoryModel.create({
    name: normalizedName,
    slug,
    description: payload.description?.trim() || "",
    subcategories: normalizeSubcategories(payload.subcategories),
  });
};

export const getCategoryByIdOrThrow = async (categoryId) => {
  if (!isValidObjectId(categoryId)) {
    throw new ApiError(400, "Invalid category", "INVALID_CATEGORY");
  }

  const category = await CategoryModel.findById(categoryId);

  if (!category || !category.isActive) {
    throw new ApiError(400, "Category not found", "CATEGORY_NOT_FOUND");
  }

  return category;
};
