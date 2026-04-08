import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import pickSafeUser from "../helpers/pickSafeUser.js";
import generateToken from "../helpers/generateToken.js";
import { getCurrentUser, loginUser, registerUser } from "../services/auth.service.js";

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  const token = generateToken(user);

  return sendResponse(res, {
    statusCode: 201,
    message: "Registration successful",
    data: {
      user: pickSafeUser(user),
      token,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body);
  const token = generateToken(user);

  return sendResponse(res, {
    message: "Login successful",
    data: {
      user: pickSafeUser(user),
      token,
    },
  });
});

export const me = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user.id);

  return sendResponse(res, {
    message: "Current user fetched",
    data: {
      user: pickSafeUser(user),
    },
  });
});
