import jwt from "jsonwebtoken";
import env from "../config/env.js";
import ApiError from "../helpers/ApiError.js";
import { UserModel } from "../models/user.model.js";

const authMiddleware = async (req, _res, next) => {
  const authHeader = req.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new ApiError(401, "Authentication required", "UNAUTHORIZED"));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await UserModel.findById(payload.sub).select("email role");

    if (!user) {
      return next(new ApiError(401, "Invalid token", "UNAUTHORIZED"));
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    return next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    return next(new ApiError(401, "Invalid or expired token", "UNAUTHORIZED"));
  }
};

export default authMiddleware;
