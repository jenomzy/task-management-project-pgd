var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var forumSchema = new Schema({
  forumname: String,
  message: [{
    text: String,
    time: { type: Date, default: Date.now},
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User'}
  }],
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  isGeneralForum: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
});

var Forum = mongoose.model('Forum', forumSchema);

module.exports = Forum;