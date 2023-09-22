const router = require("express").Router();
const { getPage, getPageByName, addPage, updatePage, deletePage, renderPage } = require("../controllers/pages.controllers");
const { AdminAuthCheck } = require("../middleware/auth.middleware");

router
	.route('/')
	.post(AdminAuthCheck, addPage);

router
    .route('/admin/:screen')
	.get(AdminAuthCheck, getPage);

//This route contains 
//1.) home screen slider
//2.) ads-screen-slider
//3.) menu-1
//4.) menu-2
//5.) horoscope
//6.) Privacy Policy/ Terms & Conditions etc...
router
	.route('/screen/:screen')
	.get(getPageByName);

router
	.route('/:id')
	.get(AdminAuthCheck, renderPage)
	.patch(AdminAuthCheck, updatePage)
	.delete(AdminAuthCheck, deletePage);

module.exports = router;