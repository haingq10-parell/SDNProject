const router = require('express').Router();
const order = require('../controllers/orderController');
const { verifyToken, authorize } = require('../middleware/auth');

router.use(verifyToken);

router.route('/')
  .post(order.create)
  .get(authorize('admin'), order.getAll);

router.get('/my', order.getMyOrders); // phải khai báo trước '/:id'
router.get('/summary', authorize('admin'), order.getSummary);

router.get('/:id', order.getOne);
router.patch('/:id/cancel', order.cancel);
router.patch('/:id/status', authorize('admin'), order.updateStatus);
router.patch('/:id/payment', authorize('admin'), order.updatePayment);

module.exports = router;
