const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const Bid = require('../models/Bid');

// Create a job
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can post jobs' });
    }

    const { title, description, budget, deadline, requiredSkills } = req.body;
    const job = await Job.create({
      companyId: req.user._id,
      title,
      description,
      budget,
      deadline,
      requiredSkills
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all open jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'open' }).populate('companyId', 'name');

    // Add bid count to each job
    const jobsWithBids = await Promise.all(jobs.map(async (job) => {
      const bidCount = await Bid.countDocuments({ jobId: job._id });
      return { ...job._doc, bidCount };
    }));

    res.json(jobsWithBids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's own jobs (Company dashboard)
router.get('/my-jobs', auth, async (req, res) => {
  try {
    const jobs = await Job.find({ companyId: req.user._id })
      .populate('companyId', 'name')
      .sort({ createdAt: -1 });

    const jobsWithBids = await Promise.all(jobs.map(async (job) => {
      const bidCount = await Bid.countDocuments({ jobId: job._id });
      return { ...job._doc, bidCount };
    }));

    res.json(jobsWithBids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('companyId', ['name', 'email', 'createdAt']);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const bidCount = await Bid.countDocuments({ jobId: job._id });
    const totalJobsPosted = await Job.countDocuments({ companyId: job.companyId._id });

    res.json({ ...job._doc, bidCount, totalJobsPosted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
