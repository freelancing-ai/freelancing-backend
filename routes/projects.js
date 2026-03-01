const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');
const Job = require('../models/Job');

// Create a project (Hire a freelancer)
router.post('/', auth, async (req, res) => {
  try {
    const { jobId, freelancerId } = req.body;
    const project = await Project.create({
      jobId,
      freelancerId,
      completionStatus: 'in-progress'
    });
    
    // Also update the job status
    await Job.findByIdAndUpdate(jobId, { status: 'in-progress' });
    
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete project and update ratings
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const { clientRating, deliveryTime } = req.body; // deliveryTime: 'on-time' or 'delayed'
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    project.completionStatus = 'completed';
    project.clientRating = clientRating;
    project.deliveryTime = deliveryTime;
    project.endDate = Date.now();
    await project.save();

    // Update Freelancer Trust Score and Global Rating
    const freelancer = await User.findById(project.freelancerId);
    
    // Global Rating Update (Simple average-like update)
    const oldRating = freelancer.globalRating || 0;
    freelancer.globalRating = (oldRating === 0) ? clientRating : (oldRating * 0.8) + (clientRating * 0.2);

    // Trust Score Calculation
    const clientRatingScore = clientRating * 20;
    const onTimeScore = (deliveryTime === 'on-time') ? 100 : 40;
    const previousTrustScore = freelancer.trustScore || 50;
    
    freelancer.trustScore = Math.min(100, Math.round(
      (previousTrustScore * 0.7) + 
      (clientRatingScore * 0.2) + 
      (onTimeScore * 0.1)
    ));

    await freelancer.save();

    // Also update the job status to completed
    await Job.findByIdAndUpdate(project.jobId, { status: 'completed' });

    res.json({ project, newTrustScore: freelancer.trustScore, newGlobalRating: freelancer.globalRating });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get projects for current user
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'freelancer') {
      query = { freelancerId: req.user._id };
    } else {
      // For companies, we need to find projects where the jobId belongs to them
      const myJobs = await Job.find({ companyId: req.user._id }).select('_id');
      const myJobIds = myJobs.map(j => j._id);
      query = { jobId: { $in: myJobIds } };
    }

    const projects = await Project.find(query)
      .populate('jobId')
      .populate('freelancerId', ['name', 'profileImage', 'trustScore', 'globalRating'])
      .sort({ startDate: -1 });
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
