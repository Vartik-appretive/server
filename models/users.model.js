const bcrypt = require("bcrypt");
const validator = require("validator");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// const expertiseSkillsAndLangSchema = new Schema({
// 	title: {
// 		type: String,
// 		lowercase: true
// 	},
// 	icon: {
// 		type: String,
// 		default: ''
// 	}
// });

const userSchema = new Schema(
    {
        passed: {
            type: Number,
            default: 0,
            enum: [-1, 0, 1],
        },
        status: {
            type: String,
            default: "available",
            enum: ["available", "not-available"],
        },
        name: {
            type: String,
            required: [true, "name is required"],
        },
        profilePhoto: {
            type: String,
            default: "",
        },
        bio: {
            type: String,
            default: "",
        },
        address: {
            type: String,
            default: "",
        },
        gender: {
            type: String,
            // required: [true, 'gender is required'],
            default: "",
            lowercase: true,
        },
        email: {
            type: String,
            unique: true,
            lowercase: true,
            required: [true, "email is required."],
            validate: {
                validator: function (email) {
                    return validator.isEmail(email);
                },
                message: (prop) => `Not a valid email: ${prop.value}`,
            },
        },
        mobile: {
            type: String,
            required: [true, "mobile is required"],
            unique: true,
        },
        dateOfBirth: {
            type: String,
            default: "",
        },
        placeOfBirth: {
            type: String,
            lowercase: true,
            default: "",
        },
        timeOfBirth: {
            type: String,
            default: "",
        },
        city: {
            type: String,
            // required: [true, 'city is required'],
            default: "",
            lowercase: true,
        },
        role: {
            type: String,
            required: [true, "role is required"],
            default: "user",
            enum: {
                values: ["astrologer", "user"],
                message: "{VALUE} is not supported. role must be from these values 'astrologer' or 'user'.",
            },
        },
        walletId: {
            type: String,
            required: true,
            unique: true,
        },
        Campaign_id: {
            type: String,
            default: "",
        },
        deviceToken: {
            type: String,
            default: "",
        },
        isLegitDevice: {
            type: Boolean,
            required: true,
            default: true,
            select: false,
        },
        compileId: {
            type: String,
            default: "",
        },
        charges: {
            app_video_call: {
                type: Number,
                default: 0,
            },
            app_voice_call: {
                type: Number,
                default: 0,
            },
            mobile_call: {
                type: Number,
                default: 0,
            },
            app_messaging: {
                type: Number,
                default: 0,
            },
            sos_call: {
                type: Number,
                default: 0,
            },
        },
        plateformCharges: {
            type: Number,
            select: false,
        },
        offers: {
            offer: {
                type: mongoose.Types.ObjectId,
                ref: "astrologeroffers",
            },
            value: {
                type: String,
                default: "",
            },
            // type: [{ type: mongoose.Types.ObjectId, ref: 'astrologeroffers' }],
        },
        hasSos: {
            type: Boolean,
            default: false,
        },
        verified: {
            type: Boolean,
            required: true,
            default: false,
        },
        specialized: {
            type: Boolean,
            required: true,
            default: false,
        },
        recommended: {
            type: Boolean,
            required: true,
            default: false,
        },
        experience: {
            type: Number,
            default: 0,
        },
        totalChatMin: {
            type: Number,
            default: 0,
        },
        totalCallMin: {
            type: Number,
            default: 0,
        },
        likes: {
            type: Number,
            default: 0,
            min: 0,
        },
        followers: {
            type: Number,
            default: 0,
            min: 0,
        },
        prizes: {
            type: Number,
            default: 0,
        },
        favourite: {
            type: Number,
            default: 0,
        },
        rating: {
            value: {
                type: Number,
                default: 0,
            },
            counts: {
                type: Number,
                default: 0,
                select: false,
            },
        },
        availableFor: {
            type: [String],
        },
        expertise: {
            type: [mongoose.Types.ObjectId],
            default: [],
            ref: "filter",
            index: true,
        },
        languages: {
            type: [mongoose.Types.ObjectId],
            default: [],
            ref: "filter",
            index: true,
        },
        skillset: {
            type: [mongoose.Types.ObjectId],
            default: [],
            ref: "filter",
            index: true,
        },
        gallery: {
            type: [String],
            default: [],
        },
        deleted: {
            type: Object,
            default: { trash: false },
            select: false,
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    if (this.password) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

userSchema.pre("save", async function (next) {
    if (this.role !== "astrologer") {
        this.availableFor = undefined;
        return next();
    }

    if (!this.followers) this.followers = 0;
    this.availableFor = [];

    next();
});

userSchema.statics.findUser = function (data = {}, projection) {
    return this.findOne({ ...data, "deleted.trash": false }, projection);
};

userSchema.statics.findUsers = function (data) {
    return this.find({ ...data, "deleted.trash": false });
};

const User = mongoose.model("user", userSchema);

module.exports = User;
