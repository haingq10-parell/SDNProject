const router = require('express').Router();
const cart = require('../controllers/cartController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.route('/')
  .get(cart.getCart)
  .delete(cart.clearCart);

router.post('/items', cart.addItem);

router.route('/items/:productId')
  .put(cart.updateItem)
  .delete(cart.removeItem);

module.exports = router;
