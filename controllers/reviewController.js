const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, pageMeta } = require('../utils/pagination');
const { asString } = require('../utils/helpers');

// Tính lại điểm trung bình & số lượt đánh giá của sản phẩm
async function updateProductRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  await Product.findByIdAndUpdate(productId, {
    ratingAvg: stats ? Math.round(stats.avg * 10) / 10 : 0,
    ratingCount: stats ? stats.count : 0
  });
}

// GET /api/products/:productId/reviews
exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 10);
  const filter = { product: req.params.productId };

  const [reviews, total] = await Promise.all([
    Review.find(filter).populate('user', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter)
  ]);
  res.json({ success: true, ...pageMeta(total, page, limit), count: reviews.length, data: reviews });
});

// POST /api/products/:productId/reviews  { rating, comment }
exports.create = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError('rating phải là số nguyên từ 1 đến 5', 400);
  }
  if (!(await Product.exists({ _id: productId, isActive: true }))) {
    throw new AppError('Không tìm thấy sản phẩm', 404);
  }
  if (await Review.exists({ product: productId, user: req.user._id })) {
    throw new AppError('Bạn đã đánh giá sản phẩm này rồi', 409);
  }

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    rating,
    comment: asString(req.body.comment)
  });
  await updateProductRating(productId);
  await review.populate('user', 'name');

  res.status(201).json({ success: true, message: 'Đã gửi đánh giá', data: review });
});

// DELETE /api/products/:productId/reviews/:id  (chủ đánh giá hoặc admin)
exports.remove = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, product: req.params.productId });
  if (!review) throw new AppError('Không tìm thấy đánh giá', 404);

  if (!review.user.equals(req.user._id) && req.user.role !== 'admin') {
    throw new AppError('Bạn không có quyền xóa đánh giá này', 403);
  }

  await review.deleteOne();
  await updateProductRating(review.product);
  res.json({ success: true, message: 'Đã xóa đánh giá' });
});
