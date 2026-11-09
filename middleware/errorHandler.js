// 404 cho đường dẫn không tồn tại
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Không tìm thấy ${req.method} ${req.originalUrl}` });
};

// Mọi lỗi trong ứng dụng đều đi qua đây và trả về JSON thống nhất
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Lỗi máy chủ';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join('; ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Giá trị không hợp lệ ở trường "${err.path}"`;
  } else if (err.code === 11000) {
    status = 409;
    message = `Giá trị đã tồn tại: ${Object.keys(err.keyValue || {}).join(', ')}`;
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Token không hợp lệ';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token đã hết hạn, vui lòng đăng nhập lại';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Body không phải JSON hợp lệ';
  }

  if (status === 500) {
    console.error(err);
    message = 'Lỗi máy chủ';
  }

  res.status(status).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
