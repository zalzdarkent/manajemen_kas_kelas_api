const userController = {};
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const ResponseAPI = require('../utils/response');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../helper');

userController.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email: email });
        console.log(user);
        if (!user) {
            return ResponseAPI.notFound(res, 'Email tidak ditemukan');
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h' 
        });

        await user.updateOne({ resetPasswordLink: token });

        const templateEmail = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Link Reset Password',
            html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Password</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        background: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .header {
                        background: #4CAF50;
                        color: #ffffff;
                        text-align: center;
                        padding: 20px;
                    }
                    .content {
                        padding: 20px;
                        text-align: left;
                        color: #333333;
                    }
                    .button {
                        display: inline-block;
                        margin: 20px 0;
                        padding: 10px 20px;
                        color: #ffffff;
                        background: #4CAF50;
                        text-decoration: none;
                        border-radius: 5px;
                    }
                    .footer {
                        text-align: center;
                        padding: 10px;
                        font-size: 12px;
                        color: #888888;
                        background: #f4f4f4;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Reset Password</h1>
                    </div>
                    <div class="content">
                        <p>Halo,</p>
                        <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Klik tombol di bawah ini untuk mengatur ulang kata sandi Anda:</p>
                        <p style="text-align: center;">
                            <a href="${process.env.CLIENT_URL}/reset-password/${token}" class="button">Reset Password</a>
                        </p>
                        <p>Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini. Link akan kedaluwarsa setelah 1 jam.</p>
                        <p>Terima kasih,</p>
                        <p>Tim Dukungan</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} YourCompany. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            `
        };
        sendEmail(templateEmail);
        ResponseAPI.success(res, {
            email: req.body.email,
            token: token
        }, 'Link reset password telah dikirim ke email anda');
    } catch (error) {
        ResponseAPI.serverError(res, error);
    }
};

userController.resetPassword = async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.id, resetPasswordLink: token });

        if (!user) {
            return ResponseAPI.unauthorized(res, 'Token tidak valid atau pengguna tidak ditemukan');
        }

        // if (!newPassword || newPassword.length < 6) {
        //     return ResponseAPI.error(res, 'Password baru harus memiliki setidaknya 6 karakter');
        // }

        if (newPassword !== confirmPassword) {
            return ResponseAPI.error(res, 'Password baru dan konfirmasi password tidak cocok');
        }

        user.password = newPassword;
        user.resetPasswordLink = null;
        await user.save();

        ResponseAPI.success(res, null, 'Password berhasil diperbarui');
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return ResponseAPI.unauthorized(res, 'Token tidak valid atau telah kedaluwarsa');
        }
        ResponseAPI.serverError(res, error);
    }
};

userController.register = async (req, res) => {
    const { username, email, phoneNumber, password, role } = req.body;

    if (!username || !email || !password || !phoneNumber) {
        return ResponseAPI.error(res, 'Username, email, nomor telepon, dan password harus diisi');
    }

    try {
        const existingUser = await User.findOne({ email });
        const existingPhone = await User.findOne({ phoneNumber });
        if (existingUser) {
            return ResponseAPI.error(res, 'Email sudah terdaftar');
        }

        if (existingPhone) {
            return ResponseAPI.error(res, 'Nomor telepon sudah terdaftar');
        }

        const user = new User({
            username,
            email,
            phoneNumber,
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
                phone: user.phoneNumber,
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
                phone: user.phoneNumber,
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
