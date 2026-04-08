import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import {
  createProduct,
  deleteProduct,
  getAdminProductById,
  getProductFilters,
  listAdminProducts,
  listPublicProducts,
  updateProduct,
} from "../services/product.service.js";

export const getProducts = asyncHandler(async (req, res) => {
  const { items, meta } = await listPublicProducts(req.query);

  return sendResponse(res, {
    message: "Products fetched",
    data: {
      products: items,
    },
    meta,
  });
});

export const getPublicProductFilters = asyncHandler(async (_req, res) => {
  const filters = await getProductFilters();

  return sendResponse(res, {
    message: "Product filters fetched",
    data: {
      filters,
    },
  });
});

export const getAdminProducts = asyncHandler(async (req, res) => {
  const { items, meta } = await listAdminProducts(req.query);

  return sendResponse(res, {
    message: "Admin products fetched",
    data: {
      products: items,
    },
    meta,
  });
});

export const getAdminProduct = asyncHandler(async (req, res) => {
  const product = await getAdminProductById(req.params.productId);

  return sendResponse(res, {
    message: "Admin product fetched",
    data: {
      product,
    },
  });
});

export const createAdminProduct = asyncHandler(async (req, res) => {
  const product = await createProduct(req.body);

  return sendResponse(res, {
    statusCode: 201,
    message: "Product created",
    data: {
      product,
    },
  });
});

export const updateAdminProduct = asyncHandler(async (req, res) => {
  const product = await updateProduct(req.params.productId, req.body);

  return sendResponse(res, {
    message: "Product updated",
    data: {
      product,
    },
  });
});

export const deleteAdminProduct = asyncHandler(async (req, res) => {
  const deletedProduct = await deleteProduct(req.params.productId);

  return sendResponse(res, {
    message: "Product deleted",
    data: {
      product: deletedProduct,
    },
  });
});
