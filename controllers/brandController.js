const Brand = require('../models/Brand');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const { pick } = require('../utils/helpers');

const FIELDS = ['name', 'slug', 'logo', 'country'];

// GET /api/brands
exports.getAll = asyncHandler(async (req, res) => {
  const brands = await Brand.find().sort({ name: 1 });
  res.json({ success: true, count: brands.length, data: brands });
});

// GET /api/brands/:id
exports.getOne = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new AppError('Không tìm thấy thương hiệu', 404);
  res.json({ success: true, data: brand });
});

// POST /api/brands (admin)
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.name) throw new AppError('Tên thương hiệu (name) là bắt buộc', 400);

  data.slug = slugify(data.slug || data.name);
  const brand = await Brand.create(data);
  res.status(201).json({ success: true, message: 'Đã tạo thương hiệu', data: brand });
});

// PUT|PATCH /api/brands/:id (admin)
exports.update = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (data.slug) data.slug = slugify(data.slug);

  const brand = await Brand.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!brand) throw new AppError('Không tìm thấy thương hiệu', 404);
  res.json({ success: true, message: 'Đã cập nhật thương hiệu', data: brand });
});

// DELETE /api/brands/:id (admin)
exports.remove = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new AppError('Không tìm thấy thương hiệu', 404);

  if (await Product.exists({ brand: brand._id })) {
    throw new AppError('Không thể xóa: vẫn còn sản phẩm thuộc thương hiệu này', 409);
  }

  await brand.deleteOne();
  res.json({ success: true, message: 'Đã xóa thương hiệu' });
});
