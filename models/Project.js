const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  completionStatus: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  progressPercentage: { type: Number, default: 0 },
  milestones: [{
    title: { type: String, required: true },
    description: String,
    status: { type: String, enum: ['pending', 'submitted', 'approved'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    submittedAt: Date,
    approvedAt: Date,
    submissionNote: String,
    submissionLink: String,
    feedback: String
  }],
  clientRating: { type: Number, min: 1, max: 10 },
  clientReview: { type: String },
  deliveryTime: { type: String }, // e.g., "on-time", "delayed"
  onTimeBonus: { type: Boolean, default: true },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String }
});

module.exports = mongoose.model('Project', projectSchema);
