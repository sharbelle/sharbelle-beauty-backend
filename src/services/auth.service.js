import bcrypt from "bcryptjs";
import ApiError from "../helpers/ApiError.js";
import { UserModel } from "../models/user.model.js";

const sanitizePreferences = (values = []) => {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
};

export const registerUser = async ({
  fullName,
  email,
  password,
  phone,
  preferredCategories,
  preferredSubcategories,
}) => {
  const normalizedEmail = email.toLowerCase();

  const existingUser = await UserModel.exists({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, "Email already registered", "EMAIL_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let user;

  try {
    user = await UserModel.create({
      fullName,
      email: normalizedEmail,
      passwordHash,
      role: "user",
      phone: phone || null,
      preferredCategories: sanitizePreferences(preferredCategories),
      preferredSubcategories: sanitizePreferences(preferredSubcategories),
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, "Email already registered", "EMAIL_EXISTS");
    }

    throw error;
  }

  return user;
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase();
  const user = await UserModel.findOne({ email: normalizedEmail }).select("+passwordHash");

  if (!user) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  return user;
};

export const getCurrentUser = async (userId) => {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new ApiError(401, "User not found", "UNAUTHORIZED");
  }

  return user;
};
