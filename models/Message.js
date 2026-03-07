const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        trim: true,
        default: ''
    },
    fileUrl: {
        type: String,
        default: null
    },
    fileType: {
        type: String, // 'image' | 'file'
        default: null
    },
    fileName: {
        type: String,
        default: null
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Helper to generate a deterministic conversationId from two user IDs
messageSchema.statics.getConversationId = function (userId1, userId2) {
    return [userId1.toString(), userId2.toString()].sort().join('_');
};

module.exports = mongoose.model('Message', messageSchema);
