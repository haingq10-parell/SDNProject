const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { asString } = require('../utils/helpers');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const name = asString(req.body.name);
  const email = asString(req.body.email);
  const password = asString(req.body.password);
  const phone = asString(req.body.phone);

  if (!name || !email || !password) {
    throw new AppError('Vui lòng nhập name, email và password', 400);
  }
  if (await User.findOne({ email: email.toLowerCase().trim() })) {
    throw new AppError('Email đã được đăng ký', 409);
  }

  // role luôn là customer, không cho client tự chọn
  const user = await User.create({ name, email, password, phone });

  res.status(201).json({
    success: true,
    message: 'Đăng ký thành công',
    data: { token: signToken(user), user }
  });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const email = asString(req.body.email);
  const password = asString(req.body.password);
  if (!email || !password) throw new AppError('Vui lòng nhập email và password', 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
  }

  res.json({
    success: true,
    message: 'Đăng nhập thành công',
    data: { token: signToken(user), user }
  });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

// PUT /api/auth/me
exports.updateMe = asyncHandler(async (req, res) => {
  const name = asString(req.body.name);
  const phone = asString(req.body.phone);
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json({ success: true, message: 'Đã cập nhật thông tin', data: req.user });
});

// PUT /api/auth/password
exports.changePassword = asyncHandler(async (req, res) => {
  const currentPassword = asString(req.body.currentPassword);
  const newPassword = asString(req.body.newPassword);
  if (!currentPassword || !newPassword) {
    throw new AppError('Vui lòng nhập currentPassword và newPassword', 400);
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Mật khẩu hiện tại không đúng', 401);
  }

  user.password = newPassword; // hook pre('save') sẽ tự băm
  await user.save();
  res.json({ success: true, message: 'Đã đổi mật khẩu' });
});
