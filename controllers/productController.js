const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Cart = require('../models/Cart');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const { getPagination, pageMeta } = require('../utils/pagination');
const { escapeRegex, asString, pick } = require('../utils/helpers');

// Các field admin được phép ghi (soldCount, ratingAvg... do hệ thống tự tính)
const FIELDS = [
  'name', 'slug', 'sku', 'partNumber', 'description', 'category', 'brand',
  'price', 'salePrice', 'priceTiers', 'stock', 'minOrderQty', 'unit',
  'images', 'datasheetUrl', 'specs', 'tags', 'isActive', 'isFeatured'
];

const POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'brand', select: 'name slug' }
];

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  popular: { soldCount: -1 },
  rating: { ratingAvg: -1 }
};

async function assertRefs(data) {
  if (data.category && !(await Category.exists({ _id: data.category }))) {
    throw new AppError('Danh mục (category) không tồn tại', 400);
  }
  if (data.brand && !(await Brand.exists({ _id: data.brand }))) {
    throw new AppError('Thương hiệu (brand) không tồn tại', 400);
  }
}

// GET /api/products?q=&category=<slug>&brand=<slug>&minPrice=&maxPrice=&inStock=true&sort=&page=&limit=
exports.getAll = asyncHandler(async (req, res) => {
  const q = asString(req.query.q);
  const categorySlug = asString(req.query.category);
  const brandSlug = asString(req.query.brand);
  const sortKey = asString(req.query.sort);
  const sort = sortKey && Object.hasOwn(SORTS, sortKey) ? SORTS[sortKey] : SORTS.newest;

  const filter = { isActive: true };

  if (q && q.trim()) {
    const re = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ name: re }, { partNumber: re }, { sku: re }, { tags: re }];
  }

  if (categorySlug) {
    const cat = await Category.findOne({ slug: categorySlug });
    if (cat) {
      // gồm cả sản phẩm của danh mục con
      const children = await Category.find({ parent: cat._id }).select('_id');
      filter.category = { $in: [cat._id, ...children.map((c) => c._id)] };
    } else {
      filter.category = { $in: [] }; // slug không tồn tại -> không có kết quả
    }
  }

  if (brandSlug) {
    const brand = await Brand.findOne({ slug: brandSlug });
    filter.brand = brand ? brand._id : { $in: [] };
  }

  const min = parseFloat(asString(req.query.minPrice));
  const max = parseFloat(asString(req.query.maxPrice));
  const priceFilter = {};
  if (!Number.isNaN(min)) priceFilter.$gte = min;
  if (!Number.isNaN(max)) priceFilter.$lte = max;
  if (Object.keys(priceFilter).length) filter.price = priceFilter;

  if (req.query.inStock === 'true') filter.stock = { $gt: 0 };

  const { page, limit, skip } = getPagination(req.query);
  const [products, total] = await Promise.all([
    Product.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter)
  ]);

  res.json({ success: true, ...pageMeta(total, page, limit), count: products.length, data: products });
});

// GET /api/products/:id
exports.getOne = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate(POPULATE);
  if (!product) throw new AppError('Không tìm thấy sản phẩm', 404);
  res.json({ success: true, data: product });
});

// GET /api/products/slug/:slug
exports.getBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug.toLowerCase(), isActive: true }).populate(POPULATE);
  if (!product) throw new AppError('Không tìm thấy sản phẩm', 404);
  res.json({ success: true, data: product });
});

// POST /api/products (admin)
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.name || !data.sku || data.price === undefined || !data.category) {
    throw new AppError('Thiếu trường bắt buộc: name, sku, price, category', 400);
  }

  data.slug = slugify(data.slug || data.name);
  await assertRefs(data);

  const product = await Product.create(data);
  await product.populate(POPULATE);
  res.status(201).json({ success: true, message: 'Đã tạo sản phẩm', data: product });
});

// PUT|PATCH /api/products/:id (admin)
exports.update = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (data.slug) data.slug = slugify(data.slug);
  await assertRefs(data);

  const product = await Product.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true
  }).populate(POPULATE);
  if (!product) throw new AppError('Không tìm thấy sản phẩm', 404);

  res.json({ success: true, message: 'Đã cập nhật sản phẩm', data: product });
});

// DELETE /api/products/:id (admin)
exports.remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Không tìm thấy sản phẩm', 404);

  // dọn dữ liệu liên quan (đơn hàng cũ vẫn giữ nguyên nhờ snapshot)
  await Promise.all([
    Cart.updateMany({}, { $pull: { items: { product: product._id } } }),
    Review.deleteMany({ product: product._id })
  ]);

  res.json({ success: true, message: 'Đã xóa sản phẩm' });
});
