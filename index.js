require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const socketIO = require("socket.io");
const morgan = require("morgan");

// Global Variables
global.liveAstrologers = [];
global.onlineAstrologers = {};
global.astrologersQue = {};
global.onlineUsers = new Map();
global.inQueUsers = new Map();
global.userActiveQue = new Map();
global.scheduleDelete = {};
global.connectedUserAndAstrologersTimer = {};
global.printLog = false;

// Error handler
const GlobalErrorHandler = require("./controllers/error.controller");

const AppError = require("./utils/appError");
const { ServerAuthorization } = require("./middleware/auth.middleware");
const socketConstructor = require("./utils/socketIo");
const Helper = require("./utils/helper");

// All Routes
const authRoutes = require("./routes/auth.routes");
const pagesRoutes = require("./routes/pages.routes");
const galleryRoutes = require("./routes/gallery.routes");
const userRoutes = require("./routes/user.routes");
const poojaRoutes = require("./routes/pooja.routes");
const blogRoutes = require("./routes/blog.routes");
const filterRoutes = require("./routes/filter.routes");
const videoSDKRoutes = require("./routes/meetings.routes");
const transactionsRoutes = require("./routes/transactions.routes");
const followRoutes = require("./routes/follow.routes");
const likeRoutes = require("./routes/like.routes");
const blockRoutes = require("./routes/block.routes");
const astroAdminCommunicationRoutes = require("./routes/astroAdminCommunication.routes");
const astroQuery = require("./routes/astroQuery.routes");
const notification = require("./routes/notification.routes");
const paymentOffers = require("./routes/paymentOffers.routes");
const twilioRoutes = require("./routes/twilio.routes");
const astrologerOfferRoutes = require("./routes/astrologerOffers.routes");
const poojaSlotsRoutes = require("./routes/poojaSlots.routes");
const userAvailabilityRoutes = require("./routes/userAvailability.routes");
const reviewRoutes = require("./routes/review.routes");
const favouriteRoutes = require("./routes/favourite.routes");
const giftRoutes = require("./routes/gift.routes");
const contactRoutes = require("./routes/contact.routes");
const faqRoutes = require("./routes/faq.routes");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/astrotime";
const PORT1 = process.env.PORT1 || 5001;
// const PORT2 = process.env.PORT2 || 5002;

mongoose
    .connect(MONGO_URI, { useNewUrlParser: true })
    .then((db) => {
        console.log("connected to the database");
        // db.connection.collection('filters').rename('filtersv1');
    })
    .catch((err) => console.log(err.message));

const app = express();

// const options = {
// 	// key: fs.readFileSync(path.join(__dirname, 'private.key')),
// 	// cert: fs.readFileSync(path.join(__dirname, 'cert.crt')),
// 	// ca: fs.readFileSync(path.join(__dirname, 'ca.crt')),
// 	requestCert: false,
// 	rejectUnauthorized: false
// }

const server1 = http.createServer(app);
// const server2 = https.createServer(options, app);

const io = socketIO(server1, { pingInterval: 5000, pingTimeout: 4000, cors: { origin: process.env.ORIGIN || ["http://localhost:3000", "http://localhost:3001", "http://192.168.0.105:3000"], credentials: true } });
Helper.setSocketIo(io);

app.set("view engine", "ejs");
app.use(cors({ credentials: true, origin: process.env.ORIGIN || ["http://localhost:3000", "http://localhost:3001", "http://192.168.0.105:3001", "http://192.168.0.105:3000"] }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

if (printLog) {
    app.use(morgan("dev"));
}

// app.use(express.static('public'));
app.use("/public", express.static("public"));

app.use("/api/v1/deeplink", (req, res, next) => {
    const query = req.query;
    let str = [];
    for (const key in query) {
        if (key !== "package") {
            str.push(`${key}=${query[key]}`);
        }
    }
    str = encodeURIComponent(str.join("&"));
    res.render("open_app", { query: str, package: query?.package || "" });
});

app.use(ServerAuthorization);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/page", pagesRoutes);
app.use("/api/v1/gallery", galleryRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/pooja", poojaRoutes);
app.use("/api/v1/pooja-slots", poojaSlotsRoutes);
app.use("/api/v1/blog", blogRoutes);
app.use("/api/v1/filter", filterRoutes);
app.use("/api/v1/videosdk", videoSDKRoutes);
app.use("/api/v1/transaction", transactionsRoutes);
app.use("/api/v1/follow", followRoutes);
app.use("/api/v1/like", likeRoutes);
app.use("/api/v1/block", blockRoutes);
app.use("/api/v1/notification", notification);
app.use("/api/v1/twilio", twilioRoutes);
app.use("/api/v1/astro-query", astroQuery);
app.use("/api/v1/payment-offers", paymentOffers);
app.use("/api/v1/astrologer-offers", astrologerOfferRoutes);
app.use("/api/v1/astro-admin-communication", astroAdminCommunicationRoutes);
app.use("/api/v1/user-availability", userAvailabilityRoutes);
app.use("/api/v1/review", reviewRoutes);
app.use("/api/v1/favourite", favouriteRoutes);
app.use("/api/v1/gift", giftRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/faq", faqRoutes);

app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404));
});

socketConstructor(io);

app.use(GlobalErrorHandler);

server1.listen(PORT1, () => {
    console.log(`server started on port: ${PORT1}`);
});

// server2.listen(PORT2, () => {
// 	console.log(`server started on port: ${PORT2}`);
// });

process.on("uncaughtException", (err) => {
    console.log(new Date());
    console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
    console.error(err);
    // console.error(err.name, err.message);
    //process.exit(1);
});

process.on("unhandledRejection", (err) => {
    console.log(new Date());
    console.error("UNHANDLED REJECTION! 💥 Shutting down...");
    console.error(err);
    // console.error(err.name, err.message);
    //server1.close(() => {
    //  process.exit(1);
    //});
});

process.on("SIGTERM", () => {
    console.log(new Date());
    console.error("👋 SIGTERM RECEIVED. Shutting down gracefully");
    //server1.close(() => {
    //  console.log('💥 Process terminated!');
    //});
});
