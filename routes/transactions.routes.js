const router = require("express").Router();
const { withdrawTransaction, depositeTransactions, generatePaytmTransactionToken, getTrasactionHistory, getTrasactionHistoryByUserId, generateReport, depositMoneyToUserAccount } = require("../controllers/transactions.controller");
const { UserAuthCheck, AdminAuthCheck, RestrictTo } = require("../middleware/auth.middleware");

router
	.route('/add-money')
	.post(UserAuthCheck, RestrictTo('user'), depositeTransactions);

router
	.route('/withdraw-money')
	.post(UserAuthCheck, RestrictTo('user'), withdrawTransaction);

router
	.route('/generate-checksum')
	.post(UserAuthCheck, RestrictTo('user'), generatePaytmTransactionToken);

router
	.route('/history')
	.get(UserAuthCheck, getTrasactionHistory);

router
	.route('/report')
	.get(UserAuthCheck, generateReport);

router
	.route('/deposit-money-to-user-account')
	.post(AdminAuthCheck, depositMoneyToUserAccount);

router
	.route('/:id')
	.get(AdminAuthCheck, getTrasactionHistoryByUserId);

module.exports = router;