const router = require("express").Router();
const { logout, login, authCheck, changePassword, adminLogin, signup, isExistingUser, updateUser } = require("../controllers/auth.controller");
const { UserAuthCheck, AdminAuthCheck } = require("../middleware/auth.middleware");

router
	.route('/')
	.post(isExistingUser);

router
	.route('/login')
	.post(login);

router
	.route('/login-admin')
	.post(adminLogin);

router
	.route('/user')
	.get(UserAuthCheck, authCheck)
	.patch(UserAuthCheck, updateUser);

router
	.route('/administrator')
	.get(AdminAuthCheck, authCheck)
	.patch(AdminAuthCheck, updateUser);

// router
// 	.route('/change-password')
// 	.post(UserAuthCheck, changePassword);

module.exports = router;