const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const teamSchema = new Schema({
    name: { type: String, required: true },
    leader: { type: Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    disbanded: { type: Boolean, default: false },
    creationDate: { type: Date },
    disbandedDate: { type: Date },
    forum: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum' }
});

teamSchema.pre('save', function(next) {
    if (!this.creationDate) {
        // Get current date
        const currentDate = new Date();
        
        // Set time part to midnight
        currentDate.setHours(0, 0, 0, 0);
        
        // Set creationDate
        this.creationDate = currentDate;
    }
    next();
});

module.exports = mongoose.model('Team', teamSchema);