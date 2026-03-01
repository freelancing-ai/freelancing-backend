const mongoose = require('mongoose');

const freelancerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skills: [{ type: String }],
  bio: { type: String },
  hourlyRate: { type: Number },
  country: { type: String },
  region: { type: String },
  education: [{
    school: String,
    degree: String,
    year: String
  }],
  experience: [{
    company: String,
    position: String,
    duration: String,
    description: String
  }],
  fraudScore: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  testScore: { type: Number, default: 0 },
  testTaken: { type: Boolean, default: false },
  category: { type: String }
});

module.exports = mongoose.model('FreelancerProfile', freelancerProfileSchema);
