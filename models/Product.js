const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  sku: { type: String, required: true, unique: true, uppercase: true }, // mã hàng
  partNumber: { type: String, trim: true },  // mã linh kiện, vd: NE555P, ATmega328P-PU
  description: String,

  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },

  price: { type: Number, required: true, min: 0 },          // VND
  salePrice: { type: Number, min: 0 },
  // Giá theo số lượng (mua sỉ linh kiện): mua >= minQty thì giá là price
  priceTiers: [{
    minQty: { type: Number, required: true, min: 2 },
    price: { type: Number, required: true, min: 0 }
  }],

  stock: { type: Number, required: true, min: 0, default: 0 },
  minOrderQty: { type: Number, default: 1, min: 1 },
  unit: { type: String, default: 'cái' },                   // cái, cuộn, bộ...

  images: [String],
  datasheetUrl: String,                                     // link datasheet PDF

  // Thông số kỹ thuật linh hoạt: mỗi loại linh kiện có thông số khác nhau
  // vd: [{key:'Điện áp', value:'5V'}, {key:'Package', value:'DIP-8'}]
  specs: [{ key: String, value: String, _id: false }],

  tags: [String],
  ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false }
}, { timestamps: true });

// Index phục vụ tìm kiếm & lọc
productSchema.index({ name: 'text', partNumber: 'text', sku: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });

module.exports = mongoose.model('Product', productSchema);
