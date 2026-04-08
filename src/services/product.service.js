import { isValidObjectId } from "mongoose";
import ApiError from "../helpers/ApiError.js";
import { ProductModel } from "../models/product.model.js";
import { listPublicCategories, getCategoryByIdOrThrow } from "./category.service.js";
import { listPublicTags, getTagByIdOrThrow } from "./tag.service.js";
import slugify from "../utils/slugify.js";
import { assertAssetExists } from "./upload.service.js";
import { toPaginationMeta, toSkipValue } from "../utils/pagination.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toStringId = (value) => {
  if (!value) {
    return null;
  }

  return value.toString ? value.toString() : value;
};

const serializeProduct = (product) => {
  const plain = product?.toJSON ? product.toJSON() : product;
  const id = plain.id || toStringId(plain._id);
  const categoryId = toStringId(plain.categoryId);
  const tagId = toStringId(plain.tagId);

  return {
    ...plain,
    id,
    categoryId,
    category: plain.categoryName || plain.category || "",
    categoryName: plain.categoryName || plain.category || "",
    tagId,
    tag: plain.tagName || plain.tag || null,
    tagName: plain.tagName || plain.tag || null,
  };
};

const buildUniqueProductSlug = async (name, excludeId = null) => {
  const baseSlug = slugify(name) || `product-${Date.now()}`;
  let attempt = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await ProductModel.findOne({ slug: attempt }).select("_id").lean();

    if (!existing || (excludeId && existing._id.toString() === excludeId.toString())) {
      return attempt;
    }

    attempt = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const buildProductQuery = ({
  categoryId,
  categoryIds,
  tagId,
  tagIds,
  search,
  inStock,
}) => {
  const query = {};

  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    query.categoryId = { $in: categoryIds };
  } else if (categoryId) {
    query.categoryId = categoryId;
  }

  if (Array.isArray(tagIds) && tagIds.length > 0) {
    query.tagId = { $in: tagIds };
  } else if (tagId) {
    query.tagId = tagId;
  }

  if (typeof inStock === "boolean") {
    query.inStock = inStock;
  }

  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    query.$or = [
      { name: pattern },
      { slug: pattern },
      { description: pattern },
      { categoryName: pattern },
      { tagName: pattern },
    ];
  }

  return query;
};

const buildFiltersMeta = async () => {
  const [categories, tags, categoryCounts, tagCounts] = await Promise.all([
    listPublicCategories(),
    listPublicTags(),
    ProductModel.aggregate([
      { $match: { categoryId: { $ne: null } } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]),
    ProductModel.aggregate([
      { $match: { tagId: { $ne: null } } },
      { $group: { _id: "$tagId", count: { $sum: 1 } } },
    ]),
  ]);

  const categoryCountMap = new Map(
    categoryCounts.map((entry) => [entry._id.toString(), entry.count]),
  );
  const tagCountMap = new Map(tagCounts.map((entry) => [entry._id.toString(), entry.count]));

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      subcategories: category.subcategories || [],
      productCount: categoryCountMap.get(category.id) || 0,
    })),
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description || "",
      productCount: tagCountMap.get(tag.id) || 0,
    })),
  };
};

export const listPublicProducts = async (filters = {}) => {
  const { page = 1, limit = 12, ...criteria } = filters;
  const query = buildProductQuery(criteria);
  const skip = toSkipValue(page, limit);

  const [totalItems, products] = await Promise.all([
    ProductModel.countDocuments(query),
    ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    items: products.map(serializeProduct),
    meta: toPaginationMeta({
      page,
      limit,
      totalItems,
    }),
  };
};

export const listAdminProducts = async (filters = {}) => {
  const { page = 1, limit = 12, ...criteria } = filters;
  const query = buildProductQuery(criteria);
  const skip = toSkipValue(page, limit);

  const [totalItems, products] = await Promise.all([
    ProductModel.countDocuments(query),
    ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    items: products.map(serializeProduct),
    meta: toPaginationMeta({
      page,
      limit,
      totalItems,
    }),
  };
};

export const getProductFilters = async () => {
  return buildFiltersMeta();
};

export const createProduct = async (payload) => {
  const category = await getCategoryByIdOrThrow(payload.categoryId);
  const tag = payload.tagId ? await getTagByIdOrThrow(payload.tagId) : null;
  const slug = await buildUniqueProductSlug(payload.name);
  await assertAssetExists({
    publicId: payload.imagePublicId.trim(),
    secureUrl: payload.image,
  });

  try {
    const product = await ProductModel.create({
      name: payload.name.trim(),
      slug,
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      tagId: tag?.id || null,
      tagName: tag?.name || null,
      tagSlug: tag?.slug || null,
      priceInNaira: payload.priceInNaira,
      description: payload.description.trim(),
      image: payload.image,
      imagePublicId: payload.imagePublicId.trim(),
      inventoryCount: payload.inventoryCount ?? 0,
      inStock: payload.inStock ?? (payload.inventoryCount ?? 0) > 0,
    });

    return serializeProduct(product);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, "A product with this slug already exists", "DUPLICATE_PRODUCT_SLUG");
    }

    throw error;
  }
};

export const updateProduct = async (productId, payload) => {
  if (!isValidObjectId(productId)) {
    throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
  }

  const product = await ProductModel.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
  }

  if (typeof payload.name === "string" && payload.name.trim()) {
    product.name = payload.name.trim();
    product.slug = await buildUniqueProductSlug(payload.name, product.id);
  }

  if (payload.categoryId) {
    const category = await getCategoryByIdOrThrow(payload.categoryId);
    product.categoryId = category.id;
    product.categoryName = category.name;
    product.categorySlug = category.slug;
  }

  if (payload.tagId === null) {
    product.tagId = null;
    product.tagName = null;
    product.tagSlug = null;
  } else if (payload.tagId) {
    const tag = await getTagByIdOrThrow(payload.tagId);
    product.tagId = tag.id;
    product.tagName = tag.name;
    product.tagSlug = tag.slug;
  }

  if (typeof payload.priceInNaira === "number") {
    product.priceInNaira = payload.priceInNaira;
  }

  if (typeof payload.description === "string") {
    product.description = payload.description.trim();
  }

  if (typeof payload.image === "string") {
    product.image = payload.image;
  }

  if (typeof payload.imagePublicId === "string") {
    product.imagePublicId = payload.imagePublicId.trim();
  }

  if (
    (typeof payload.image === "string" && payload.image.trim()) ||
    (typeof payload.imagePublicId === "string" && payload.imagePublicId.trim())
  ) {
    await assertAssetExists({
      publicId: product.imagePublicId,
      secureUrl: product.image,
    });
  }

  if (typeof payload.inventoryCount === "number") {
    product.inventoryCount = payload.inventoryCount;
    if (payload.inventoryCount <= 0) {
      product.inStock = false;
    }
  }

  if (typeof payload.inStock === "boolean") {
    product.inStock = payload.inStock;
  }

  try {
    await product.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, "A product with this slug already exists", "DUPLICATE_PRODUCT_SLUG");
    }

    throw error;
  }

  return serializeProduct(product);
};

export const getAdminProductById = async (productId) => {
  if (!isValidObjectId(productId)) {
    throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
  }

  const product = await ProductModel.findById(productId).lean();

  if (!product) {
    throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
  }

  return serializeProduct(product);
};

export const deleteProduct = async (productId) => {
  if (!isValidObjectId(productId)) {
    throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
  }

  const deleted = await ProductModel.findByIdAndDelete(productId).lean();

  if (!deleted) {
    throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
  }

  return serializeProduct(deleted);
};

export const getProductsByIds = async (productIds) => {
  const normalizedIds = [...new Set(productIds.map((id) => id.toString()))].filter((id) =>
    isValidObjectId(id),
  );

  if (normalizedIds.length === 0) {
    return [];
  }

  const products = await ProductModel.find({ _id: { $in: normalizedIds } }).lean();
  return products.map(serializeProduct);
};
