const router = require('express').Router();
const product = require('../controllers/productController');
const { verifyToken, authorize } = require('../middleware/auth');

const admin = [verifyToken, authorize('admin')];

router.use('/:productId/reviews', require('./reviewRoutes'));

router.route('/')
  .get(product.getAll)
  .post(admin, product.create);

router.get('/slug/:slug', product.getBySlug);

router.route('/:id')
  .get(product.getOne)
  .put(admin, product.update)
  .patch(admin, product.update)
  .delete(admin, product.remove);

module.exports = router;
