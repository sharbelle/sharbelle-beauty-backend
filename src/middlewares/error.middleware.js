import env from "../config/env.js";

const errorMiddleware = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const payload = {
    success: false,
    message: error.message || "Internal server error",
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      details: error.details || null,
    },
  };

  if (env.nodeEnv !== "production" && statusCode === 500) {
    payload.error.stack = error.stack;
  }

  res.status(statusCode).json(payload);
};

export default errorMiddleware;
