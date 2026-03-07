const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const jobRoutes = require('./routes/jobs');
const matchingRoutes = require('./routes/matching');
const projectRoutes = require('./routes/projects');
const bidRoutes = require('./routes/bids');
const testRoutes = require('./routes/test');
const notificationRoutes = require('./routes/notifications');
const statsRoutes = require('./routes/stats');
const paymentRoutes = require('./routes/payments');
const messageRoutes = require('./routes/messages');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/test', testRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.send('Nexurah API is running...');
});

// ─────────────────────────────────────────────
// Socket.IO Real-time Chat
// ─────────────────────────────────────────────
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Authenticate socket with JWT
  socket.on('auth', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_for_production');
      const user = await User.findById(decoded.id).select('name profileImage role');
      if (!user) return;

      socket.userId = user._id.toString();
      socket.userData = user;
      onlineUsers.set(socket.userId, socket.id);

      // Join a personal room so we can emit to them directly
      socket.join(socket.userId);
      console.log(`User authenticated: ${user.name} (${socket.userId})`);

      // Broadcast updated online users list
      io.emit('online_users', [...onlineUsers.keys()]);
    } catch (err) {
      console.log('Socket auth error:', err.message);
    }
  });

  // Send a message
  socket.on('send_message', async ({ receiverId, text, fileUrl, fileType, fileName }) => {
    if (!socket.userId || !receiverId) return;
    if (!text?.trim() && !fileUrl) return; // must have at least text or file

    try {
      const conversationId = Message.getConversationId(socket.userId, receiverId);
      const message = await Message.create({
        conversationId,
        sender: socket.userId,
        receiver: receiverId,
        text: text?.trim() || '',
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        fileName: fileName || null
      });

      const populated = await message.populate('sender', 'name profileImage');

      // Emit to sender (own room) and receiver (their room)
      io.to(socket.userId).emit('receive_message', populated);
      io.to(receiverId).emit('receive_message', populated);

      // Notify receiver if they're not in the same conversation
      io.to(receiverId).emit('new_message_notification', {
        from: socket.userData,
        text: text?.trim() || (fileType === 'image' ? '📷 Image' : '📎 File'),
        conversationId
      });
    } catch (err) {
      console.error('send_message error:', err.message);
    }
  });

  // Typing indicators
  socket.on('typing', ({ receiverId }) => {
    if (!socket.userId) return;
    io.to(receiverId).emit('user_typing', { senderId: socket.userId });
  });

  socket.on('stop_typing', ({ receiverId }) => {
    if (!socket.userId) return;
    io.to(receiverId).emit('user_stop_typing', { senderId: socket.userId });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('online_users', [...onlineUsers.keys()]);
      console.log(`User disconnected: ${socket.userId}`);
    }
  });
});

// Export the app for Vercel (note: Vercel doesn't support WebSockets, use server locally)
module.exports = app;

// Start Server
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} with Socket.IO`);
  });
}
