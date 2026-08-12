import { sendError } from "../helpers/response.helper.js";

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  return sendError(res, {
    code: err.statusCode || 500,
    message: err.message || "Something went wrong",
    error: null,
  });
};