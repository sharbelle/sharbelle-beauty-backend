const sendResponse = (res, { statusCode = 200, message = "Success", data = null, meta = undefined }) => {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

export default sendResponse;
