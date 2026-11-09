const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, required: true, unique: true },   // vd: DH20261008-0001
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Snapshot sản phẩm tại thời điểm mua (giá/tên có thể đổi sau này)
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: String,
    image: String,
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
  }],

  shippingAddress: {
    fullName: String, phone: String,
    province: String, district: String, ward: String, street: String
  },

  itemsTotal: { type: Number, required: true },
  shippingFee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true },

  paymentMethod: { type: String, enum: ['cod', 'bank_transfer', 'momo', 'vnpay'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paidAt: Date,

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
    default: 'pending'
  },
  note: String
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
