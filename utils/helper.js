const path = require("path");
const firebaseAdmin = require("firebase-admin");
// const { v4 } = require('uuid');

// const uuidv4 = v4;
const User = require("../models/users.model");
const constants = require("../config/constants");
const Wallet = require("../models/wallet.model");
const Transaction = require("../models/transactions.model");
const VideoSDKMeeting = require("../models/meeting.model");
const formatDate = require("./formatDate");
const validateID = require("./validateId");
const VideoSDKLiveStream = require("../models/liveStreaming.model");
const uniqueId = require("./uniqueId");

class HelperClass {
    io = undefined;
    firebaseApp = undefined;

    constructor() {}

    setSocketIo(io) {
        this.io = io;
    }

    getSocketIo() {
        return this.io;
    }

    initFirebaseApp() {
        const fbServiceKey = path.resolve(__dirname, `../${process.env.FIREBASE_JSON_FILE}`);

        const configFB = {
            credential: firebaseAdmin.credential.cert(fbServiceKey),
        };
        this.firebaseApp = firebaseAdmin.initializeApp(configFB);
    }

    get getFirebaseApp() {
        return this.firebaseApp;
    }

    get getFirbaseMessaging() {
        return firebaseAdmin.messaging(this.firebaseApp);
    }

    removeFromAstrologerQue(userId, astrologerId, from = "anonymous") {
        // const printLog = true;
        userId = userId?.toString();
        astrologerId = astrologerId?.toString();

        if (printLog) console.log("removeFromAstrologerQue");
        if (printLog) console.log(from);
        if (printLog) console.log(userId, astrologerId);

        if (!userId) return;
        if (!astrologerId) return;

        const astrologer = astrologersQue[astrologerId.toString()];
        if (printLog) {
            console.log("astrologer --removeFromAstrologerQue");
            console.log(astrologer);
        }

        if (!astrologer) return;

        const user = astrologer.que.get(userId?.toString());
        if (printLog) {
            console.log("user --removeFromAstrologerQue");
            console.log(user);
        }

        if (!user) return;

        // const userQues = inQueUsers.get(user.socketId);
        // if (!userQues) return;
        // const matchQue = userQues.find(que => que?.astrologerId?.toString() == astrologerId?.toString());
        // if (!matchQue) return;

        const removedUserQueNumber = user.queNumber || 1;
        astrologer.que.delete(userId);

        const onlineAst = onlineAstrologers[astrologer.socketId];
        const isAvailable = (astrologer?.que?.size || 0) === 0 ? true : false;
        if (printLog) {
            console.log("isAvailable === astrologer?.que?.size");
            console.log(astrologer?.que?.size);
            console.log(isAvailable);
        }
        this.io.sockets.in("astrologers").emit("update-online-astrologer", { _id: astrologerId, availableFor: [...onlineAst.availableFor], isAvailable, waitingTime: onlineAst.waitingTime - user.myTime });
        onlineAst.waitingTime = onlineAst.waitingTime - user.myTime;
        onlineAst.isAvailable = isAvailable;

        this.io.sockets.in(astrologerId).emit("remove-from-astrologer-que", userId);
        if (user.type === constants.mobile_call.key) this.io.sockets.in(userId).emit("remove-from-astrologer-que-click-call", { astrologerId });

        [...astrologer.que.keys()].forEach((id, i) => {
            if (i < removedUserQueNumber - 1) return;
            if (i === 0) {
                astrologer.current = astrologer.que.get(id);
            }

            const seconds = astrologer.que.get(id).seconds - user.myTime;
            astrologer.que.get(id).seconds = seconds;

            this.io.sockets.in(id).emit("update-user-que", { type: astrologer.que.get(id).type, queNumber: i + 1, astrologerId, seconds: seconds || 0 });
            astrologer.que.get(id).queNumber = i + 1;
        });

        const userQues = inQueUsers.get(user.socketId);
        if (!userQues) return;

        if (userQues?.length > 1) {
            const index = userQues.findIndex((d) => d.astrologerId === astrologerId?.toString());
            userQues.splice(index, 1);
            if (onlineUsers.get(userId?.toString())?.socketId) inQueUsers.set(onlineUsers.get(userId?.toString()).socketId, userQues);

            if (printLog) {
                console.log("AFTER::: userQues on Remove socket");
                console.log(userQues);
            }
        } else {
            if (onlineUsers.get(userId?.toString())?.socketId) inQueUsers.delete(onlineUsers.get(userId.toString()).socketId);
        }

        if (printLog) {
            console.log("-----------------------------> removeFromAstrologerQue");
            console.log("removeFromAstrologerQue Webhook successfully");
        }
    }

    async queMoneyDeductions(info, from = "anonymous") {
        try {
            if (printLog) {
                console.log(from);
                console.log(info);
            }

            // duration is a optional parameter
            // Everything else is required
            let { user, astrologer, call, seconds, duration } = info;

            //Fetching user and astrologer
            const docs = await User.find({ _id: { $in: [user, astrologer] } }).select("walletId mobile charges plateformCharges");

            //Re-assigning user and astrologer with details
            docs.forEach((doc) => {
                if (doc._id.toString() === user.toString()) user = doc;
                if (doc._id.toString() === astrologer.toString()) astrologer = doc;
            });

            //By default amount and call charges are 0
            let amount = 0;
            let callCharge = 0;
            let { plateformCharges } = astrologer;

            let liveStreamId = undefined;

            if (info.liveStreamId) liveStreamId = info.liveStreamId;

            let callType = call.call.type;
            if (callType === constants.app_live_stream.key && info.liveStreamCallType) {
                callType = info.liveStreamCallType;
            }

            if (astrologer?.charges && astrologer?.charges[callType] && astrologer?.charges[callType] > 0) {
                callCharge = astrologer.charges[callType];
            }

            if (callCharge > 0) {
                const callChangePerSeconds = callCharge / 60;
                amount = callChangePerSeconds * seconds;
                amount = Number(amount.toFixed(2));
            }

            const plateformCharge = (amount * plateformCharges) / 100;
            const astrologerAmount = amount - plateformCharge;

            // Generating transaction date with format of yyyy-mm-dd hh:mm:ss
            const timestamp = +new Date();
            const txnDate = formatDate(timestamp, "yyyy-mm-dd hh:mm:ss");

            const transactionsData = [
                {
                    status: constants.success,
                    // uoid: `${user._id.toString()}-${call._id.toString()}-${timestamp}`,
                    meeting: call._id,
                    livestream: liveStreamId,
                    amount,
                    type: "withdraw",
                    orderId: uniqueId("numeric"),
                    tnxTimestamp: +new Date(),
                    ref: call?.call?.type || "anonymous",
                    user: user._id,
                    toUser: astrologer._id,
                    mobile: user.mobile,
                    other: {
                        txnDate,
                    },
                },
                {
                    status: constants.success,
                    // uoid: `${astrologer._id.toString()}-${call._id.toString()}-${timestamp}`,
                    meeting: call._id,
                    livestream: liveStreamId,
                    amount: astrologerAmount,
                    plateformCharges: plateformCharge,
                    type: "deposit",
                    orderId: uniqueId("numeric"),
                    tnxTimestamp: +new Date(),
                    ref: call?.call?.type || "anonymous",
                    user: astrologer._id,
                    fromUser: user._id,
                    mobile: astrologer.mobile,
                    other: {
                        txnDate,
                    },
                },
            ];

            const transaction = await Transaction.insertMany(transactionsData);
            const videoSDKDetails = {};
            transaction.forEach((t) => {
                if (t.user.toString() === astrologer._id.toString()) videoSDKDetails.transactionA = t._id;
                if (t.user.toString() === user._id.toString()) videoSDKDetails.transactionU = t._id;
            });

            if (duration) videoSDKDetails.duration = duration;
            await VideoSDKMeeting.findByIdAndUpdate(call._id, videoSDKDetails);
            if (amount <= 0) return;

            const walletU = await Wallet.findOne({ user: user._id });
            let walletAmountU = walletU.balance - Number(amount);
            await Wallet.findByIdAndUpdate(walletU._id, { balance: walletAmountU });

            const walletA = await Wallet.findOne({ user: astrologer._id });
            let walletAmountA = walletA.balance + Number(amount);
            await Wallet.findByIdAndUpdate(walletA._id, { balance: walletAmountA });
        } catch (err) {
            console.error("HELPER:::queMoneyDeductions");
            console.error(info);
            console.error(from);
            console.error("Que Money Deduct Error");
            console.error(err);
        }
    }

    async handleUserDisconnect(socket) {
        const user = userActiveQue.get(socket.id);
        // const user = inQueUsers.get(socket.id);
        if (printLog) {
            console.log("Dissconnect::: userActiveQue");
            console.log(user);
        }

        if (!user) {
            const d = onlineUsers.get(socket.id);
            if (d) {
                onlineUsers.delete(d.id);
                onlineUsers.delete(socket.id);
            }
        } else {
            const timerId = `${user.id}_${user.astrologerId}`;
            const timer = connectedUserAndAstrologersTimer[timerId]?.timer;
            clearTimeout(timer);
            delete connectedUserAndAstrologersTimer[timerId];
        }

        if (user && !(user.type === constants.mobile_call.key) && !(user.type === constants.app_messaging.key) && !(user.type === constants.app_live_stream.key)) {
            const astrologerId = user.astrologerId;
            this.io.sockets.in(astrologerId).emit("remove-from-astrologer-que", user.id);

            const astrologer = astrologersQue[astrologerId];
            if (printLog) {
                console.log("===================astrologer===================");
                console.log(astrologer);
            }
            if (!astrologer) return;

            const queUser = astrologer.que.get(user.id);
            if (!queUser) return;

            astrologer.que.delete(user.id);

            const removedUserQueNumber = queUser.queNumber;

            if (printLog) {
                console.log("===================removedUserQueNumber===================");
                console.log(removedUserQueNumber);
            }

            const onlineAst = onlineAstrologers[astrologer.socketId];
            const isAvailable = (astrologer?.que?.size || 0) === 0 ? true : false;
            if (printLog) {
                console.log("isAvailable === astrologer?.que?.size");
                console.log(astrologer?.que?.size);
                console.log(isAvailable);
            }
            this.io.sockets.in("astrologers").emit("update-online-astrologer", { _id: astrologerId, availableFor: [...onlineAst.availableFor], isAvailable, waitingTime: onlineAst.waitingTime - queUser.myTime });
            onlineAst.waitingTime = onlineAst.waitingTime - queUser.myTime;
            onlineAst.isAvailable = isAvailable;

            if (astrologer) {
                [...astrologer.que.keys()].forEach((id, i) => {
                    if (i < removedUserQueNumber - 1) return;
                    if (i === 0) astrologer.current = astrologer.que.get(id);

                    const seconds = astrologer.que.get(id).seconds - queUser.myTime;
                    astrologer.que.get(id).seconds = seconds;

                    this.io.sockets.in(id).emit("update-user-que", { type: astrologer.que.get(id).type, queNumber: i + 1, astrologerId: user.astrologerId, seconds: seconds || 0 });
                    astrologer.que.get(id).queNumber = i + 1;
                });
            }

            onlineUsers.delete(user.id);
            onlineUsers.delete(socket.id);
            userActiveQue.delete(socket.id);
            inQueUsers.delete(socket.id);
        }

        if (user && user.type === constants.mobile_call.key) {
            const wallet = Wallet.findOne({ user: user.id }, "balance");
            if (!wallet) return;

            const { balance } = wallet;
            const astrologer = astrologersQue[user.astrologerId];

            let charges = astrologer?.charges[constants.mobile_call.key] || 0;
            // if (!charges) charges = 100;

            let time = charges ? parseInt((balance / charges) * 60) : 120;
            time = time || 120;

            if (printLog) console.log("time::::::::::", time);
            const queUser = astrologer.que.get(user.id);
            if (!queUser) return;

            scheduleDelete[user.id] = setTimeout(() => {
                const userId = user.id;
                if (printLog) console.log("====Scheduled Que User has been deleted====");

                inQueUsers.delete(socket.id);
                userActiveQue.delete(socket.id);

                const astrologer = astrologersQue[user.astrologerId];
                if (!astrologer) return;

                const removedUserQueNumber = queUser.queNumber;

                astrologer.que.delete(userId);

                this.io.sockets.in(user.astrologerId).emit("remove-from-astrologer-que", userId);

                const onlineAst = onlineAstrologers[astrologer.socketId];
                const isAvailable = (astrologer?.que?.size || 0) === 0 ? true : false;
                if (printLog) {
                    console.log("isAvailable === astrologer?.que?.size");
                    console.log(astrologer?.que?.size);
                    console.log(isAvailable);
                }
                this.io.sockets.in("astrologers").emit("update-online-astrologer", { _id: user.astrologerId, availableFor: [...onlineAst.availableFor], isAvailable, waitingTime: onlineAst.waitingTime - queUser.myTime });
                onlineAst.waitingTime = onlineAst.waitingTime - queUser.myTime;
                onlineAst.isAvailable = isAvailable;

                [...astrologer.que.keys()].forEach((id, i) => {
                    if (i < removedUserQueNumber - 1) return;
                    if (i === 0) astrologer.current = astrologer.que.get(id);

                    const seconds = astrologer.que.get(id).seconds - queUser.myTime;
                    astrologer.que.get(id).seconds = seconds;

                    this.io.sockets.in(id).emit("update-user-que", { type: astrologer.que.get(id).type, queNumber: i + 1, seconds: seconds || 0, astrologerId: user.astrologerId });
                    astrologer.que.get(id).queNumber = i + 1;
                });

                onlineUsers.delete(userId);
                onlineUsers.delete(socket.id);
            }, time * 1000);
        }

        if (user && user.type === constants.app_messaging.key) {
            inQueUsers.delete(socket.id);
            userActiveQue.delete(socket.id);
            onlineUsers.delete(user.id);
            onlineUsers.delete(socket.id);

            if (printLog) {
                console.log("Dissconnected::: CHAT DISASCONNECTION");
                console.log(user);
            }
            this.io.sockets.in(user.astrologerId).emit("remove-from-astrologer-que", user.id);

            const astrologer = astrologersQue[user.astrologerId];

            if (printLog) {
                console.log("===================astrologer===================");
                console.log(astrologer);
            }

            if (astrologer) {
                const queUser = astrologer.que.get(user.id);
                astrologer.que.delete(user.id);

                if (printLog) {
                    console.log("===================queUser && queData===================");
                    console.log(queUser);
                    console.log(queData);
                }

                if (queUser) {
                    const onlineAst = onlineAstrologers[astrologer.socketId];
                    const isAvailable = (astrologer?.que?.size || 0) === 0 ? true : false;
                    if (printLog) {
                        console.log("isAvailable === astrologer?.que?.size");
                        console.log(astrologer?.que?.size);
                        console.log(isAvailable);
                    }
                    this.io.sockets.in("astrologers").emit("update-online-astrologer", { _id: user.astrologerId, availableFor: [...onlineAst.availableFor], isAvailable, waitingTime: onlineAst.waitingTime - queUser.myTime });
                    onlineAst.waitingTime = onlineAst.waitingTime - queUser.myTime;
                    onlineAst.isAvailable = isAvailable;

                    const removedUserQueNumber = queUser.queNumber;

                    if (printLog) {
                        console.log("===================removedUserQueNumber===================");
                        console.log(removedUserQueNumber);
                    }

                    [...astrologer.que.keys()].forEach((id, i) => {
                        if (i < removedUserQueNumber - 1) return;
                        if (i === 0) astrologer.current = astrologer.que.get(id);

                        const seconds = astrologer.que.get(id).seconds - queUser.myTime;
                        astrologer.que.get(id).seconds = seconds;

                        this.io.sockets.in(id).emit("update-user-que", { type: astrologer.que.get(id).type, queNumber: i + 1, seconds: seconds || 0, astrologerId: user.astrologerId });
                        astrologer.que.get(id).queNumber = i + 1;
                    });
                }
            }

            if (!user.customRoomId) return;
            if (user.queNumber != 1) return;

            const meeting = await VideoSDKMeeting.findOne({ "call.customRoomId": user.customRoomId, "call.participants": 2 });
            if (!meeting) return;

            const { status, transaction } = meeting;
            if (status == "ended") return;
            if (validateID(transaction || "")) return;

            const endedAt = new Date();

            try {
                const doc = await VideoSDKMeeting.findByIdAndUpdate(meeting._id, { endedAt });

                const s = +new Date(meeting.startedAt);
                const e = +new Date(endedAt);

                const seconds = (e - s) / 1000;
                const duration = Math.floor(seconds).toString();

                this.queMoneyDeductions({ user: doc.user.toString(), astrologer: doc.astrologer.toString(), call: doc.toJSON(), seconds, duration }, "Message Money Deduction");
            } catch (err) {
                console.log("SOCKETEND: End Messaging Error");
                console.log(err);
                return;
            }
        }

        if (user && user.type === constants.app_live_stream.key) {
            if (printLog) console.log("Dissconnect app_live_stream");
            if (printLog) console.log(user);

            const astrologerId = user?.astrologerId;
            this.io.sockets.in(astrologerId).emit("remove-from-astrologer-que", user.id);
            this.io.sockets.in(`live-${astrologerId}`).emit("remove-live-from-astrologer-que", user.id);
            inQueUsers.delete(socket.id);
            userActiveQue.delete(socket.id);
            onlineUsers.delete(user.id);
            onlineUsers.delete(socket.id);

            const astrologer = astrologersQue[astrologerId];
            if (!astrologer) return;

            const current = { ...astrologer?.current };

            const queUser = astrologer.que.get(user.id);
            if (!queUser) return;

            astrologer.que.delete(user.id);
            // const queData = astrologer.que.delete(user.id);

            if (queUser.customRoomId || user.inLiveCall) {
                let waitTime = 0;
                astrologer?.que?.forEach((user) => {
                    waitTime = waitTime + (user?.seconds || 0);
                });

                this.io.sockets.in(`live-${astrologerId}`).emit("live-stream-state-change", { isBusy: false, userId: "", waitTime });

                astrologer.isBusy = false;
            }

            const removedUserQueNumber = queUser.queNumber || 0;

            [...astrologer.que.keys()].forEach((id, i) => {
                if (i < removedUserQueNumber - 1) return;
                // if ((i + 1) === 1) astrologer.current = astrologer.que.get(id);

                const seconds = astrologer.que.get(id).seconds - queUser.myTime;
                astrologer.que.get(id).seconds = seconds;

                this.io.sockets.in(id).emit("update-user-que", { type: astrologer.que.get(id).type, queNumber: i + 1, seconds: seconds || 0, astrologerId });
                astrologer.que.get(id).queNumber = i + 1;
            });

            const endedAt = new Date();

            if (printLog) {
                console.log("Dissconnect app_live_stream_que_data");
                console.log(queData);
            }

            if (queUser.customRoomId || user.inLiveCall) {
                const meeting = await VideoSDKMeeting.findOneAndUpdate({ status: { $ne: "ended" }, "call.customRoomId": queUser.customRoomId || user.customRoomId }, { status: "ended", endedAt });
                if (!meeting) return;

                const s = +new Date(meeting.startedAt);
                const e = +new Date(endedAt);

                const seconds = (e - s) / 1000;
                const duration = Math.floor(seconds).toString();

                this.queMoneyDeductions({ liveStreamCallType: queUser.liveStreamCallType || current.liveStreamCallType, liveStreamId: astrologer.liveStreamId, user: user.id || queUser.userId, astrologer: astrologerId, call: { ...meeting.toJSON() }, seconds, duration }, "app live stream money deduct");

                await User.findByIdAndUpdate(astrologerId, { $inc: { totalCallMin: Number(duration) } });

                onlineUsers.delete(socket.id);

                astrologer.current = {};
            }
        }

        if (!user) {
            const ques = inQueUsers.get(socket.id);
            if (!ques) return;
            ques.forEach((que) => {
                if (printLog) {
                    console.log("Dissconnect ---LOOP-----");
                    console.log(que);
                }

                this.io.sockets.in(que.astrologerId).emit("remove-from-astrologer-que", que.id);
                const astrologer = astrologersQue[que.astrologerId];

                if (printLog) {
                    console.log("===================astrologer===================");
                    console.log(astrologer);
                }

                if (!astrologer) return;

                const queUser = astrologer.que.get(que.id);
                if (!queUser) return;

                const removedUserQueNumber = queUser?.queNumber || que.queNumber || 1;
                astrologer.que.delete(que.id);

                if (printLog) {
                    console.log("===================removedUserQueNumber===================");
                    console.log(removedUserQueNumber);
                }

                const onlineAst = onlineAstrologers[astrologer.socketId];
                const isAvailable = astrologer?.que?.size === 0;
                if (printLog) {
                    console.log("isAvailable === astrologer?.que?.size");
                    console.log(astrologer?.que?.size);
                    console.log(isAvailable);
                }
                this.io.sockets.in("astrologers").emit("update-online-astrologer", { _id: que.astrologerId, availableFor: [...onlineAst.availableFor], isAvailable, waitingTime: onlineAst.waitingTime - queUser.myTime });
                onlineAst.waitingTime = onlineAst.waitingTime - queUser.myTime;
                onlineAst.isAvailable = isAvailable;

                [...astrologer.que.keys()].forEach((id, i) => {
                    if (i < removedUserQueNumber - 1) return;
                    if (i === 0) {
                        astrologer.current = astrologer.que.get(id);
                    }

                    const seconds = astrologer.que.get(id).seconds - que.myTime;
                    astrologer.que.get(id).seconds = seconds;

                    if (printLog) console.log(seconds);

                    this.io.sockets.in(id).emit("update-user-que", { type: astrologer.que.get(id).type, queNumber: i + 1, astrologerId: que.astrologerId, seconds: seconds || 0 });
                    astrologer.que.get(id).queNumber = i + 1;
                });
            });

            inQueUsers.delete(socket.id);
        }
    }

    async handleAstrologerDisconnect(socket) {
        let index;
        const liveAstrologer = liveAstrologers.find((user, i) => {
            index = i;
            return user.socketId === socket.id;
        });

        if (liveAstrologer) {
            if (printLog) console.log("Live Disableled");

            this.io.sockets.in("astrologers").emit("remove-astrologers-live-streams", liveAstrologer?.liveStreamId);
            this.io.sockets.in("astrologers").emit("remove-live-astrologer", { _id: liveAstrologer?._id });
            liveAstrologers.splice(index, 1);

            try {
                await VideoSDKLiveStream.findByIdAndUpdate(liveAstrologer?.liveStreamId, { status: "ended" });
            } catch (err) {
                console.error("Error: End Live Stream Socket");
                console.error(err);
            }
        }

        const onlineAstrologer = onlineAstrologers[socket.id];

        if (!onlineAstrologer) return;

        if (onlineAstrologer) {
            if (astrologersQue[onlineAstrologer?._id?.toString()]?.current?.type === constants.mobile_call.key) {
                if (printLog) console.log("Astrologer Dissconnect: Click to Call");
                const isAvailable = astrologersQue[onlineAstrologer?._id?.toString()]?.que?.size === 0;
                this.io.sockets.in("astrologers").emit("update-online-astrologer", { _id: onlineAstrologer?._id?.toString(), availableFor: [], isAvailable, waitingTime: onlineAstrologer.waitingTime });
                onlineAstrologer.isAvailable = isAvailable;
            } else {
                if (printLog) console.log("Astrologer Dissconnect: Set-Timeout ----> In Call");
                const astrologer = onlineAstrologer;

                const availableFor = [];
                const mobileCall = astrologer.availableFor.has(constants.mobile_call.key);
                if (mobileCall) availableFor.push(constants.mobile_call.key);

                // const isAvailable = astrologersQue[onlineAstrologer?._id?.toString()]?.que?.size === 0;
                // this.io.sockets.in("astrologers").emit("update-online-astrologer", { _id: astrologer._id, availableFor, isAvailable, waitingTime: astrologer.waitingTime });
                // astrologer.isAvailable = isAvailable;

                this.io.sockets.in("astrologers").emit("remove-online-astrologer", { _id: astrologer._id });

                const astroQue = astrologersQue[astrologer._id];
                if (astroQue) {
                    [...astroQue.que.keys()].forEach((id, i) => {
                        this.io.sockets.in(id).emit("remove-from-astrologer-que-force", { astrologerId: astrologer._id, astrologerName: astrologer.name });
                    });
                }

                delete onlineAstrologers[socket.id];
                delete astrologersQue[astrologer._id];

                // astrologersQue[onlineAstrologer?._id?.toString()].scheduleDelete = true;
                // scheduleDelete[astrologer._id.toString()] = setTimeout(() => {
                //     if (astrologersQue[onlineAstrologer?._id?.toString()].scheduleDelete) {
                //         if (printLog) {
                //             console.log("=====Astrologer deleted=====");
                //             console.log(astrologersQue[onlineAstrologer?._id?.toString()]);
                //         }
                //         this.io.sockets.in("astrologers").emit("remove-online-astrologer", { _id: astrologersQue[onlineAstrologer?._id?.toString()] });

                //         delete onlineAstrologers[socket.id];
                //         delete astrologersQue[onlineAstrologer?._id?.toString()];
                //     }
                // }, 60000);
            }
        }
    }

    async handleSocketDisconnect(socket) {
        /*
         * * * * * * * * * * * *
         * On User disconnect  *
         * * * * * * * * * * * *
         */
        this.handleUserDisconnect(socket);

        const user = onlineUsers.get(socket.id);
        if (user?.id) return;

        /*
         * * * * * * * * * * * * * * *
         * On Astrologer disconnect  *
         * * * * * * * * * * * * * * *
         */
        this.handleAstrologerDisconnect(socket);
    }
}

const Helper = new HelperClass();

Helper.initFirebaseApp();

module.exports = Helper;
