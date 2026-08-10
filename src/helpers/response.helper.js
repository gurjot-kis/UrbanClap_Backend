export const sendSuccess = (
  res,
  {
    code = 200,
    message = "Success",
    data = null,
    pagination = undefined,
  } = {}
) => {
  const response = {
    success: true,
    code,
    message,
    data,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(code).json(response);
};

export const sendError = (
  res,
  {
    code = 500,
    message = "Something went wrong",
    error = null,
  } = {}
) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    error,
  });
};

