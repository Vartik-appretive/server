const AppError = require("./../utils/appError");

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    let value = err.message.match(/(["'])(\\?.)*?\1/);
    if (value) value = value[0];

    // const message = `Duplicate field value: ${value}. Please use another value!`;
    const message = `A account already exists with: ${value}!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    // const fields = Object.values(err.errors).map(el => el.path);

    const message = `Invalid input data. ${errors.join(". ")}`;
    return new AppError(message, 400);
};

const handleJWTError = () => new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () => new AppError("Your token has expired! Please log in again.", 401);

const sendErrorDev = (err, req, res) => {
    // A) API
    if (req.originalUrl.startsWith("/api")) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    }

    // B) RENDERED WEBSITE
    // console.error('ERROR 💥', err);
    return res.status(err.statusCode).json({
        status: "Something went wrong!",
        message: err.message,
    });
};

const sendErrorProd = (err, req, res) => {
    // A) API
    if (req.originalUrl.startsWith("/api")) {
        // console.log(err.message);
        // A) Operational, trusted error: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            });
        }
        // B) Programming or other unknown error: don't leak error details
        // 1) Log error
        // console.error('ERROR 💥', err);
        // 2) Send generic message
        return res.status(500).json({
            status: "error",
            message: err.message || "Something went very wrong!",
        });
    }

    // B) RENDERED WEBSITE
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: "Something went wrong!",
            message: err.message,
        });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    // console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(err.statusCode).json({
        status: "Something went wrong!",
        message: "Please try again later.",
    });
};

module.exports = (err, req, res, _) => {
    console.log(err);
    console.log(err.message);

    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    // Using .env file to set enviroment
    if (process.env.NODE_ENV === "development") {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === "production") {
        let error = { ...err };
        error.message = err.message;

        if (error.name === "CastError") error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === "ValidationError" || err.name === "ValidationError") error = handleValidationErrorDB(error);
        if (error.name === "JsonWebTokenError") error = handleJWTError();
        if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    } else {
        return res.status(err.statusCode).json({
            status: "fail",
            message: "enviroment is not set. Please set enviroment.",
        });
    }
};
