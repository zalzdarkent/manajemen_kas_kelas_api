const express = require('express');
const userRoute = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const isAdmin = require('../middlewares/admin');

userRoute.post('/user/login', userController.login);
userRoute.get('/user', authMiddleware, userController.getUser);
userRoute.put('/user/update', authMiddleware, upload('user'), userController.updateProfile);
userRoute.put('/user/update-role', authMiddleware, isAdmin, userController.updateRole);
userRoute.post('/user/logout', authMiddleware, userController.logout);
userRoute.post('/user/register', userController.register)
userRoute.get('/user/all', authMiddleware, userController.getAllUsers)

module.exports = userRoute;