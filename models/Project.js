const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  completionStatus: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  clientRating: { type: Number, min: 1, max: 10 },
  clientReview: { type: String },
  deliveryTime: { type: String }, // e.g., "on-time", "delayed"
  onTimeBonus: { type: Boolean, default: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  milestonePayments: {
    kickoff: { paid: { type: Boolean, default: false }, amount: Number, orderId: String, paymentId: String },
    core: { paid: { type: Boolean, default: false }, amount: Number, orderId: String, paymentId: String },
    final: { paid: { type: Boolean, default: false }, amount: Number, orderId: String, paymentId: String }
  },
  milestones: [{
    title: String,
    description: String,
    status: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected'], default: 'pending' },
    submissionNote: String,
    submissionLink: String,
    feedback: String
  }],
  progressPercentage: { type: Number, default: 0 }
});

module.exports = mongoose.model('Project', projectSchema);
