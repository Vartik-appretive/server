const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const slotSchema = new Schema({
	from: {
		type: String,
		required: true,
	},
	to: {
		type: String,
		required: true,
	},
	booked: {
		type: Boolean,
		required: true,
		default: false
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'user'
	}
});

const poojaSlotsSchema = new Schema({
	pooja: {
		type: String,
		// type: Schema.Types.ObjectId,
		// ref: 'pooja',
		default: ''
	},
	date: {
		type: Date,
		required: true
	},
	slots: {
		type: [slotSchema],
        required: true
	},
	deleted: {
		type: Object,
		default: { trash: false },
		select: false
	}
}, { timestamps: true });

const PoojaSlots = mongoose.model('poojaslots', poojaSlotsSchema);

module.exports = PoojaSlots;