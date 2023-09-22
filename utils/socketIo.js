// const { v4 } = require('uuid');
// const uuidv4 = v4;

const { decrypt } = require("./crypto");
const User = require("../models/users.model");
const jwt = require("jsonwebtoken");
const AppError = require("./appError");
const VideoSDKLiveStream = require("../models/liveStreaming.model");
const Follow = require("../models/follow.model");
const validateID = require("./validateId");
const constants = require("../config/constants");
// const Wallet = require('../models/wallet.model');
const VideoSDKMeeting = require("../models/meeting.model");
const Helper = require("./helper");
const Wallet = require("../models/wallet.model");
const formatDate = require("./formatDate");
const appConfig = require("../config/appConfig");
const sendNotification = require("./sendNotification");
const uniqueId = require("./uniqueId");

const types = [constants.app_voice_call.key, constants.app_video_call.key, constants.mobile_call.key, constants.app_messaging.key, constants.app_live_stream.key];

//This token is for non-logged in users
const TEMP_SOCKET_CONNECT_TOKEN = process.env.SOCKET_FAKE_TOKEN_FOR_LIVE_STREAM;

const socketConstructor = (io) => {
    io.use(async (socket, next) => {
        let token = socket?.handshake?.auth?.token;
        if (!token) return next(new AppError("Unauthenticated connection", 400));

        let verify;
        try {
            if (token === TEMP_SOCKET_CONNECT_TOKEN) {
                if (printLog) console.log("Temp User Connected");
                authUser = {
                    _id: `temp_${Date.now()}`,
                    name: "",
                    profilePhoto: "",
                    role: "user",
                };
                return next();
            }

            token = decrypt(token);

            if (!token) return next(new AppError("Unauthenticated connection", 400));

            verify = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (printLog) console.error(err);
            return next(new AppError(err.message, 400));
        }

        const id = verify.id;
        if (!validateID(id)) return next(new AppError("Invalid credentials.", 400));

        const user = await User.findOne({ _id: id, "deleted.trash": false }, "name profilePhoto role availableFor charges passed");
        // const user = await User.findOne({ _id: id, 'deleted.trash': false }, 'name profilePhoto availableFor role');
        if (!user) return next(new AppError("Invalid credentials.", 400));
        if (user.role !== "user" && user.passed !== 1) return next(new AppError("You are not verrified.", 403));

        authUser = { ...user.toJSON() };
        socket.authUser = { ...user.toJSON() };

        next();
    });

    io.on("connection", (socket) => {
        // console.log(socket.authUser);
        // let authUser = socket.authUser;

        if (socket.authUser) {
            let { _id: id, role, availableFor, name, profilePhoto, charges, passed } = socket.authUser;
            id = id.toString();

            if (role === "user") {
                console.log("USER::::::::CONNECTION", name, "----", socket.id);

                const user = onlineUsers.get(id);

                if (user && user.socketId != socket.id) {
                    const queUser = inQueUsers.get(user.socketId);
                    if (queUser) {
                        // inQueUsers.set(socket.id, { ...queUser, socketId: socket.id });
                        inQueUsers.set(socket.id, [...queUser]);
                        inQueUsers.delete(user.socketId);
                        onlineUsers.delete(user.socketId);
                        io.sockets.sockets.get(user?.socketId)?.disconnect();
                    }
                }

                onlineUsers.set(id, { socketId: socket.id, name });
                onlineUsers.set(socket.id, { id, name });

                socket.join(id);
                socket.join("astrologers");

                io.sockets.in(id).emit("get-live-astrologers", liveAstrologers);
                if (printLog) {
                    console.log("Live INIT EMIT");
                    console.log(liveAstrologers);
                }

                const data = [];

                for (const key in onlineAstrologers) {
                    if (Object.hasOwnProperty.call(onlineAstrologers, key)) {
                        const astrologer = onlineAstrologers[key];
                        if (astrologer.online) data.push({ _id: astrologer._id, availableFor: [...astrologer.availableFor], isAvailable: astrologer.isAvailable, waitingTime: astrologer.waitingTime });
                    }
                }

                io.sockets.in(id).emit("get-online-astrologers", data);
            }

            if (role === "astrologer") {
                console.log("ASTROLOGER::::::::CONNECTION", id, name, socket.id);

                if (printLog) console.log("Clear TimeOut", scheduleDelete[id]);
                clearTimeout(scheduleDelete[id]);
                delete scheduleDelete[id];

                let isPresent = astrologersQue[id];

                if (printLog) console.log(isPresent);

                let isOnlineAstrologer;
                if (isPresent && isPresent?.socketId) {
                    isOnlineAstrologer = onlineAstrologers[isPresent.socketId];
                    // io.sockets.sockets.get(isPresent.socketId)?.disconnect();
                }

                if (printLog) {
                    console.log("isOnlineAstrologer");
                    console.log(isOnlineAstrologer);
                }

                socket.join(id);
                if (isOnlineAstrologer && isOnlineAstrologer.online) {
                    io.sockets.in("astrologers").emit("add-online-astrologer", { _id: id, availableFor: [...isOnlineAstrologer.availableFor], isAvailable: isOnlineAstrologer.isAvailable, waitingTime: isOnlineAstrologer.waitingTime });
                }

                io.sockets.in(id).emit("contact-types", { online: isOnlineAstrologer ? isOnlineAstrologer.online : false, availableFor: isOnlineAstrologer ? [...isOnlineAstrologer.availableFor] : [...new Set(availableFor)] });

                const data = { _id: id, name, profilePhoto, socketId: socket.id, online: isOnlineAstrologer ? isOnlineAstrologer.online : false, onBreak: false, availableFor: new Set(isOnlineAstrologer ? [...isOnlineAstrologer.availableFor] : availableFor), charges, isLive: false, passed, isAvailable: isOnlineAstrologer ? isOnlineAstrologer.isAvailable : true, waitingTime: isOnlineAstrologer ? isOnlineAstrologer.waitingTime : 0 };

                astrologersQue[id] = { socketId: socket.id, charges, que: isPresent ? new Map([...isPresent.que]) : new Map(), isBusy: false, scheduleDelete: false };
                onlineAstrologers[socket.id] = data;
                delete onlineAstrologers[isPresent?.socketId];

                if (printLog) console.log(astrologersQue[id]);

                if (astrologersQue[id]?.que?.size === 0) sendNotification({ astrologerId: id });
            }
        }

        socket.on("start-meeting", (data) => {
            if (printLog) {
                console.log(data);
            }
            if (!data) return;
            if (!data.astrologerId) return;
            if (!data.userId) return;

            const ques = inQueUsers.get(socket.id);

            if (printLog) {
                console.log("start-meeting ---QUES");
                console.log(ques);
            }

            if (!ques) return;
            let activeQue;
            ques.forEach((que) => {
                if (printLog) {
                    console.log("start-meeting ---LOOP-----");
                    console.log(que);
                }

                if (que.astrologerId !== data.astrologerId) {
                    if (printLog) {
                        console.log("==========================start-meeting --removing");
                    }
                    io.sockets.in(que.astrologerId).emit("remove-from-astrologer-que", data.userId);

                    const astrologer = astrologersQue[que.astrologerId];
                    if (!astrologer) return;

                    const user = astrologer.que.get(data.userId);
                    if (!user) return;
                    astrologer.que.delete(data.userId);

                    const onlineAst = onlineAstrologers[astrologer.socketId];
                    const isAvailable = (astrologer?.que?.size || 0) === 0 ? true : false;
                    if (printLog) {
                        console.log("isAvailable === astrologer?.que?.size");
                        console.log(astrologer?.que?.size);
                        console.log(isAvailable);
                    }
                    io.sockets.in("astrologers").emit("update-online-astrologer", { _id: que.astrologerId, availableFor: [...onlineAst.availableFor], isAvailable, waitingTime: onlineAst.waitingTime - user.myTime });
                    onlineAst.waitingTime = onlineAst.waitingTime - user.myTime;
                    onlineAst.isAvailable = isAvailable;

                    const removedUserQueNumber = que.queNumber;

                    [...astrologer.que.keys()].forEach((id, i) => {
                        if (i < removedUserQueNumber - 1) return;
                        if (i === 0) {
                            astrologer.current = astrologer.que.get(id);
                        }

                        const seconds = astrologer.que.get(id).seconds - que.myTime;
                        astrologer.que.get(id).seconds = seconds;

                        if (printLog) console.log(seconds);

                        io.sockets.in(id).emit("update-user-que", { type: astrologer.que.get(id).type, queNumber: i + 1, astrologerId: que.astrologerId, seconds: seconds || 0 });
                        astrologer.que.get(id).queNumber = i + 1;
                    });
                }

                if (que.astrologerId === data.astrologerId) {
                    activeQue = que;
                }
            });

            if (printLog) {
                console.log("start-meeting ---activeQue");
                console.log(activeQue);
            }

            io.sockets.in(data.userId).emit("start-meeting", { status: "success", astrologerId: data.astrologerId });

            if (!activeQue) return;

            inQueUsers.set(socket.id, [activeQue]);
            userActiveQue.set(socket.id, activeQue);

            const socketId = socket.id;

            if (activeQue.type !== constants.mobile_call.key) {
                const timerId = `${data.userId}_${data.astrologerId}`;

                let timeoutSeconds = 30000; // default 30 sec
                if (activeQue.type === constants.app_messaging.key) timeoutSeconds = 50000; // 50 seconds for messaging

                connectedUserAndAstrologersTimer[timerId] = { userConnected: false, astrologerConnected: false };
                connectedUserAndAstrologersTimer[timerId].timer = setTimeout(async () => {
                    if (printLog) console.log("Running TimeOut Meeting Confirmation");
                    delete connectedUserAndAstrologersTimer[timerId];

                    const actuveQue = userActiveQue.get(socketId);

                    Helper.removeFromAstrologerQue(data?.userId, data?.astrologerId, "TimeOut 30 Sec");

                    if (actuveQue && actuveQue.type === constants.app_messaging.key) {
                        if (!actuveQue?.customRoomId) return;

                        const endedAt = new Date();

                        io.sockets.in(data.userId).emit("remove-from-astrologer-que-messaging", { astrologerId: data.astrologerId, customRoomId: actuveQue.customRoomId });

                        try {
                            const meeting = await VideoSDKMeeting.findOneAndUpdate({ status: "ongoing", "call.participants": 2, "call.customRoomId": actuveQue.customRoomId, user: data.userId, astrologer: data.astrologerId }, { status: "ended", endedAt });
                            if (!meeting) {
                                await VideoSDKMeeting.findOneAndUpdate({ $or: [{ status: "ongoing" }, { status: "pending" }], "call.participants": 1, "call.customRoomId": actuveQue.customRoomId }, { status: "missed", endedAt });
                                return;
                            }

                            // socket.emit('end-messaging', meeting._id);

                            const s = +new Date(meeting.startedAt);
                            const e = +new Date(endedAt);

                            const seconds = (e - s) / 1000;
                            const duration = Math.floor(seconds).toString();

                            Helper.queMoneyDeductions({ user: data.userId, astrologer: data.astrologerId, call: meeting.toJSON(), seconds, duration }, "end-messaging, socket-emit");

                            await User.findByIdAndUpdate(data.astrologerId, { $inc: { totalChatMin: Number(duration) } });
                        } catch (err) {
                            console.error("End Messaging Error");
                            console.error(err);
                            return;
                        }
                    }
                }, timeoutSeconds);
            }

            if (printLog) {
                console.log("start-meeting SUCCESSFULLY SUCCESSFULLY");
            }
        });

        socket.on("meeting-confirmation", (data) => {
            if (printLog) {
                console.log("meeting-confirmation");
                console.log(data);
            }

            if (!data) return;
            if (!data?.userId) return;
            if (!data?.astrologerId) return;
            if (!data?.from) return;

            data.from = data?.from.toLowerCase();

            const timerId = `${data.userId}_${data.astrologerId}`;
            const timer = connectedUserAndAstrologersTimer[timerId];
            if (!timer) return;
            if (data.from === "user") timer.userConnected = true;
            if (data.from === "astrologer") timer.astrologerConnected = true;

            if (timer.userConnected && timer.astrologerConnected) {
                if (printLog) console.log("Cleaning TimeOut Meeting Confirmation");
                clearTimeout(timer.timer);
                delete connectedUserAndAstrologersTimer[timerId];
            }
        });

        socket.on("change-astrologer-online-status", (data) => {
            if (printLog) {
                console.log("change-astrologer-online-status");
                console.log(data);
            }

            const astrologer = onlineAstrologers[socket.id];
            const astrologerId = astrologer?._id;

            if (!astrologer) return;

            if (printLog) {
                console.log("astrologer ------> change-astrologer-online-status");
                console.log(astrologer);
            }

            if (!data) {
                if (astrologerId) return io.sockets.in(astrologerId).emit("astrotime-skt-error", { type: "D", msg: "Empty data provided." });
                else return;
            }
            if (typeof data?.online !== "boolean") {
                if (astrologerId) return io.sockets.in(astrologerId).emit("astrotime-skt-error", { type: "D", msg: "status is required" });
                else return;
            }

            astrologer.online = data?.online;
            io.sockets.in(astrologerId).emit("change-astrologer-online-status", data);

            if (data.online === true) {
                io.sockets.in("astrologers").emit("add-online-astrologer", { _id: astrologerId, availableFor: [...astrologer.availableFor], isAvailable: astrologer.isAvailable, waitingTime: astrologer.waitingTime });
            } else {
                io.sockets.in("astrologers").emit("remove-online-astrologer", { _id: astrologerId, astrologerName: astrologer.name });
                astrologersQue[astrologerId].que = new Map();
                onlineAstrologers[socket.id].isAvailable = true;
                onlineAstrologers[socket.id].waitingTime = 0;
            }
        });

        socket.on("astrologer-change-contact-types", (data) => {
            if (printLog) console.log("astrologer-change-contact-types");
            if (printLog) console.log(data);

            const pass = typeof data === "object" && data !== null && !Array.isArray(data);
            if (!pass) return;

            const { id, appVoiceCall, videoCall, mobileCall, messaging } = data;

            if (id) {
                if (!io.sockets.adapter.rooms.get(id)) return;
            }

            const astrologer = onlineAstrologers[socket.id];
            if (!astrologer) {
                return;
                // io.sockets.in(id).emit('astrologer-change-contact-types', 'fail');
            }

            if (appVoiceCall) {
                if (appVoiceCall === "on") {
                    astrologer.availableFor.add(constants.app_voice_call.key);
                } else {
                    astrologer.availableFor.delete(constants.app_voice_call.key);
                }
            }

            if (videoCall) {
                if (videoCall === "on") {
                    astrologer.availableFor.add(constants.app_video_call.key);
                } else {
                    astrologer.availableFor.delete(constants.app_video_call.key);
                }
            }

            if (mobileCall) {
                if (mobileCall === "on") {
                    astrologer.availableFor.add(constants.mobile_call.key);
                } else {
                    astrologer.availableFor.delete(constants.mobile_call.key);
                }
            }

            if (messaging) {
                if (messaging === "on") {
                    astrologer.availableFor.add(constants.app_messaging.key);
                } else {
                    astrologer.availableFor.delete(constants.app_messaging.key);
                }
            }

            io.sockets.in(id).emit("contact-types", { availableFor: [...astrologer.availableFor] });
            if (astrologer.online) {
                // const astro = astrologersQue[que.astrologerId];
                // const isAvailable = (astro?.que?.size || 0) === 0 ? true : false;
                // if (printLog) {
                //     console.log("isAvailable === astrologer?.que?.size");
                //     console.log(astro?.que?.size);
                //     console.log(isAvailable);
                // }
                io.sockets.in("astrologers").emit("update-online-astrologer", { _id: astrologer._id, availableFor: [...astrologer.availableFor], isAvailable: astrologer.isAvailable, waitingTime: astrologer.waitingTime });
            }
        });

        socket.on("get-astrologer-que", (data) => {
            const { astrologerId } = data;
            if (!astrologerId) return;

            const user = astrologersQue[astrologerId];
            if (!user) return;

            io.sockets.in(astrologerId).emit("get-astrologer-que", [...user.que.values()]);
        });

        socket.on("add-to-astrologer-que", async (data) => {
            if (printLog) console.log("Add to Que");
            if (printLog) console.log(data);

            if (!data) return;
            if (!data?.userId) return;

            const { type, userId, astrologerId, userName, userProfilePhoto, mobile } = data;

            if (!type) return;
            if (types.indexOf(type) === -1) return;
            if (!userId) return;
            if (!astrologerId) return;
            if (type === constants.mobile_call.key && !mobile) return;
            if (type === constants.app_live_stream.key && !data.liveStreamCallType) return;
            if (type === constants.app_live_stream.key && types.indexOf(data.liveStreamCallType) === -1) return;

            const astrologer = astrologersQue[astrologerId];

            if (printLog) {
                console.log("Add to Que --astrologer");
                console.log(astrologer);
            }

            if (!astrologer) return;
            const user = astrologer.que.get(userId);

            if (printLog) {
                console.log("Add to Que --USER Que");
                console.log(user);
            }

            const onBreak = onlineAstrologers[astrologer.socketId].onBreak;

            if (user) {
                const { type: prevType, queNumber, astrologerId: astId, seconds } = user;
                if (type === prevType) {
                    return io.sockets.in(userId).emit("add-to-astrologer-que", { type, queNumber, astrologerId, onBreak, seconds: seconds > 0 ? seconds : 0 });
                } else {
                    astrologer.que.delete(userId);
                }
            }

            const queNumber = astrologer.que.size + 1;

            let balance = 0;
            try {
                const wallet = await Wallet.findOne({ user: userId }).lean();
                balance = wallet.balance;
            } catch (err) {
                console.error(err.message);
            }

            const charges = astrologer?.charges[type] || 0;

            if (balance < charges * 6) return io.sockets.in(userId).emit("astrotime-skt-error", { type: "U", msg: "Insufficient balance. Please recharge." });

            // Calculating how long user can talk in seconds
            let time = charges * 60 * balance || 1200;
            if (time > 1200) time = 1200;

            let seconds = 0;

            for (const value of astrologer.que.values()) {
                if (printLog) console.log(value.myTime);
                seconds = seconds + value.myTime;
            }

            const queData = { type, liveStreamCallType: data.liveStreamCallType, userId, socketId: socket.id, astrologerId, userName, userProfilePhoto, queNumber, seconds, myTime: time, canRemove: false };
            astrologer.que.set(userId, queData);

            if (queNumber === 1) {
                setTimeout(() => {
                    io.sockets.in(astrologerId).emit("update-astrologer-que", { userId, canRemove: true });
                }, 20000);
            }

            if (type !== constants.app_live_stream.key) {
                const onlineAst = onlineAstrologers[astrologer.socketId];
                if (printLog) {
                    console.log("isAvailable === astrologer?.que?.size");
                    console.log(astrologer?.que?.size);
                    console.log("isAvailable: false");
                }

                io.sockets.in("astrologers").emit("update-online-astrologer", { _id: astrologerId, availableFor: [...onlineAst.availableFor], isAvailable: false, onBreak, waitingTime: onlineAst.waitingTime + time });
                onlineAst.waitingTime = onlineAst.waitingTime + time;
                onlineAst.isAvailable = false;

                io.sockets.in(userId).emit("add-to-astrologer-que", { type, queNumber, astrologerId, seconds, onBreak, liveStreamCallType: data.liveStreamCallType });
                io.sockets.in(astrologerId).emit("add-to-astrologer-que", queData);
            }

            if (type === constants.app_live_stream.key) {
                if (printLog) console.log("Emited to add to live stream");

                userActiveQue.set(socket.id, { id: userId, type, astrologerId, mobile, queNumber });

                io.sockets.in(astrologerId).emit("add-to-astrologer-que", queData);

                io.sockets.in(`live-${astrologerId}`).emit("add-live-to-astrologer-que", queData);
                io.sockets.in(`live-${astrologerId}`).emit("live-stream-state-change", { timeUpdate: true, isBusy: null, astrologerId, userId: "", waitTime: time, startTime: "" });
            }

            if (inQueUsers.get(socket.id)) {
                inQueUsers.set(socket.id, [...inQueUsers.get(socket.id), { id: userId, type, astrologerId, mobile, queNumber, myTime: time }]);
            } else {
                inQueUsers.set(socket.id, [{ id: userId, type, astrologerId, mobile, queNumber, myTime: time }]);
            }

            if (queNumber === 1 && type !== constants.app_live_stream.key) astrologer.current = queData;

            if (printLog) console.log("Added to Que Successfully");
        });

        socket.on("remove-from-astrologer-que", async (data) => {
            // let printLog = true;
            if (printLog) {
                console.log("Removed from Que");
                console.log(data);
            }

            if (!data) return;
            const { userId, astrologerId, type, ...otherDetails } = data;

            if (!userId) return;
            if (!astrologerId) return;

            const timerId = `${data.userId}_${data.astrologerId}`;
            const timer = connectedUserAndAstrologersTimer[timerId];
            if (timer) {
                clearTimeout(timer.timer);
                delete connectedUserAndAstrologersTimer[timerId];
            }

            // socket.leave(`online-${astrologerId}`);

            const astrologer = astrologersQue[astrologerId];
            if (!astrologer) return;

            let current = {};
            if (astrologer?.current) {
                current = { ...astrologer?.current };
            }

            const user = astrologer.que.get(userId);
            if (!user) return;
            astrologer.que.delete(userId);

            const endedAt = new Date();
            const removedUserQueNumber = user.queNumber || 0;

            if (printLog) {
                console.log("removedUserQueNumber");
                console.log(removedUserQueNumber);
            }

            if (printLog) {
                console.log("Removed Current User");
                console.log(current);
            }

            if (current.type !== constants.app_live_stream.key) {
                const onlineAst = onlineAstrologers[astrologer.socketId];
                const isAvailable = (astrologer?.que?.size || 0) === 0 ? true : false;
                if (printLog) {
                    console.log("isAvailable === astrologer?.que?.size");
                    console.log(astrologer?.que?.size);
                    console.log(isAvailable);
                }
                io.sockets.in("astrologers").emit("update-online-astrologer", { _id: astrologerId, availableFor: [...onlineAst.availableFor], isAvailable, waitingTime: onlineAst.waitingTime - user.myTime });
                onlineAst.waitingTime = onlineAst.waitingTime - user.myTime;
                onlineAst.isAvailable = isAvailable;

                io.sockets.in(astrologerId).emit("remove-from-astrologer-que", userId);
                if (otherDetails?.customRoomId) {
                    setTimeout(() => {
                        io.sockets.in(userId).emit("remove-from-astrologer-que-videosdk", { astrologerId: data.astrologerId, ...otherDetails });
                    }, 1000);
                }
            }

            if (type === constants.app_live_stream.key || current.type === constants.app_live_stream.key) {
                // For Astrologers
                io.sockets.in(`live-${astrologerId}`).emit("remove-from-astrologer-que", userId);

                // io.sockets.in(`live-${astrologerId}`).emit('live-stream-state-change', { isBusy: false, astrologerId, userId: "", waitTime: time, startTime: astrologer?.current?.startTime });

                // For Users
                io.sockets.in(`live-${astrologerId}`).emit("remove-live-from-astrologer-que", userId);
            }

            [...astrologer.que.keys()].forEach((id, i) => {
                if (printLog) console.log("Update Loop Up =========== ", id, i);

                if (i < removedUserQueNumber - 1) return;
                if (i === 0) {
                    astrologer.current = astrologer.que.get(id);

                    setTimeout(() => {
                        io.sockets.in(astrologerId).emit("update-astrologer-que", { userId, canRemove: true });
                    }, 20000);
                }
                if (printLog) console.log("Update Loop Down =========== ");
                if (printLog) console.log(user.myTime, astrologer.que.get(id).seconds);

                const seconds = Number(astrologer.que.get(id).seconds) - Number(user.myTime);
                astrologer.que.get(id).seconds = seconds;

                if (printLog) console.log(seconds);

                io.sockets.in(id).emit("update-user-que", { type: astrologer.que.get(id).type, queNumber: i + 1, astrologerId, seconds: seconds || 0 });
                astrologer.que.get(id).queNumber = i + 1;
            });

            if (printLog) {
                console.log("Current User Details");
                console.log(current);
            }

            if (onlineAstrologers[astrologer?.socketId || ""]?.isLive) {
                // console.log("userId");
                // console.log(userId);

                if (current?.userId === userId) {
                    let waitTime = 0;
                    astrologer?.que?.forEach((user) => {
                        waitTime = waitTime + (user?.seconds || 0);
                    });

                    astrologer.isBusy = false;
                    io.sockets.in(`live-${astrologerId}`).emit("live-stream-state-change", { isBusy: false, userId: "", waitTime, astrologerId, startTime: "" });
                }
            }

            const queUser = inQueUsers.get(socket.id);
            if (printLog) {
                console.log("BEFORE::: queUser on Remove socket");
                console.log(queUser);
            }

            if (queUser) {
                if (queUser?.length > 1) {
                    const index = queUser.findIndex((d) => d.astrologerId === astrologerId);
                    queUser.splice(index, 1);
                    inQueUsers.set(socket.id, queUser);

                    if (printLog) {
                        console.log("AFTER::: queUser on Remove socket");
                        console.log(queUser);
                    }
                } else {
                    inQueUsers.delete(socket.id);
                }
            }
            // else {
            // 	const socketId = onlineUsers.get(userId).socketId;
            // 	if (socketId) {
            // 		inQueUsers.delete(socketId);
            // 	}
            // }

            // if (astrologer.current?.type === constants.app_live_stream.key && removedUserQueNumber === 1) astrologer.current = {};

            if (user?.type === constants.app_live_stream.key && removedUserQueNumber === 1) {
                if (printLog) {
                    console.log("VideSDK app_live_stream meeting end init");
                    console.log(user.customRoomId);
                }

                astrologer.current = {};

                const meeting = await VideoSDKMeeting.findOneAndUpdate({ "call.customRoomId": user.customRoomId }, { status: "ended", endedAt });
                if (!meeting) return;

                const s = +new Date(meeting.startedAt);
                const e = +new Date(endedAt);

                const seconds = (e - s) / 1000;
                const duration = Math.floor(seconds).toString();

                Helper.queMoneyDeductions({ liveStreamCallType: user.liveStreamCallType || current.liveStreamCallType, liveStreamId: astrologer.liveStreamId, user: userId, astrologer: astrologerId, call: meeting.toJSON(), seconds, duration }, "remove-from-que, live-stream-que");

                await User.findByIdAndUpdate(astrologerId, { $inc: { totalCallMin: Number(duration) } });
            }

            if (printLog) console.log("Removed from Que Successfully");

            if (astrologersQue[astrologerId]?.que?.size === 0) sendNotification({ astrologerId: astrologerId });
        });

        socket.on("remove-from-astrologer-que-force", (data) => {
            const { userId, astrologerId, type } = data;

            const timerId = `${data.userId}_${data.astrologerId}`;
            const timer = connectedUserAndAstrologersTimer[timerId];
            if (timer) {
                clearTimeout(timer.timer);
                delete connectedUserAndAstrologersTimer[timerId];
            }

            const astrologer = astrologersQue[astrologerId];
            if (!astrologer) return;

            let current = {};
            if (astrologer?.current) {
                current = { ...astrologer?.current };
            }

            const user = astrologer.que.get(userId);
            if (!user) return;
            astrologer.que.delete(userId);

            const removedUserQueNumber = user.queNumber || 0;

            const onlineAst = onlineAstrologers[astrologer.socketId];
            const isAvailable = (astrologer?.que?.size || 0) === 0 ? true : false;

            io.sockets.in("astrologers").emit("update-online-astrologer", { _id: astrologerId, availableFor: [...onlineAst.availableFor], isAvailable, waitingTime: onlineAst.waitingTime - user.myTime });
            onlineAst.waitingTime = onlineAst.waitingTime - user.myTime;
            onlineAst.isAvailable = isAvailable;

            io.sockets.in(astrologerId).emit("remove-from-astrologer-que", userId);
            io.sockets.in(userId).emit("remove-from-astrologer-que-force", { astrologerId, astrologerName: onlineAst.name });

            [...astrologer.que.keys()].forEach((id, i) => {
                if (i < removedUserQueNumber - 1) return;
                if (i === 0) {
                    astrologer.current = astrologer.que.get(id);

                    setTimeout(() => {
                        io.sockets.in(astrologerId).emit("update-astrologer-que", { userId, canRemove: true });
                    }, 20000);
                }

                const seconds = Number(astrologer.que.get(id).seconds) - Number(user.myTime);
                astrologer.que.get(id).seconds = seconds;

                if (printLog) console.log(seconds);

                io.sockets.in(id).emit("update-user-que", { type: astrologer.que.get(id).type, queNumber: i + 1, astrologerId, seconds: seconds || 0 });
                astrologer.que.get(id).queNumber = i + 1;
            });

            const socketId = onlineUsers.get(userId)?.socketId;

            if (socketId) {
                const queUser = inQueUsers.get(socketId);

                if (queUser) {
                    if (queUser?.length > 1) {
                        const index = queUser.findIndex((d) => d.astrologerId === astrologerId);
                        queUser.splice(index, 1);
                        inQueUsers.set(socketId, queUser);
                    } else {
                        inQueUsers.delete(socketId);
                    }
                }
            }
        });

        socket.on("astrologer-toggle-break", (data) => {
            if (printLog) {
                console.log("astrologer-toggle-break");
                console.log(data);
            }

            if (!data) return;
            if (data.break !== true && data.break !== false) return;

            if (printLog) console.log("astrologer-toggle-break PASSED Validation", socket.id);

            const astrologer = onlineAstrologers[socket.id];
            if (!astrologer) return;
            if (!astrologer.online) return;

            if (data.break === true) {
                astrologer.onBreak = true;
                io.sockets.in("astrologers").emit("astrologer-start-break", { _id: astrologer._id, time: appConfig.breakTime });
            }

            if (data.break === false) {
                astrologer.onBreak = false;
                io.sockets.in("astrologers").emit("astrologer-end-break", { _id: astrologer._id });
            }

            io.sockets.in(astrologer._id).emit("astrologer-toggle-break", data);

            if (printLog) console.log("astrologer-toggle-break SUCCESSFUL");
        });

        socket.on("get-astrologers-live-streams", async (id) => {
            if (!id) return;

            const find = {};
            find.status = { $ne: "ended" };

            const followedAstrogers = await Follow.find({ userId: id }).select("followingId").lean();
            const followedAstrogersIds = followedAstrogers.map((astro) => astro.followingId.toString());

            find.user = { $in: followedAstrogersIds };

            const docs = await VideoSDKLiveStream.find(find).populate("user", "name profilePhoto mobile charges");
            if (printLog) console.log("VideoSDKLiveStream");
            if (printLog) console.log(docs.length);

            io.sockets.in(id).emit("get-astrologers-live-streams", docs);
        });

        socket.on("astrologer-live-start", async (req) => {
            //id is the _id of astrologer and liveStreamId is the _id of liveStream
            if (printLog) console.log("Astrologer Live Start");
            if (printLog) console.log(req);

            if (!req) return;
            const { id, liveStreamId } = req;

            if (!id) return;
            if (!liveStreamId) return;

            const astrologer = onlineAstrologers[socket.id];
            if (!astrologer) return;
            if (astrologer.isLive) return io.sockets.in(id).emit("astrologer-live-start", { status: "success" });
            if (astrologer.passed !== 1) return;

            if (printLog) console.log("Astrologer Live Start --astrologer");
            if (printLog) console.log(astrologer);

            socket.join(`live-${astrologer._id.toString()}`);
            io.sockets.in("astrologers").emit("update-online-astrologer", { _id: id, availableFor: [], isAvailable: false, waitingTime: 0 });
            astrologer.waitingTime = 0;
            astrologer.isAvailable = false;
            astrologersQue[astrologer._id || id].que = new Map();

            const data = { _id: astrologer._id || id, name: astrologer.name, profilePhoto: astrologer.profilePhoto, socketId: socket.id, charges: astrologer?.charges, liveStreamId };

            const preLiveAstro = liveAstrologers.find((astro) => astro._id === (astrologer._id || id));
            if (preLiveAstro) io.sockets.in("astrologers").emit("remove-live-astrologer", { _id: astrologer._id });

            data.availableFor = [];
            // io.sockets.in('astrologers').emit('add-online-astrologer', data);
            io.sockets.in(id).emit("contact-types", { availableFor: [] });

            const liveStream = await VideoSDKLiveStream.findByIdAndUpdate(liveStreamId, { status: "ongoing" }, { new: true }).populate("user", "name mobile profilePhoto charges");

            data.liveStreamId = liveStream._id.toString();

            astrologer.availableFor.clear();
            liveAstrologers.push(data);
            astrologer.isLive = true;
            if (astrologersQue[astrologer._id || id]) astrologersQue[astrologer._id || id].liveStreamId = data.liveStreamId;

            io.sockets.in(id).emit("astrologer-live-start", { status: "success" });
            setTimeout(() => {
                if (astrologer?.isLive === true) {
                    io.sockets.in("astrologers").emit("update-astrologers-live-streams", liveStream);
                    io.sockets.in("astrologers").emit("add-live-astrologer", data);
                }
            }, 6000);

            if (printLog) console.log("Live Started Successfully");
        });

        socket.on("astrologer-live-end", async (data) => {
            //id is the _id of astrologer and liveStreamId is the _id of liveStream
            const { id, liveStreamId } = data;
            if (printLog) console.log("Astrologer Live End");
            if (printLog) console.log(data);

            if (!id) return;
            if (!liveStreamId) return;

            io.sockets.in("astrologers").emit("remove-astrologers-live-streams", liveStreamId);
            io.sockets.in("astrologers").emit("remove-live-astrologer", { _id: id });

            let index;
            const user = liveAstrologers.find((user, i) => {
                index = i;
                return user.socketId === socket.id;
            });

            if (!user) return;

            const onlineAstro = onlineAstrologers[socket.id];
            if (onlineAstro) {
                onlineAstro.isLive = false;
                onlineAstro.isAvailable = true;
                onlineAstro.waitingTime = 0;
            }
            io.sockets.in("astrologers").emit("update-online-astrologer", { _id: id, availableFor: [], isAvailable: true, waitingTime: 0 });
            // const onlineAstro = onlineAstrologers[socket.id];
            // io.sockets.in('astrologers').emit('add-online-astrologer', {...onlineAstro, availableFor: [...onlineAstro.onlineAstro]});

            liveAstrologers.splice(index, 1);
            try {
                await VideoSDKLiveStream.findByIdAndUpdate(user.liveStreamId, { status: "ended" });
            } catch (err) {
                console.error("Error: End Live Stream Socket");
                console.error(err);
            }

            if (printLog) console.log("Live End Successful");
        });

        socket.on("accept-live-join-req", async (data) => {
            if (printLog) console.log("Req Live Join");
            if (printLog) console.log(data);

            if (!data) return;
            if (!data.user) return;
            io.sockets.in(data.user).emit("accept-live-join-req", { join: true });

            // const astro = onlineAstrologers[socket.id];
            // const astroId = astro?._id
            // if (!astroId) return;

            // let waitTime = 0;
            // astro?.que?.forEach(user => {
            // 	waitTime = waitTime + (user?.seconds || 0);
            // });

            // const startTime = formatDate(+new Date(), 'dd-mm-yyyy hh:mm:ss');

            // io.sockets.in(`live-${astroId}`).emit('live-stream-state-change', { isBusy: true, userId: data.user, waitTime, startTime });

            // try {
            // 	const customRoomId = uuidv4();
            // 	const call = { id: uuidv4(), roomId: uuidv4(), customRoomId, type: constants.app_live_stream.key, participants: 2 };

            // 	await VideoSDKMeeting.create({ status: 'ongoing', call, user: data.user, astrologer: astroId, startedAt: new Date() });
            // 	astrologersQue[astroId].isBusy = true;
            // 	astrologersQue[astroId].current = { ...astrologersQue[astroId].que.get(data.user), startTime };
            // 	astrologersQue[astroId].que.set(data.user, { ...astrologersQue[astroId].que.get(data.user), customRoomId });

            // 	if (printLog) console.log(astrologersQue[astroId].isBusy);

            // } catch (err) {
            // 	console.error('accept-live-join-req');
            // 	console.error(err.message);
            // 	return;
            // }
            if (printLog) console.log("Req Live Join Success");
        });

        socket.on("accept-live-call-req", async (data) => {
            if (printLog) console.log("Req Call Accept Join");
            if (printLog) console.log(data);

            if (!data) return;
            if (!data.astrologerId) return;
            if (!data.user) return;

            data.user = onlineUsers.get(socket.id)?.id || data.user;

            const astroId = data.astrologerId;
            const astro = astrologersQue[astroId];
            if (!astro) return;

            let waitTime = 0;
            astro.que.forEach((user) => {
                waitTime = waitTime + (user?.seconds || 0);
            });

            const startTime = formatDate(+new Date(), "dd-mm-yyyy hh:mm:ss");

            try {
                const customRoomId = uniqueId();
                const call = { id: uniqueId(), roomId: uniqueId(), customRoomId, type: constants.app_live_stream.key, participants: 2 };

                await VideoSDKMeeting.create({ status: "ongoing", call, user: data.user, astrologer: astroId, startedAt: new Date() });

                astrologersQue[astroId].isBusy = true;
                astrologersQue[astroId].current = { ...astrologersQue[astroId].que.get(data.user), startTime, customRoomId };
                astrologersQue[astroId].que.set(data.user, { ...astrologersQue[astroId].que.get(data.user), customRoomId });

                io.sockets.in(data.user).emit("accept-live-call-req", { accepted: true, meetingId: customRoomId });
                io.sockets.in(astroId).emit("accept-live-call-req", { accepted: true, meetingId: customRoomId });
                io.sockets.in(`live-${astroId}`).emit("live-stream-state-change", { isBusy: true, userId: data.user, waitTime, startTime });

                userActiveQue.set(socket.id, { ...userActiveQue.get(socket.id), inLiveCall: true, customRoomId });

                if (printLog) console.log(astrologersQue[astroId].isBusy);
            } catch (err) {
                console.error("accept-live-call-req");
                console.error(err.message);
                return;
            }

            if (printLog) console.log("Req Live Call Accept Success");
        });

        socket.on("join-live-stream", (data) => {
            if (!data) return;
            if (!data.userId) return;
            if (!data.astrologerId) return;

            if (printLog) console.log("Join Live Stream Req");

            socket.join(`live-${data.astrologerId}`);

            const astrologer = astrologersQue[data.astrologerId];
            if (!astrologer) return;

            let waitTime = 0;
            astrologer.que.forEach((user) => {
                waitTime = waitTime + user.seconds;
            });

            const details = { isBusy: astrologer.isBusy, userId: astrologer?.current?.userId || "", waitTime, startTime: astrologer?.current?.startTime || "", astrologerId: data.astrologerId };

            if (printLog) console.log(astrologer);
            if (printLog) console.log(details);

            io.sockets.in(data.userId).emit("join-live-stream", details);

            io.sockets.in(data.userId).emit("get-astrologer-que", [...astrologer.que.values()]);

            if (printLog) console.log("Join Live Stream Success");
        });

        socket.on("leave-live-stream", (data) => {
            if (!data) return;
            if (!data.astrologerId) return;

            socket.leave(`live-${data.astrologerId}`);
        });

        socket.on("start-messaging", async (data) => {
            if (printLog) {
                console.log("start-messaging");
                console.log(data);
            }

            if (!data?.userId) return;
            if (!data?.astrologerId) return;

            const customRoomId = uniqueId();

            const call = { id: uniqueId(), roomId: uniqueId(), customRoomId, type: constants.app_messaging.key, participants: 1 };
            try {
                await VideoSDKMeeting.create({ status: "pending", call, user: data.userId, astrologer: data.astrologerId, startedAt: new Date() });
                io.sockets.in(data.userId).emit("start-messaging", customRoomId);
            } catch (err) {
                console.error("SOCKET:: start-messaging");
                console.error(err);
                io.sockets.in(data.astrologerId).emit("astrotime-skt-error", { type: "D", msg: err.message || "Somthing went wrong. Please try again" });
                io.sockets.in(data.userId).emit("astrotime-skt-error", { type: "D", msg: err.message || "Somthing went wrong. Please try again" });
                return;
            }

            const activeQue = userActiveQue.get(socket.id);
            if (activeQue) {
                activeQue.customRoomId = customRoomId;
                activeQue.queNumber = 1;
                userActiveQue.set(socket.id, activeQue);
            }

            if (printLog) {
                console.log("Sending Notification to Astrologer");
            }

            io.sockets.in(data.astrologerId).emit("join-messaging", { userId: data.userId, name: onlineUsers.get(socket.id)?.name || "Unknown" });

            const user = inQueUsers.get(socket.id);
            if (!user) return;
            const queDetails = user.map((ques) => {
                if (ques.astrologerId === data.astrologerId) {
                    ques.customRoomId = customRoomId;
                    ques.queNumber = 1;
                }
                return ques;
            });

            inQueUsers.set(socket.id, queDetails);
        });

        socket.on("add-message-participants", async (data) => {
            if (!data?.userId) return;
            if (!data?.astrologerId) return;

            const socketId = onlineUsers.get(data.userId)?.socketId;
            if (!socketId) return;

            const que = inQueUsers.get(socketId);
            if (!que) return;

            const user = que.find((user) => user.astrologerId === data.astrologerId);
            if (!user) return;

            const activeQue = userActiveQue.get(socket.id);

            const customRoomId = activeQue?.customRoomId || user?.customRoomId || "";

            io.sockets.in(data.astrologerId).emit("start-messaging", customRoomId);

            await VideoSDKMeeting.findOneAndUpdate({ "call.customRoomId": user.customRoomId, user: data.userId, astrologer: data.astrologerId }, { status: "ongoing", "call.participants": 2 });
        });

        socket.on("end-messaging", async (data) => {
            if (printLog) {
                console.log("end-messaging");
                console.log(data);
            }

            if (!data?.userId) return;
            if (!data?.astrologerId) return;
            if (!data?.customRoomId) return Helper.removeFromAstrologerQue(data?.userId, data?.astrologerId, "end-messaging-no-custom-room-id");

            const endedAt = new Date();

            const timerId = `${data.userId}_${data.astrologerId}`;
            const timer = connectedUserAndAstrologersTimer[timerId];
            if (timer) {
                clearTimeout(timer.timer);
                delete connectedUserAndAstrologersTimer[timerId];
            }

            io.sockets.in(data.userId).emit("remove-from-astrologer-que-messaging", { astrologerId: data.astrologerId, customRoomId: data.customRoomId });

            try {
                Helper.removeFromAstrologerQue(data?.userId, data?.astrologerId, "end-messaging");

                const meeting = await VideoSDKMeeting.findOneAndUpdate({ status: "ongoing", "call.participants": 2, "call.customRoomId": data.customRoomId, user: data.userId, astrologer: data.astrologerId }, { status: "ended", endedAt });
                if (!meeting) {
                    await VideoSDKMeeting.findOneAndUpdate({ $or: [{ status: "ongoing" }, { status: "pending" }], "call.participants": 1, "call.customRoomId": data.customRoomId, user: data.userId, astrologer: data.astrologerId }, { status: "missed", endedAt });
                    return;
                }

                // socket.emit('end-messaging', meeting._id);

                const s = +new Date(meeting.startedAt);
                const e = +new Date(endedAt);

                const seconds = (e - s) / 1000;
                const duration = Math.floor(seconds).toString();

                Helper.queMoneyDeductions({ user: data.userId, astrologer: data.astrologerId, call: meeting.toJSON(), seconds, duration }, "end-messaging, socket-emit");

                await User.findByIdAndUpdate(data.astrologerId, { $inc: { totalChatMin: Number(duration) } });
            } catch (err) {
                console.error("End Messaging Error");
                console.error(err);
                return;
            }
        });

        socket.on("astro-notification", (data) => {
            if (!data) return;
            if (typeof data !== "object") return;

            const { id, ...details } = data;
            if (!id) return;
            if (!details) return;

            const obj = Object.values(details);
            // for (const property in details) {
            // 	obj.push(property)
            // }

            if (obj.length === 0) return;

            io.sockets.in(id).emit("astro-notification", data);
        });

        socket.on("send-emoji", (data) => {
            if (!data) return;
            if (!data.astrologerId) return;

            io.sockets.in(`live-${data.astrologerId}`).emit("send-emoji", data);
        });

        socket.on("disconnect", (reason) => {
            console.log("A user disconnected", socket.id, ", reason", reason);

            Helper.handleSocketDisconnect(socket, reason);
        });
    });
};

module.exports = socketConstructor;
