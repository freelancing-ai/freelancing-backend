const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  budget: { type: Number, required: true },
  deadline: { type: Date, required: true },
  requiredSkills: [{ type: String }],
  status: { type: String, enum: ['open', 'in-progress', 'completed', 'closed', 'under-review'], default: 'open' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  razorpay_payment_id: { type: String },
  razorpay_order_id: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);
