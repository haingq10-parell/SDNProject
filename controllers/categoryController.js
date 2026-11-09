const Category = require('../models/Category');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const { asString, pick } = require('../utils/helpers');

const FIELDS = ['name', 'slug', 'description', 'parent', 'image', 'isActive'];

// GET /api/categories?parent=null|<id>
exports.getAll = asyncHandler(async (req, res) => {
  const filter = {};
  const parent = asString(req.query.parent);
  if (parent === 'null') filter.parent = null; // chỉ danh mục gốc
  else if (parent) filter.parent = parent;

  const categories = await Category.find(filter).populate('parent', 'name slug').sort({ name: 1 });
  res.json({ success: true, count: categories.length, data: categories });
});

// GET /api/categories/:id
exports.getOne = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate('parent', 'name slug');
  if (!category) throw new AppError('Không tìm thấy danh mục', 404);
  res.json({ success: true, data: category });
});

// POST /api/categories (admin)
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.name) throw new AppError('Tên danh mục (name) là bắt buộc', 400);

  data.slug = slugify(data.slug || data.name);
  if (data.parent && !(await Category.exists({ _id: data.parent }))) {
    throw new AppError('Danh mục cha không tồn tại', 400);
  }

  const category = await Category.create(data);
  res.status(201).json({ success: true, message: 'Đã tạo danh mục', data: category });
});

// PUT|PATCH /api/categories/:id (admin)
exports.update = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (data.slug) data.slug = slugify(data.slug);

  if (data.parent) {
    if (String(data.parent) === req.params.id) {
      throw new AppError('Danh mục không thể là cha của chính nó', 400);
    }
    if (!(await Category.exists({ _id: data.parent }))) {
      throw new AppError('Danh mục cha không tồn tại', 400);
    }
  }

  const category = await Category.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true
  });
  if (!category) throw new AppError('Không tìm thấy danh mục', 404);
  res.json({ success: true, message: 'Đã cập nhật danh mục', data: category });
});

// DELETE /api/categories/:id (admin)
exports.remove = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError('Không tìm thấy danh mục', 404);

  if (await Product.exists({ category: category._id })) {
    throw new AppError('Không thể xóa: vẫn còn sản phẩm thuộc danh mục này', 409);
  }
  if (await Category.exists({ parent: category._id })) {
    throw new AppError('Không thể xóa: danh mục này còn danh mục con', 409);
  }

  await category.deleteOne();
  res.json({ success: true, message: 'Đã xóa danh mục' });
});
