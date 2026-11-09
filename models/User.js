const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  province: { type: String, required: true },   // Tỉnh/Thành phố
  district: { type: String, required: true },   // Quận/Huyện
  ward: { type: String, required: true },       // Phường/Xã
  street: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  phone: { type: String, trim: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  addresses: [addressSchema],
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: {
    // không bao giờ trả password ra ngoài
    transform(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Tự động băm mật khẩu mỗi khi password được tạo/đổi
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
