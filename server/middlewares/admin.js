const ResponseAPI = require('../utils/response');
const isAdmin = (req, res, next) => {
    // console.log('User Role:', req.user?.role);
    if (req.user.role !== 'admin') {
        return ResponseAPI.forbidden(res, 'Access denied. Admins only.');
    }
    next();
};

module.exports = isAdmin;
