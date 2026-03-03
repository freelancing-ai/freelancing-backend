const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  budget: { type: Number, required: true },
  deadline: { type: Date, required: true },
  requiredSkills: [{ type: String }],
  jobType: { type: String, enum: ['quick_task', 'mid_level_task', 'advanced_task'], default: 'quick_task' },
  status: { type: String, enum: ['open', 'in-progress', 'completed', 'closed', 'under-review'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);
