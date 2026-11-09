const router = require('express').Router();
const category = require('../controllers/categoryController');
const { verifyToken, authorize } = require('../middleware/auth');

const admin = [verifyToken, authorize('admin')];

router.route('/')
  .get(category.getAll)
  .post(admin, category.create);

router.route('/:id')
  .get(category.getOne)
  .put(admin, category.update)
  .patch(admin, category.update)
  .delete(admin, category.remove);

module.exports = router;
