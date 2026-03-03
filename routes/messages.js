const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { cloudinary } = require('../middleware/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Multer storage for message attachments (images + raw files)
const msgStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: 'nexurah_messages',
        resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'zip'],
        public_id: `msg_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`
    })
});
const uploadMsg = multer({ storage: msgStorage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// POST /api/messages/upload — upload a file attachment
router.post('/upload', auth, uploadMsg.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const isImage = req.file.mimetype.startsWith('image/');
        res.json({
            url: req.file.path,
            type: isImage ? 'image' : 'file',
            name: req.file.originalname
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/messages/conversations — list all unique conversations for current user
router.get('/conversations', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all messages where this user is sender or receiver
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        })
            .sort({ createdAt: -1 })
            .populate('sender', 'name profileImage role')
            .populate('receiver', 'name profileImage role');

        // Build unique conversations (latest message per pair)
        const convMap = {};
        for (const msg of messages) {
            const otherId = msg.sender._id.toString() === userId.toString()
                ? msg.receiver._id.toString()
                : msg.sender._id.toString();
            if (!convMap[otherId]) {
                convMap[otherId] = {
                    conversationId: msg.conversationId,
                    other: msg.sender._id.toString() === userId.toString() ? msg.receiver : msg.sender,
                    lastMessage: msg,
                    unreadCount: 0
                };
            }
        }

        // Count unread messages per conversation
        const unreadCounts = await Message.aggregate([
            { $match: { receiver: userId, read: false } },
            { $group: { _id: '$conversationId', count: { $sum: 1 } } }
        ]);
        for (const uc of unreadCounts) {
            const conv = Object.values(convMap).find(c => c.conversationId === uc._id);
            if (conv) conv.unreadCount = uc.count;
        }

        res.json(Object.values(convMap));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/messages/:userId — get full chat history with a specific user
router.get('/:userId', auth, async (req, res) => {
    try {
        const myId = req.user._id;
        const otherId = req.params.userId;
        const conversationId = Message.getConversationId(myId, otherId);

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .populate('sender', 'name profileImage');

        // Mark all as read
        await Message.updateMany(
            { conversationId, receiver: myId, read: false },
            { read: true }
        );

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/messages/unread/count — total unread message count for badge
router.get('/unread/count', auth, async (req, res) => {
    try {
        const count = await Message.countDocuments({ receiver: req.user._id, read: false });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
