const userController = {};
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const ResponseAPI = require('../utils/response');
const bcrypt = require('bcryptjs');
userController.register = async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
        return ResponseAPI.error(res, 'Username, email, dan password harus diisi');
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return ResponseAPI.error(res, 'Email sudah terdaftar');
        }

        const user = new User({
            username,
            email,
            password,
            role: role || 'pelajar',
        });

        await user.save();

        const token = user.generateAuthToken();

        ResponseAPI.success(res, {
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                photo: user.photo,
                role: user.role,
            }
        }, 'Pendaftaran berhasil');
    } catch (error) {
        console.error(error);
        ResponseAPI.serverError(res, error);
    }
};
userController.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return ResponseAPI.error(res, 'Email dan password harus diisi');
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return ResponseAPI.unauthorized(res, 'User tidak ditemukan');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return ResponseAPI.unauthorized(res, 'Password salah');
        }

        const token = user.generateAuthToken();

        ResponseAPI.success(res, {
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                photo: user.photo,
                role: user.role
            }
        });
    } catch (error) {
        ResponseAPI.serverError(res, error);
    }
};
userController.updateProfile = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const userId = req.user.id;

        const updateData = {};

        if (username) updateData.username = username;

        if (email) updateData.email = email;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 12);
            updateData.password = hashedPassword;
        }

        if (email) {
            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser._id !== userId) {
                return ResponseAPI.error(res, 'Email sudah digunakan oleh user lain');
            }
            updateData.email = email;
        }        

        if (req.file) {
            const user = await User.findById(userId);

            if (user.photo) {
                const oldPhotoPath = path.join(user.photo.replace(/\\/g, '/'));
                console.log('Old photo path:', oldPhotoPath);

                if (fs.existsSync(oldPhotoPath)) {
                    fs.unlinkSync(oldPhotoPath);
                    console.log('Old photo deleted');
                } else {
                    console.log('Old photo does not exist');
                }
            }

            updateData.photo = req.file.path.replace(/\\/g, '/');
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return ResponseAPI.error(res, 'User tidak ditemukan', 404);
        }

        ResponseAPI.success(res, user, 'Profil berhasil diperbarui');
    } catch (error) {
        ResponseAPI.serverError(res, error);
    }
};

userController.updateRole = async (req, res) => {
    try {
        const { userId, newRole } = req.body;

        if (!userId || !newRole) {
            return ResponseAPI.error(res, 'User ID and new role must be provided.');
        }

        if (!['admin', 'pelajar'].includes(newRole)) {
            return ResponseAPI.error(res, 'Invalid role provided.');
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return ResponseAPI.notFound(res, 'User not found.');
        }

        user.role = newRole;
        await user.save();

        return ResponseAPI.success(res, user, 'Role updated successfully.');
    } catch (error) {
        return ResponseAPI.serverError(res, error);
    }
};

userController.getUser = async (req, res) => {
    try {
        const userId = req.user.id; 
        
        const user = await User.findById(userId).select('-password'); 

        if (!user) {
            return ResponseAPI.error(res, 'User tidak ditemukan', 404);
        }

        ResponseAPI.success(res, user, 'Profil pengguna berhasil diambil');
    } catch (error) {
        console.error(error);
        ResponseAPI.serverError(res, error);
    }
};

userController.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); 

        if (!users || users.length === 0) {
            return ResponseAPI.error(res, 'Tidak ada pengguna ditemukan', 404);
        }

        ResponseAPI.success(res, users, 'Daftar pengguna berhasil diambil');
    } catch (error) {
        console.error(error);
        ResponseAPI.serverError(res, error);
    }
};

userController.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return ResponseAPI.error(res, 'User ID harus disediakan.');
        }

        const user = await User.findByIdAndDelete(userId); 

        if (!user) {
            return ResponseAPI.error(res, 'User tidak ditemukan', 404);
        }

        if (user.photo) {
            const oldPhotoPath = path.join(user.photo.replace(/\\/g, '/'));
            console.log('Old photo path:', oldPhotoPath);

            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
                console.log('Old photo deleted');
            } else {
                console.log('Old photo does not exist');
            }
        }

        ResponseAPI.success(res, null, 'User berhasil dihapus');
    } catch (error) {
        console.error(error);
        ResponseAPI.serverError(res, error);
    }
};

userController.logout = async (req, res) => {
    try {
        ResponseAPI.success(res, null, 'Logout berhasil');
    } catch (error) {
        ResponseAPI.serverError(res, error);
    }
};

module.exports = userController;
