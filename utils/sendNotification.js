const ScheduledNotification = require("../models/scheduledNotification.model");
const User = require("../models/users.model");
const Helper = require("./helper");

const messaging = Helper.getFirbaseMessaging;

module.exports = async (data) => {
	try {
		if (!data) return;
		if (!data.astrologerId) return;

		const notifications = await ScheduledNotification.find({ astrologer: data.astrologerId }).lean();
		if (notifications.length === 0) return;

		const userIds = notifications.map(ele => ele.user);

		const users = await User.find({ _id: { $in: userIds }, 'deleted.trash': false }).select('deviceToken').lean();
		if (users.length === 0) return;

		const astrologer = await User.findOne({ _id: data.astrologerId }).lean();

		let tokens = [];
		users?.forEach(data => {
			if (data.deviceToken && data.deviceToken != "") tokens.push(data.deviceToken);
		});

		if (tokens.length === 0) return;

		tokens = [...new Set(tokens)];

		const notifyMulti = {
			tokens,
			notification: {
				title: `${astrologer.name || "Astrologer"} is awailable`,
				body: "Astrologer is awailable to take calls"
			},
			data: {
				click_action: 'BELL_NOTIFICATION',
				astrologerId: data.astrologerId
			}
		};

		// const firebseResponse = await messaging.sendMulticast(notifyMulti);
		// console.log(firebseResponse.responses);
		await messaging.sendMulticast(notifyMulti);

		await ScheduledNotification.deleteMany({ user: { $in: userIds }, astrologer: data.astrologerId });

	} catch (err) {
		if (printLog) console.log(err);
	}
}