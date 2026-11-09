const router = require('express').Router();
const user = require('../controllers/userController');
const { verifyToken, authorize } = require('../middleware/auth');

router.use(verifyToken, authorize('admin'));

router.route('/').get(user.getAll);
router.route('/:id').get(user.getOne).patch(user.update);

module.exports = router;
