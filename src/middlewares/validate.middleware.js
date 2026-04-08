import ApiError from "../helpers/ApiError.js";

const mapIssues = (issues) => {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
};

const validate = (schema, target) => (req, _res, next) => {
  const result = schema.safeParse(req[target]);

  if (!result.success) {
    throw new ApiError(400, "Validation failed", "VALIDATION_ERROR", mapIssues(result.error.issues));
  }

  req[target] = result.data;
  next();
};

export const validateBody = (schema) => validate(schema, "body");
export const validateParams = (schema) => validate(schema, "params");
export const validateQuery = (schema) => validate(schema, "query");
