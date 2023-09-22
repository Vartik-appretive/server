const jwt = require("jsonwebtoken");

const Admin = require("../models/admin.model");
// const bcrypt = require("bcrypt");
const User = require("../models/users.model");
const AppError = require("../utils/appError");
const ActiveLoginToken = require("../models/activeLoginTokens.model");
const { decrypt, encrypt } = require("../utils/crypto");

const BYPASS_SECRET = process.env.BYPASS_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

const skipServerAuthrozationUrls = [
	'/api/v1/videosdk/webhooks-rooms-calls',
	'/api/v1/videosdk/click-to-call',
	'/api/v1/videosdk/webhooks-rooms-streaming',
	'/api/v1/videosdk/generate-sos-click-to-call',
];

exports.ServerAuthorization = async (req, res, next) => {
	// if(req.originalUrl === '/') {
	// console.log(req.originalUrl);
	// }
	let skip = false;

	skipServerAuthrozationUrls.forEach(url => {
		if (req.originalUrl.includes(url)) {
			skip = true;
		}
	});

	if (skip) return next();

	// console.log(req.headers["client-x-requested-with"] || "asas");
	const clientXHeader = req.headers["client-x-requested-with"];
	if (clientXHeader !== process.env.CLIENT_X_HEADER) return next(new AppError("Not authorized client", 401));

	next();
};

exports.UserAuthCheck = async (req, res, next) => {
	let token = req.headers.authorization || req.cookies.cwtct;
	// let token = req.headers.authorization;

	try {
		if (!token && req.bypassAuth) token = req.bypassAuth;
		if (!token) throw new Error("Not Authorised!");

		token = decrypt(token);

		const verify = jwt.verify(token, process.env.JWT_SECRET);
		const id = verify.id;

		if (!id) throw new Error("Not Authorised!");

		if (id === BYPASS_SECRET) return next();

		const user = await User.findOne({ _id: id, 'deleted.trash': false }).populate([{ path: 'expertise', select: 'icon name' }, { path: 'languages', select: 'icon name' }, { path: 'skillset', select: 'icon name' }]).select('+rating.counts +plateformCharges');
		if (!user) throw new Error('Invalid credentials.');

		const activeToken = await ActiveLoginToken.findOne({ user: user._id.toString() });
		if (!activeToken) throw new Error('Login Session expired. Please try again.');
		if (activeToken.token !== token) throw new Error('Login Session expired. Please try again.');

		req.user = user;
		next();
	} catch (err) {
		let message;
		let tokenExpire = false;
		let tokenError = false;
		if (err.name == "TokenExpiredError") {
			message = "Login Session Expired. Please Login Again.";
			tokenExpire = true;
		}
		if (err.name == "JsonWebTokenError") {
			message = "Login Session Expired. Please Login Again.";
			tokenError = true;
		}

		res.json({
			status: 'fail',
			error: true,
			tokenExpire,
			tokenError,
			message: message || err.message
		});
	}
}

exports.AdminAuthCheck = async (req, res, next) => {
	let token = req.headers.authorization || req.cookies?.cwtct;
	// const token = req.cookies.authorization || req.cookies.token;

	try {
		if (!token) throw new Error("Not Authorised!");

		token = decrypt(token);

		const verify = jwt.verify(token, process.env.JWT_SECRET);
		const { email, password } = verify.id;

		if (!email) throw new Error("Not Authorised!");
		if (!password) throw new Error("Not Authorised!");

		const admin = await Admin.findOne({ email }).select('+password');
		if (!admin) throw new Error('Invalid credentials.');

		if (admin.role !== 'administrator') throw new Error('Not Authorised!');

		// console.log(password, admin.password)
		if (password !== admin.password) throw new Error("Invalid credentials. Please check Email and Password");
		// const valid = await bcrypt.compare(password, admin?.password);
		// if(!valid) throw new Error("Invalid credentials. Please check Email and Password");

		req.user = admin;
		next();
	} catch (err) {
		let message;
		let tokenExpire = false;
		let tokenError = false;
		if (err.name == "TokenExpiredError") {
			message = "Login Session Expired. Please Login Again.";
			tokenExpire = true;
		}
		if (err.name == "JsonWebTokenError") {
			message = "Invalid token. Please Login Again.";
			tokenError = true;
		}

		res.json({
			status: 'fail',
			error: true,
			tokenExpire,
			tokenError,
			message: message || err.message
		});
	}
}

exports.RestrictTo = (...roles) => {
	return (req, res, next) => {
		// roles ['admin', 'lead-guide']. role='user'
		// console.log(req.user);
		if (!roles.includes(req.user.role)) {
			return next(
				new AppError('You do not have permission to perform this action', 403)
			);
		}

		next();
	};
}

exports.DynamicMiddleware = (data) => {
	return (req, res, next) => {
		if (!data.pass) {
			return next(new AppError(data.message, data.status));
		}

		req[data.key] = data.value || encrypt(jwt.sign({ id: BYPASS_SECRET }, JWT_SECRET, { expiresIn: "5m" }));
		next();
	}
}