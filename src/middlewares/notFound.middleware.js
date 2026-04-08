import ApiError from "../helpers/ApiError.js";

const notFoundMiddleware = (req, _res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`, "NOT_FOUND"));
};

export default notFoundMiddleware;
