const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Job = require('../models/Job');

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
    res.json(jobs);
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
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
