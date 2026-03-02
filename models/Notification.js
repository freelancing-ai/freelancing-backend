const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['bid_accepted', 'bid_rejected', 'new_message', 'system', 'milestone_submitted', 'milestone_approved', 'project_completed'], default: 'system' },
  read: { type: Boolean, default: false },
  link: { type: String }, // Optional link to navigate to
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
