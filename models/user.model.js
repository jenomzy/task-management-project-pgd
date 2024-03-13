var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

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

// Define a method for user creation
UserSchema.statics.createUser = async function(userDetails) {
    try {
        // Check if a user with the given username already exists
        const existingUser = await this.findOne({ username: userDetails.username });
        if (existingUser) {
            throw new Error('User with this username already exists');
        }
        
        // Create and save the new user
        const user = new this(userDetails);
        return await user.save();
    } catch (error) {
        throw error;
    }
};

var User = mongoose.model('User', UserSchema);

// Define userDetails
const password = '12345';
const userDetails = {
    fname: 'Jenom',
    lname: 'Gimba',
    username: 'jenomzy25@gmail.com',
    position: 'Manager',
    phone: '09024037464',
    password: bcrypt.hashSync(password, bcrypt.genSaltSync(10))
};

// Create a new user using the createUser method
User.createUser(userDetails)
    .then(newUser => {
        console.log('User created successfully:', newUser);
    })
    .catch(error => {
        console.error('Error creating user:', error);
    });

module.exports = User;