const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  completionStatus: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  clientRating: { type: Number, min: 1, max: 5 },
  deliveryTime: { type: String }, // e.g., "on-time", "delayed"
  onTimeBonus: { type: Boolean, default: true }
});

module.exports = mongoose.model('Project', projectSchema);
