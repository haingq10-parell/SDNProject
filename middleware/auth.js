const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Xác thực JWT: header "Authorization: Bearer <token>"
const verifyToken = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Bạn chưa đăng nhập (thiếu header Authorization: Bearer <token>)', 401);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET); // lỗi sẽ do errorHandler xử lý
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError('Tài khoản không tồn tại hoặc đã bị khóa', 401);
  }

  req.user = user;
  next();
});

// Phân quyền theo vai trò: authorize('admin')
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('Bạn không có quyền thực hiện thao tác này', 403));
  }
  next();
};

module.exports = { verifyToken, authorize };
