// Mount tại /api/products/:productId/reviews nên cần mergeParams để đọc :productId
const router = require('express').Router({ mergeParams: true });
const review = require('../controllers/reviewController');
const { verifyToken } = require('../middleware/auth');

router.route('/')
  .get(review.getAll)
  .post(verifyToken, review.create);

router.route('/:id')
  .delete(verifyToken, review.remove);

module.exports = router;
