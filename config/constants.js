const constants = {
	success: "TXN_SUCCESS",
	fail: "TXN_FAILURE",
	pending: "PENDING",
	notFound: "NO_RECORD_FOUND",
	app_voice_call: {
		key: "app_voice_call",
		value: "Voice call"
	},
	app_video_call: {
		key: "app_video_call",
		value: "Video call"
	},
	mobile_call: {
		key: "mobile_call",
		value: "Mobile call"
	},
	app_messaging: {
		key: "app_messaging",
		value: "Messaging"
	},
	app_live_stream: {
		key: "app_live_stream",
		value: "Live Stream"
	},
	sos_call: {
		key: "sos_call",
		value: "Emergency Call"
	},
	free_mins: {
		key: "free_mins",
		value: "Free Minutes"
	},
	low_charges: {
		key: "low_charges",
		value: "Low Charges"
	},
	limited_low_charges: {
		key: "limited_low_charges",
		value: "Limited Low Charges"
	},
	gift: {
		key: "gift",
        value: "Gift"
	},
	wallet: "Wallet",
	pooja: "Pooja Order",
	bonus: "Bonus",
	referred: "Referred",
	anonymous: "Unknown",
	getAllCallType: function () {
		return [this.app_voice_call.key, this.app_video_call.key, this.mobile_call.key, this.app_messaging.key, this.gift.key, this.app_live_stream.key]
	}
}

module.exports = constants;