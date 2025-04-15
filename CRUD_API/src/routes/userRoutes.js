const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

// 1. POST Register User
router.post('/register', userController.registerUser);

// 2. POST Login
router.post('/login', userController.loginUser);

// 3. POST Logout
router.post('/logout', auth, userController.logoutUser);

// 4. GET Get Logged In User via Token
router.get('/me', auth, userController.getUserProfile);

// 5. PUT Update User Profile
router.put('/me', auth, userController.updateUserProfile);

// 6. POST Upload Image
router.post('/me/avatar', auth, userController.uploadAvatar);

// 7. GET Get User Image
router.get('/:id/avatar', userController.getUserAvatar);

// 8. DELETE Delete Image
router.delete('/me/avatar', auth, userController.deleteAvatar);

// 9. DELETE Delete User
router.delete('/me', auth, userController.deleteUser);

module.exports = router;
