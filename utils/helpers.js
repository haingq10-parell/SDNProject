const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Chỉ nhận chuỗi - chặn kiểu tấn công NoSQL injection như ?category[$ne]=x hoặc {"email": {"$ne": null}}
const asString = (v) => (typeof v === 'string' ? v : undefined);

// Chỉ lấy các field được phép từ req.body (chống người dùng tự gửi role, soldCount...)
const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj && obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

module.exports = { escapeRegex, asString, pick };
