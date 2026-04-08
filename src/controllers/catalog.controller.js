import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import { createCategory, listAdminCategories } from "../services/category.service.js";
import { createTag, listAdminTags } from "../services/tag.service.js";

export const getAdminCategories = asyncHandler(async (_req, res) => {
  const categories = await listAdminCategories();

  return sendResponse(res, {
    message: "Admin categories fetched",
    data: {
      categories,
    },
    meta: {
      count: categories.length,
    },
  });
});

export const createAdminCategory = asyncHandler(async (req, res) => {
  const category = await createCategory(req.body);

  return sendResponse(res, {
    statusCode: 201,
    message: "Category created",
    data: {
      category,
    },
  });
});

export const getAdminTags = asyncHandler(async (_req, res) => {
  const tags = await listAdminTags();

  return sendResponse(res, {
    message: "Admin tags fetched",
    data: {
      tags,
    },
    meta: {
      count: tags.length,
    },
  });
});

export const createAdminTag = asyncHandler(async (req, res) => {
  const tag = await createTag(req.body);

  return sendResponse(res, {
    statusCode: 201,
    message: "Tag created",
    data: {
      tag,
    },
  });
});
