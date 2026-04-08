import ApiError from "../helpers/ApiError.js";

const allowRoles = (...roles) => (req, _res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required", "UNAUTHORIZED");
  }

  if (!roles.includes(req.user.role)) {
    throw new ApiError(403, "Insufficient permissions", "FORBIDDEN");
  }

  next();
};

export default allowRoles;
