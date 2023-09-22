const router = require('express').Router();

const { getBlogs, getBlogById, addBlog, updateBlog, deleteBlog } = require('../controllers/blog.controller');
const { AdminAuthCheck, UserAuthCheck, RestrictTo } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(getBlogs)
	.post(AdminAuthCheck, addBlog);

router
	.route('/astrologer')
	.post(UserAuthCheck, RestrictTo('astrologer'), addBlog);

router
	.route('/:id')
	.get(getBlogById)
	.patch(AdminAuthCheck, updateBlog)
	.delete(AdminAuthCheck, deleteBlog);

module.exports = router;