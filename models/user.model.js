var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const generateStaffId = () => {
    const prefix = 'CST';
    const length = 4;
    const characters = '123456789';
    let randomPart = '';
    for (let i = 0; i < length; i++) {
        randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return prefix + randomPart;
};

var UserSchema = new Schema({
    staffId: { type: String, default: generateStaffId, unique: true },
    fname: {type: String, required: true},
    lname: {type: String, required: true},
    username:{
        type: String,
        unique: true,
        required: true
    },
    position: {type: String, enum: ['Team Leader', 'Team Member', 'Manager'], required: true},
    password: {type: String, required: true},
    phone: {type: String, required: true},
    forum: [{ type: Schema.Types.ObjectId, ref: 'Forum' }],
    ongoingTasksCount: { type: Number, default: 0 },
    completedTasksCount: { type: Number, default: 0 },
    team: [{ type: Schema.Types.ObjectId, ref: 'Team' }]
});

var User = mongoose.model('User', UserSchema);
module.exports = User;