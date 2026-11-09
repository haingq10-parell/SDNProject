const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getUnitPrice } = require('../utils/pricing');
const { asString } = require('../utils/helpers');

async function getOrCreateCart(userId) {
  return Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { items: [] } },
    { upsert: true, new: true }
  );
}

// Dựng dữ liệu giỏ hàng trả về cho client: giá tính ở server
async function buildCartView(userId) {
  const cart = await Cart.findOne({ user: userId }).populate('items.product').lean();

  const items = [];
  let total = 0;
  for (const item of cart ? cart.items : []) {
    const p = item.product;
    if (!p || !p.isActive) continue; // sản phẩm đã bị xóa/ẩn thì bỏ qua
    const unitPrice = getUnitPrice(p, item.quantity);
    const lineTotal = unitPrice * item.quantity;
    total += lineTotal;
    items.push({
      product: {
        _id: p._id, name: p.name, slug: p.slug, sku: p.sku,
        image: (p.images && p.images[0]) || null,
        stock: p.stock, minOrderQty: p.minOrderQty
      },
      quantity: item.quantity,
      unitPrice,
      lineTotal
    });
  }

  return { items, totalItems: items.reduce((s, i) => s + i.quantity, 0), total };
}

function parseQuantity(value) {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1) throw new AppError('quantity phải là số nguyên >= 1', 400);
  return qty;
}

function assertQuantity(product, qty) {
  if (qty < (product.minOrderQty || 1)) {
    throw new AppError(`Số lượng đặt tối thiểu của sản phẩm này là ${product.minOrderQty}`, 400);
  }
  if (qty > product.stock) {
    throw new AppError(`Chỉ còn ${product.stock} sản phẩm trong kho`, 400);
  }
}

// GET /api/cart
exports.getCart = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await buildCartView(req.user._id) });
});

// POST /api/cart/items  { productId, quantity }
exports.addItem = asyncHandler(async (req, res) => {
  const productId = asString(req.body.productId);
  if (!productId) throw new AppError('productId là bắt buộc', 400);
  const qty = parseQuantity(req.body.quantity === undefined ? 1 : req.body.quantity);

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new AppError('Sản phẩm không tồn tại', 404);

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find((i) => i.product.equals(product._id));
  const newQty = (existing ? existing.quantity : 0) + qty;
  assertQuantity(product, newQty);

  if (existing) existing.quantity = newQty;
  else cart.items.push({ product: product._id, quantity: newQty });
  await cart.save();

  res.status(201).json({
    success: true,
    message: 'Đã thêm vào giỏ hàng',
    data: await buildCartView(req.user._id)
  });
});

// PUT /api/cart/items/:productId  { quantity }
exports.updateItem = asyncHandler(async (req, res) => {
  const qty = parseQuantity(req.body.quantity);

  const product = await Product.findOne({ _id: req.params.productId, isActive: true });
  if (!product) throw new AppError('Sản phẩm không tồn tại', 404);
  assertQuantity(product, qty);

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.find((i) => i.product.equals(product._id));
  if (!item) throw new AppError('Sản phẩm này chưa có trong giỏ hàng', 404);

  item.quantity = qty;
  await cart.save();
  res.json({ success: true, message: 'Đã cập nhật giỏ hàng', data: await buildCartView(req.user._id) });
});

// DELETE /api/cart/items/:productId
exports.removeItem = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $pull: { items: { product: req.params.productId } } });
  res.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ', data: await buildCartView(req.user._id) });
});

// DELETE /api/cart
exports.clearCart = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  res.json({ success: true, message: 'Đã làm trống giỏ hàng' });
});
