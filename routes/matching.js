const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');

// Smart Matching Engine
router.get('/:jobId', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const freelancers = await FreelancerProfile.find().populate('userId', ['name', 'trustScore', 'globalRating']);
    
    const rankedFreelancers = freelancers.map(profile => {
      // 1. Content Score (Skill matching)
      const matchedSkills = job.requiredSkills.filter(skill => 
        profile.skills.some(fSkill => fSkill.toLowerCase() === skill.toLowerCase())
      );
      const contentScore = job.requiredSkills.length > 0 
        ? (matchedSkills.length / job.requiredSkills.length) * 100 
        : 0;

      // 2. Collaborative Score
      // Scale rating (1-5) to 0-100
      const scaledRating = profile.userId.globalRating * 20;
      const collabScore = (profile.userId.trustScore * 0.4) + (scaledRating * 0.6);

      // 3. Final Ranking Score
      const finalScore = (contentScore * 0.6) + (collabScore * 0.4);

      return {
        profileId: profile._id,
        name: profile.userId.name,
        skills: profile.skills,
        trustScore: profile.userId.trustScore,
        globalRating: profile.userId.globalRating,
        contentScore: Math.round(contentScore),
        collabScore: Math.round(collabScore),
        finalScore: Math.round(finalScore)
      };
    });

    // Sort by finalScore descending
    rankedFreelancers.sort((a, b) => b.finalScore - a.finalScore);

    res.json(rankedFreelancers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
