const router = require('express').Router();
const brand = require('../controllers/brandController');
const { verifyToken, authorize } = require('../middleware/auth');

const admin = [verifyToken, authorize('admin')];

router.route('/')
  .get(brand.getAll)
  .post(admin, brand.create);

router.route('/:id')
  .get(brand.getOne)
  .put(admin, brand.update)
  .patch(admin, brand.update)
  .delete(admin, brand.remove);

module.exports = router;
