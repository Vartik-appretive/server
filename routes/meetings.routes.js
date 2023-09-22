const { getVideoSDKtokenAndMeetingId, validateRoom, validateVideoSDKToken, callsWebhooks, addLiveStreaming, getRoomForLiveStreaming, getLiveStreamingForAstrologer, getLiveSteamingForUser, notifyOnLiveStream, endLiveStream, removeLiveStreaming, offlineCallWebhook, createClicktoCall, generateSOSCall, handleSOSCall, shortUrl, getLivetreamTransactions } = require("../controllers/meetings.controller");
const { UserAuthCheck, RestrictTo } = require("../middleware/auth.middleware");
const { checkWallet } = require("../middleware/wallet.middleware");

const router = require("express").Router();

router
	.route('/token-room')
	.post(UserAuthCheck, checkWallet, getVideoSDKtokenAndMeetingId);

router
	.route('/add-live-streaming')
	.post(UserAuthCheck, RestrictTo('astrologer'), addLiveStreaming);

router
	.route('/get-live-streaming-room')
	.post(UserAuthCheck, getRoomForLiveStreaming);

router
	.route('/remove-live-streaming/:id')
	.delete(UserAuthCheck, RestrictTo('astrologer'), removeLiveStreaming);

// router
// 	.route('/start-live-streaming')
// 	.post(UserAuthCheck, startHLS);

router
	.route('/create-click-to-call')
	.post(UserAuthCheck, RestrictTo('user'), checkWallet, createClicktoCall);

router
	.route('/end-live-streaming')
	.post(UserAuthCheck, endLiveStream);

router
	.route('/get-live-streaming-by-astrologer')
	.get(UserAuthCheck, getLiveStreamingForAstrologer);

router
	.route('/get-live-streaming-for-users')
	.get(UserAuthCheck, getLiveSteamingForUser);

	router
	.route('/get-live-streaming-transactions')
	.get(UserAuthCheck, getLivetreamTransactions);

router
	.route('/validate-room/:id')
	.get(UserAuthCheck, validateRoom);

router
	.route('/validate-room-token')
	.post(validateVideoSDKToken);

router
	.route('/notify-live-streaming')
	.post(UserAuthCheck, notifyOnLiveStream);

router
	.route('/sos')
	.post(UserAuthCheck, RestrictTo('user'), generateSOSCall);

router
    .route('/generate-sos-click-to-call')
    .get(handleSOSCall);

// router
// 	.route('/get-live-astrologer')
// 	.get(UserAuthCheck, getLiveAstrologer);

router
	.route('/webhooks-rooms-calls')
	.post(callsWebhooks);

router
	.route('/webhooks-rooms-streaming')
	.post(callsWebhooks);

router
	.route('/click-to-call')
	.get(offlineCallWebhook);

router
	.route('/short-url')
	.get(shortUrl);

module.exports = router;