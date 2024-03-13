var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tasksSchema = new Schema({
    taskName: { 
        type: String,
        required: true},
    description: { 
        type: String,
        required: true},
    status: { 
        type: String, enum: ['ongoing', 'completed'], default: 'ongoing',
        required: true},
    priority: { 
        type: String,
        required: true},
    dueDate: { 
        type: Date,
        required: true},
    date:{
        type: Date
    },
    team: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    files: [{ 
        fileName: String,
        filePath: String,
        note: String,
        uploadedBy: { 
            type: Schema.Types.ObjectId, 
            ref: 'User'
        }
    }]
});

var Task = mongoose.model('Task', tasksSchema);
module.exports = Task;