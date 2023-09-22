const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const liveStreamSchema = new Schema(
    {
        status: {
            type: String,
            required: true,
            enum: ["pending", "ongoing", "ended"],
            default: "pending",
        },
        topic: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        liveStreamingDate: {
            type: Date,
        },
        liveStreamingTime: {
            type: String,
        },
        streaming: {
            id: {
                type: String,
                default: "",
            },
            roomId: {
                type: String,
                index: true,
                default: "",
            },
            customRoomId: {
                type: String,
                index: true,
                default: "",
            },
            sessionId: {
                type: String,
                default: "",
            },
            token: {
                type: String,
                default: "",
            },
        },
        user: {
            type: mongoose.Types.ObjectId,
            required: true,
            index: true,
            ref: "user",
        },
    },
    { timestamps: true }
);

const VideoSDKLiveStream = mongoose.model("livestream", liveStreamSchema);

module.exports = VideoSDKLiveStream;
