const crypto = require('crypto');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getUnitPrice } = require('../utils/pricing');
const { getPagination, pageMeta } = require('../utils/pagination');
const { asString } = require('../utils/helpers');

const SHIPPING_FEE = 30000;          // phí ship cố định (VND)
const FREE_SHIPPING_FROM = 500000;   // miễn phí ship từ mức này
const PAYMENT_METHODS = ['cod', 'bank_transfer', 'momo', 'vnpay'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
const ADDRESS_FIELDS = ['fullName', 'phone', 'province', 'district', 'ward', 'street'];

// Luồng trạng thái hợp lệ của đơn hàng
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: []
};

const generateOrderCode = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `DH${d}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

// Hoàn lại tồn kho (khi hủy đơn hoặc khi tạo đơn thất bại)
async function restoreStock(items) {
  await Promise.all(
    items.map((i) =>
      Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity, soldCount: -i.quantity } })
    )
  );
}

// POST /api/orders  { shippingAddress, paymentMethod, note }  - tạo đơn từ giỏ hàng
exports.create = asyncHandler(async (req, res) => {
  const { shippingAddress, note } = req.body;
  const paymentMethod = req.body.paymentMethod === undefined ? 'cod' : req.body.paymentMethod;

  if (!shippingAddress || typeof shippingAddress !== 'object') {
    throw new AppError('shippingAddress là bắt buộc', 400);
  }
  const missing = ADDRESS_FIELDS.filter((k) => typeof shippingAddress[k] !== 'string' || !shippingAddress[k].trim());
  if (missing.length) throw new AppError(`Thiếu thông tin giao hàng: ${missing.join(', ')}`, 400);
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new AppError(`paymentMethod phải là một trong: ${PAYMENT_METHODS.join(', ')}`, 400);
  }

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) throw new AppError('Giỏ hàng đang trống', 400);

  // 1) Dựng danh sách dòng hàng, giá lấy từ DB (không tin client)
  const lines = cart.items.map((item) => {
    const p = item.product;
    if (!p || !p.isActive) {
      throw new AppError('Có sản phẩm trong giỏ không còn được bán, vui lòng cập nhật giỏ hàng', 400);
    }
    if (item.quantity < (p.minOrderQty || 1)) {
      throw new AppError(`"${p.name}" yêu cầu đặt tối thiểu ${p.minOrderQty}`, 400);
    }
    return {
      product: p._id,
      name: p.name,
      sku: p.sku,
      image: (p.images && p.images[0]) || undefined,
      price: getUnitPrice(p, item.quantity),
      quantity: item.quantity
    };
  });

  // 2) Trừ kho bằng cập nhật nguyên tử có điều kiện (stock >= số lượng).
  //    Cách này chạy được trên MongoDB đơn lẻ, không cần replica set/transaction.
  const reserved = [];
  let order;
  try {
    for (const line of lines) {
      const result = await Product.updateOne(
        { _id: line.product, isActive: true, stock: { $gte: line.quantity } },
        { $inc: { stock: -line.quantity, soldCount: line.quantity } }
      );
      if (result.modifiedCount === 0) {
        throw new AppError(`Sản phẩm "${line.name}" không đủ tồn kho`, 409);
      }
      reserved.push(line);
    }

    const itemsTotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const shippingFee = itemsTotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;

    order = await Order.create({
      orderCode: generateOrderCode(),
      user: req.user._id,
      items: lines,
      shippingAddress: Object.fromEntries(ADDRESS_FIELDS.map((k) => [k, shippingAddress[k].trim()])),
      itemsTotal,
      shippingFee,
      discount: 0,
      totalPrice: itemsTotal + shippingFee,
      paymentMethod,
      note: asString(note)
    });
  } catch (err) {
    await restoreStock(reserved); // lỗi giữa chừng -> trả lại kho đã trừ
    throw err;
  }

  // 3) Làm trống giỏ hàng
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });

  res.status(201).json({ success: true, message: 'Đặt hàng thành công', data: order });
});

// GET /api/orders/my
exports.getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 10);
  const filter = { user: req.user._id };
  const status = asString(req.query.status);
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter)
  ]);
  res.json({ success: true, ...pageMeta(total, page, limit), count: orders.length, data: orders });
});

// GET /api/orders/:id  (chủ đơn hoặc admin)
exports.getOne = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  const isOwner = order && order.user && order.user._id.equals(req.user._id);
  if (!order || (!isOwner && req.user.role !== 'admin')) {
    throw new AppError('Không tìm thấy đơn hàng', 404);
  }
  res.json({ success: true, data: order });
});

// PATCH /api/orders/:id/cancel  (khách hủy đơn của mình khi còn pending)
exports.cancel = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: 'pending' },
    { status: 'cancelled' },
    { new: true }
  );

  if (!order) {
    const exists = await Order.exists({ _id: req.params.id, user: req.user._id });
    if (!exists) throw new AppError('Không tìm thấy đơn hàng', 404);
    throw new AppError('Chỉ có thể hủy đơn đang ở trạng thái pending', 400);
  }

  await restoreStock(order.items);
  res.json({ success: true, message: 'Đã hủy đơn hàng', data: order });
});

// GET /api/orders?status=&paymentStatus=&page=&limit=  (admin)
exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 20);
  const filter = {};
  const status = asString(req.query.status);
  const paymentStatus = asString(req.query.paymentStatus);
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter)
  ]);
  res.json({ success: true, ...pageMeta(total, page, limit), count: orders.length, data: orders });
});

// PATCH /api/orders/:id/status  { status }  (admin)
exports.updateStatus = asyncHandler(async (req, res) => {
  const next = asString(req.body.status);
  if (!next || !Object.hasOwn(TRANSITIONS, next)) {
    throw new AppError(`status phải là một trong: ${Object.keys(TRANSITIONS).join(', ')}`, 400);
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
  if (!TRANSITIONS[order.status].includes(next)) {
    throw new AppError(`Không thể chuyển trạng thái từ "${order.status}" sang "${next}"`, 400);
  }

  const update = { status: next };
  if (next === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
    update.paymentStatus = 'paid'; // COD: thu tiền khi giao xong
    update.paidAt = new Date();
  }
  if (next === 'cancelled' && order.paymentStatus === 'paid') update.paymentStatus = 'refunded';

  // điều kiện status cũ giúp tránh hoàn kho 2 lần nếu 2 admin bấm cùng lúc
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, update, { new: true });
  if (!updated) throw new AppError('Đơn hàng vừa được cập nhật bởi thao tác khác, vui lòng tải lại', 409);

  if (next === 'cancelled') await restoreStock(updated.items);
  res.json({ success: true, message: `Đã chuyển đơn sang "${next}"`, data: updated });
});

// PATCH /api/orders/:id/payment  { paymentStatus }  (admin)
exports.updatePayment = asyncHandler(async (req, res) => {
  const paymentStatus = asString(req.body.paymentStatus);
  if (!paymentStatus || !PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new AppError(`paymentStatus phải là một trong: ${PAYMENT_STATUSES.join(', ')}`, 400);
  }

  const update = { paymentStatus };
  if (paymentStatus === 'paid') update.paidAt = new Date();

  const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
  res.json({ success: true, message: 'Đã cập nhật thanh toán', data: order });
});
