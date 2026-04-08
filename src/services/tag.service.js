import { isValidObjectId } from "mongoose";
import ApiError from "../helpers/ApiError.js";
import { TagModel } from "../models/tag.model.js";
import slugify from "../utils/slugify.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildUniqueSlug = async (baseName, excludeId = null) => {
  const baseSlug = slugify(baseName) || `tag-${Date.now()}`;
  let attempt = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await TagModel.findOne({ slug: attempt }).select("_id").lean();

    if (!existing || (excludeId && existing._id.toString() === excludeId.toString())) {
      return attempt;
    }

    attempt = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

export const listPublicTags = async () => {
  return TagModel.find({ isActive: true }).sort({ name: 1 });
};

export const listAdminTags = async () => {
  return TagModel.find().sort({ name: 1 });
};

export const createTag = async (payload) => {
  const normalizedName = payload.name.trim();

  const existing = await TagModel.findOne({
    name: {
      $regex: `^${escapeRegex(normalizedName)}$`,
      $options: "i",
    },
  })
    .select("_id")
    .lean();

  if (existing) {
    throw new ApiError(409, "Tag already exists", "TAG_EXISTS");
  }

  const slug = await buildUniqueSlug(normalizedName);

  return TagModel.create({
    name: normalizedName,
    slug,
    description: payload.description?.trim() || "",
  });
};

export const getTagByIdOrThrow = async (tagId) => {
  if (!isValidObjectId(tagId)) {
    throw new ApiError(400, "Invalid tag", "INVALID_TAG");
  }

  const tag = await TagModel.findById(tagId);

  if (!tag || !tag.isActive) {
    throw new ApiError(400, "Tag not found", "TAG_NOT_FOUND");
  }

  return tag;
};
