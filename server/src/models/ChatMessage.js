const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    channel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatChannel', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    file_url: { type: String },
    file_name: { type: String },
    file_type: { type: String },
    reactions: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String }
    }],
    created_at: { type: Date, default: Date.now }
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;
