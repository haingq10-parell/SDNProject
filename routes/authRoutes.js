const router = require('express').Router();
const auth = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.route('/me').get(verifyToken, auth.getMe).put(verifyToken, auth.updateMe);
router.put('/password', verifyToken, auth.changePassword);

module.exports = router;
