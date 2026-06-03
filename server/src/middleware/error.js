export function notFound(req, res, next) {
  const error = new Error(`Not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
}

export function errorHandler(error, req, res, next) {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(', ')
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'This record already exists.' });
  }

  return res.status(statusCode).json({
    message: error.message || 'Something went wrong.'
  });
}
