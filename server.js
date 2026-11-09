require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');

if (!process.env.JWT_SECRET) {
  console.error('Thiếu JWT_SECRET. Hãy tạo file .env từ .env.example');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Không thể kết nối MongoDB:', err.message);
    process.exit(1);
  });
