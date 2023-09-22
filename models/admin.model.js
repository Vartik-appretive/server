const bcrypt = require('bcrypt');
const validator = require('validator');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const adminSchema = new Schema({
	email: {
		type: String,
		unique: true,
		required: [true, 'email is required'],
		validate: {
			validator: function (email) {
				return validator.isEmail(email);
			},
			message: prop => `Not a valid email: ${prop.value}`
		}
	},
	password: {
		type: String,
		select: false,
		required: true
	},
	role: {
		type: String,
		required: [true, 'role is required'],
		enum: {
			values: ['administrator'],
			message: "{VALUE} is not supported. role must be from these values 'pandit', 'jyotish' or 'yajman'."
		},
		index: true
	},
	name: {
		type: String
	}
}, {timestamps: true});

adminSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();

	if(this.password){
		this.password = await bcrypt.hash(this.password, 12);
	}
	next();
});

const Admin = mongoose.model('admin', adminSchema);


module.exports = Admin;