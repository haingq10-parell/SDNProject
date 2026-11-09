// Lỗi nghiệp vụ có kèm mã HTTP, được errorHandler chuyển thành JSON
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
