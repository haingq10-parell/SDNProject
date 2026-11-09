const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, pageMeta } = require('../utils/pagination');
const { asString, pick } = require('../utils/helpers');

// GET /api/users (admin)
exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 20);
  const filter = {};
  const role = asString(req.query.role);
  if (role) filter.role = role;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  res.json({ success: true, ...pageMeta(total, page, limit), count: users.length, data: users });
});

// GET /api/users/:id (admin)
exports.getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  res.json({ success: true, data: user });
});

// PATCH /api/users/:id (admin) - đổi role hoặc khóa/mở tài khoản
exports.update = asyncHandler(async (req, res) => {
  const data = pick(req.body, ['role', 'isActive']);

  if (req.params.id === req.user.id && (data.role === 'customer' || data.isActive === false)) {
    throw new AppError('Bạn không thể tự hạ quyền hoặc khóa chính mình', 400);
  }

  const user = await User.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  res.json({ success: true, message: 'Đã cập nhật người dùng', data: user });
});
