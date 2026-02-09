const mongoose = require('mongoose');

const chatChannelSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    type: { type: String, enum: ['public', 'private', 'dm'], default: 'public' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    created_at: { type: Date, default: Date.now }
});

const ChatChannel = mongoose.model('ChatChannel', chatChannelSchema);

module.exports = ChatChannel;
