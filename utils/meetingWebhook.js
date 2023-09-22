/**
 * @note
 * @note
 * @note
 * This file is not use in anymore.
 * Avoid looking into it.
 */


// const VideoSDKMeetingV1 = require("../models/v1.meeting.model");
const VideoSDKMeeting = require("../models/meeting.model");
const Wallet = require("../models/wallet.model");

class MeetingWebhook {
	wbhType = '';
	meetingStart = '';
	meetingEnd = '';
	data = {};

	constructor(type, data = {}, time = new Date(), user) {
		this.wbhType = type;
		this.data = data;
		this.time = time;
		this.user = user;
	}

	get getWbhType() {
		return this.wbhType;
	}

	/**
	 * @param {string} value
	 */
	set setWbhType(value) {
		this.wbhType = value;
	}

	get meetingStartTime() {
		return this.meetingStart;
	}

	/**
	 * @param {string} value
	 */
	set meetingStartTime(value) {
		this.meetingStart = value;
	}

	get meetingEndTime() {
		return this.meetingEnd;
	}

	/**
	 * @param {string} value
	 */
	set meetingEndTime(value) {
		this.meetingEnd = value;
	}

	async onParticipantJoined(id) {
		await VideoSDKMeeting.findByAndUpdate(id, { startedAt: this.time, status: 'ongoing' });
	}

	async onParticipantLeft(id, duration) {
		await VideoSDKMeeting.findByAndUpdate(id, { endedAt: this.time, status: 'ended', duration });
	}

	async deductMoneyFromWallet(userId, balance) {
		await Wallet.findOneAndUpdate({ user: userId }, { balance: Number(balance) });
	}

}

module.exports = MeetingWebhook;