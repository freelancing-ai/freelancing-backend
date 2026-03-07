const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Bid = require('../models/Bid');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const Project = require('../models/Project');

// Place a bid
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can place bids' });
    }

    const { jobId, amount, proposal, deliveryInDays } = req.body;

    // Check if job exists and is open
    const job = await Job.findById(jobId);
    if (!job || job.status !== 'open') {
      return res.status(400).json({ message: 'Job is not open for bidding' });
    }

    // Check if already bid
    const existingBid = await Bid.findOne({ jobId, freelancerId: req.user._id });
    if (existingBid) {
      return res.status(400).json({ message: 'You have already placed a bid on this job' });
    }

    const bid = await Bid.create({
      jobId,
      freelancerId: req.user._id,
      amount,
      proposal,
      deliveryInDays
    });

    // Notify the company
    await Notification.create({
      userId: job.companyId,
      title: 'New Bid Received',
      message: `A new bid of ${amount} has been placed on your job "${job.title}".`,
      type: 'system',
      link: `/dashboard#applications`
    });

    res.status(201).json(bid);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get bids for a specific job (Client only)
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Only the job creator can see all bids
    if (job.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const bids = await Bid.find({ jobId: req.params.jobId })
      .populate('freelancerId', ['name', 'trustScore', 'globalRating', 'profileImage'])
      .sort({ createdAt: -1 });

    res.json(bids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all applications for a company's jobs
router.get('/my-applications', auth, async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can view applications' });
    }

    // Find all jobs by this company
    const myJobs = await Job.find({ companyId: req.user._id });
    const jobIds = myJobs.map(j => j._id);

    // Find all bids for these jobs
    const bids = await Bid.find({ jobId: { $in: jobIds } })
      .populate('freelancerId', ['name', 'trustScore', 'globalRating', 'profileImage'])
      .populate('jobId', ['title', 'budget'])
      .sort({ createdAt: -1 });

    res.json(bids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get freelancer's own bids (Application Tracking)
router.get('/my-bids', auth, async (req, res) => {
  try {
    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can view their bids' });
    }

    const bids = await Bid.find({ freelancerId: req.user._id })
      .populate({
        path: 'jobId',
        populate: { path: 'companyId', select: 'name' }
      })
      .sort({ createdAt: -1 });

    // For accepted bids, fetch the associated Project ID
    const bidsWithProject = await Promise.all(bids.map(async (bid) => {
      const bidObj = bid.toObject();
      if (bid.status === 'accepted') {
        const project = await Project.findOne({ jobId: bid.jobId._id, freelancerId: req.user._id });
        bidObj.projectId = project?._id;
      }
      return bidObj;
    }));

    res.json(bidsWithProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accept a bid
router.put('/:bidId/accept', auth, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.bidId).populate('jobId');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    if (bid.jobId.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    bid.status = 'accepted';
    await bid.save();

    // Close the job
    await Job.findByIdAndUpdate(bid.jobId._id, { status: 'in-progress' });

    // Create a Project entry for tracking
    const project = await Project.create({
      jobId: bid.jobId._id,
      freelancerId: bid.freelancerId,
      completionStatus: 'in-progress',
      milestones: [
        { title: 'Project Initialization', description: 'Setup environment and initial architecture', status: 'pending' },
        { title: 'Core Implementation', description: 'Development of primary features', status: 'pending' },
        { title: 'Final Delivery', description: 'Testing, refinement, and final hand-off', status: 'pending' }
      ],
      progressPercentage: 0
    });

    bid.projectId = project._id;
    await bid.save();

    // Create notification for accepted freelancer
    await Notification.create({
      userId: bid.freelancerId,
      title: 'Bid Accepted!',
      message: `Your bid for "${bid.jobId.title}" has been accepted.`,
      type: 'bid_accepted',
      link: `/project/${project._id}`
    });

    // Reject all other bids and notify them
    const otherBids = await Bid.find({ jobId: bid.jobId._id, _id: { $ne: bid._id } });

    for (const otherBid of otherBids) {
      otherBid.status = 'rejected';
      await otherBid.save();

      await Notification.create({
        userId: otherBid.freelancerId,
        title: 'Application Update',
        message: `Your application for "${bid.jobId.title}" was not selected this time.`,
        type: 'bid_rejected'
      });
    }

    res.json({ message: 'Bid accepted', bid });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject a bid
router.put('/:bidId/reject', auth, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.bidId).populate('jobId');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    if (bid.jobId.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    bid.status = 'rejected';
    await bid.save();

    // Create notification
    await Notification.create({
      userId: bid.freelancerId,
      title: 'Application Update',
      message: `Your application for "${bid.jobId.title}" was not selected this time.`,
      type: 'bid_rejected'
    });

    res.json({ message: 'Bid rejected', bid });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



module.exports = router;
