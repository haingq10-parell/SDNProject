require('dotenv').config();
const connectDB = require('./config/db');
const { User, Category, Brand, Product, Cart, Order, Review } = require('./models');

async function seed() {
  await connectDB();

  await Promise.all([User, Category, Brand, Product, Cart, Order, Review].map((m) => m.deleteMany({})));

  // Tài khoản mẫu (password được băm tự động bởi User model)
  await User.create([
    { name: 'Admin', email: 'admin@shop.local', password: 'admin123', role: 'admin' },
    { name: 'Nguyễn Văn A', email: 'customer@shop.local', password: 'customer123', phone: '0900000000' }
  ]);

  const [ic, res, mcu, sensor] = await Category.insertMany([
    { name: 'IC', slug: 'ic' },
    { name: 'Điện trở', slug: 'dien-tro' },
    { name: 'Vi điều khiển & Module', slug: 'vi-dieu-khien-module' },
    { name: 'Cảm biến', slug: 'cam-bien' }
  ]);

  const [ti, microchip, arduino, espressif] = await Brand.insertMany([
    { name: 'Texas Instruments', slug: 'texas-instruments', country: 'USA' },
    { name: 'Microchip', slug: 'microchip', country: 'USA' },
    { name: 'Arduino', slug: 'arduino', country: 'Italy' },
    { name: 'Espressif', slug: 'espressif', country: 'China' }
  ]);

  await Product.insertMany([
    {
      name: 'IC định thời NE555P DIP-8', slug: 'ne555p-dip-8', sku: 'IC-NE555P', partNumber: 'NE555P',
      description: 'IC định thời 555 đa dụng, dùng cho mạch dao động, tạo xung.',
      category: ic._id, brand: ti._id, price: 5000, stock: 500, unit: 'cái',
      priceTiers: [{ minQty: 50, price: 4000 }, { minQty: 200, price: 3200 }],
      specs: [{ key: 'Package', value: 'DIP-8' }, { key: 'Điện áp hoạt động', value: '4.5V - 16V' }],
      tags: ['555', 'timer', 'ic'], isFeatured: true
    },
    {
      name: 'IC ổn áp LM7805 TO-220', slug: 'lm7805-to-220', sku: 'IC-LM7805', partNumber: 'LM7805',
      description: 'IC ổn áp tuyến tính 5V, dòng ra tối đa 1.5A.',
      category: ic._id, brand: ti._id, price: 6000, stock: 400,
      priceTiers: [{ minQty: 20, price: 5000 }],
      specs: [{ key: 'Điện áp ra', value: '5V' }, { key: 'Dòng tối đa', value: '1.5A' }],
      tags: ['ổn áp', 'regulator', '7805']
    },
    {
      name: 'Vi điều khiển ATmega328P-PU', slug: 'atmega328p-pu', sku: 'MCU-ATM328PU', partNumber: 'ATmega328P-PU',
      category: mcu._id, brand: microchip._id, price: 65000, stock: 120,
      specs: [{ key: 'Package', value: 'DIP-28' }, { key: 'Flash', value: '32KB' }, { key: 'Tần số', value: '20MHz' }],
      tags: ['avr', 'arduino', 'mcu']
    },
    {
      name: 'Arduino Uno R3', slug: 'arduino-uno-r3', sku: 'BRD-UNOR3',
      category: mcu._id, brand: arduino._id, price: 185000, salePrice: 165000, stock: 60,
      specs: [{ key: 'Vi điều khiển', value: 'ATmega328P' }, { key: 'Điện áp', value: '5V' }],
      tags: ['arduino', 'board'], isFeatured: true
    },
    {
      name: 'Module ESP32 DevKit V1', slug: 'esp32-devkit-v1', sku: 'BRD-ESP32DK', partNumber: 'ESP32-WROOM-32',
      description: 'Board phát triển ESP32 tích hợp WiFi và Bluetooth.',
      category: mcu._id, brand: espressif._id, price: 120000, stock: 80,
      specs: [{ key: 'WiFi', value: '802.11 b/g/n' }, { key: 'Bluetooth', value: 'v4.2 BR/EDR + BLE' }],
      tags: ['esp32', 'wifi', 'iot'], isFeatured: true
    },
    {
      name: 'Điện trở 1/4W 10K ±5% (gói 100 cái)', slug: 'dien-tro-10k-1-4w-100pcs', sku: 'RES-10K-100',
      category: res._id, price: 8000, stock: 1000, unit: 'gói',
      specs: [{ key: 'Giá trị', value: '10KΩ' }, { key: 'Công suất', value: '1/4W' }, { key: 'Sai số', value: '±5%' }],
      tags: ['resistor', '10k']
    },
    {
      name: 'Cảm biến nhiệt độ độ ẩm DHT22', slug: 'dht22', sku: 'SNS-DHT22', partNumber: 'DHT22 / AM2302',
      category: sensor._id, price: 95000, stock: 80,
      specs: [{ key: 'Dải nhiệt độ', value: '-40 ~ 80°C' }, { key: 'Dải độ ẩm', value: '0 ~ 100% RH' }],
      tags: ['dht22', 'sensor', 'temperature']
    }
  ]);

  console.log('Seed hoàn tất!');
  console.log('  Admin:    admin@shop.local    / admin123');
  console.log('  Customer: customer@shop.local / customer123');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
