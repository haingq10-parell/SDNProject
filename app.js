const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());          // cho phép gọi API từ domain khác (Slot 13)
app.use(express.json());  // đọc body JSON

app.get('/', (req, res) => {
  res.json({ success: true, message: 'ElectroShop API đang chạy', apiBase: '/api' });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
