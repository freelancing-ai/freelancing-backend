const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Job = require('../models/Job');
const Project = require('../models/Project');
const FreelancerProfile = require('../models/FreelancerProfile');
const auth = require('../middleware/auth');

// Get Global Platform Stats
router.get('/global-stats', async (req, res) => {
  try {
    const totalFreelancers = await User.countDocuments({ role: 'freelancer' });
    const totalJobs = await Job.countDocuments({});
    const completedProjectsCount = await Project.countDocuments({ completionStatus: 'completed' });
    const allProjectsCount = await Project.countDocuments({});
    
    // Calculate matching accuracy based on completion rate
    const matchingAccuracy = allProjectsCount > 0
      ? ((completedProjectsCount / allProjectsCount) * 100).toFixed(1)
      : 98.5;

    // Aggregate top skills
    const profiles = await FreelancerProfile.find({}, 'skills');
    const skillCounts = {};
    profiles.forEach(p => {
      p.skills.forEach(s => {
        skillCounts[s] = (skillCounts[s] || 0) + 1;
      });
    });

    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    res.json({
      totalFreelancers,
      totalJobs,
      totalProjects: completedProjectsCount,
      matchingAccuracy,
      topSkills
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get My Stats (For Freelancers)
router.get('/my-stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'freelancer') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const projects = await Project.find({ freelancerId: req.user._id })
            .populate('jobId', 'budget');

        const completedProjects = projects.filter(p => p.completionStatus === 'completed');
        const earnings = completedProjects.reduce((sum, p) => sum + (p.jobId?.budget || 0), 0);
        
        const successRate = projects.length > 0 
            ? Math.round((completedProjects.length / projects.length) * 100) 
            : 100;

        res.json({
            earnings,
            completedCount: completedProjects.length,
            successRate
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
