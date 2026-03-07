const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const FreelancerProfile = require('../models/FreelancerProfile');

// Create a project (Hire a freelancer)
router.post('/', auth, async (req, res) => {
  try {
    const { jobId, freelancerId } = req.body;
    const project = await Project.create({
      jobId,
      freelancerId,
      completionStatus: 'in-progress',
      milestones: [
        { title: 'Project Initialization', description: 'Setup environment and initial architecture', status: 'pending' },
        { title: 'Core Implementation', description: 'Development of primary features', status: 'pending' },
        { title: 'Final Delivery', description: 'Testing, refinement, and final hand-off', status: 'pending' }
      ],
      progressPercentage: 0
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
    const { clientRating, deliveryTime, clientReview } = req.body; // deliveryTime: 'on-time' or 'delayed'
    let project = await Project.findById(req.params.id).populate('jobId');
    if (!project) {
      project = await Project.findOne({ jobId: req.params.id }).populate('jobId');
    }
    if (!project) return res.status(404).json({ message: 'Project not found' });

    project.completionStatus = 'completed';
    project.paymentStatus = 'paid';
    project.clientRating = clientRating;
    project.clientReview = clientReview;
    project.deliveryTime = deliveryTime;
    project.endDate = Date.now();
    await project.save();

    // Update Freelancer Rating & Trust Score
    const freelancer = await User.findById(project.freelancerId);
    if (!freelancer) return res.status(404).json({ message: 'Freelancer not found' });

    // --- Running Average Rating ---
    const existingRating = freelancer.globalRating || 0;
    const currentCount = freelancer.ratingCount > 0
      ? freelancer.ratingCount
      : (existingRating > 0 ? 1 : 0); 

    const newCount = currentCount + 1;
    const newRating = currentCount === 0
      ? clientRating  
      : ((existingRating * currentCount) + clientRating) / newCount;

    freelancer.globalRating = parseFloat(newRating.toFixed(2));
    freelancer.ratingCount = newCount;

    // --- Trust Score Calculation ---
    const clientRatingScore = (clientRating / 10) * 100; // scale 1-10 → 0-100
    const onTimeScore = (deliveryTime === 'on-time') ? 100 : 40;
    const previousTrustScore = freelancer.trustScore || 50;

    freelancer.trustScore = Math.min(100, Math.round(
      (previousTrustScore * 0.6) +
      (clientRatingScore * 0.25) +
      (onTimeScore * 0.15)
    ));

    await freelancer.save();

    // Sync the new globalRating back into FreelancerProfile.testScore so
    // the freelancer dashboard and all profile views show the live dynamic rating.
    await FreelancerProfile.findOneAndUpdate(
      { userId: project.freelancerId },
      { testScore: freelancer.globalRating },
      { new: true }
    );

    // Also update the job status to completed
    await Job.findByIdAndUpdate(project.jobId, { status: 'completed' });

    // Create notification for freelancer
    await Notification.create({
      userId: project.freelancerId,
      title: 'Project Completed!',
      message: `The project "${project.jobId?.title || 'Your project'}" has been completed and finalized.`,
      type: 'project_completed',
      link: `/project/${project._id}`
    });

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

// Get single project by ID
router.get('/:id', auth, async (req, res) => {
  try {
    let project = await Project.findById(req.params.id)
      .populate('jobId')
      .populate('freelancerId', ['name', 'profileImage', 'trustScore', 'globalRating']);

    // Fallback: if not found, it might be a Job ID being passed from older bid data
    if (!project) {
      project = await Project.findOne({ jobId: req.params.id })
        .populate('jobId')
        .populate('freelancerId', ['name', 'profileImage', 'trustScore', 'globalRating']);
    }

    if (!project) return res.status(404).json({ message: 'Project not found' });

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Initialize milestones for a project
router.put('/:id/initialize-milestones', auth, async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) {
      project = await Project.findOne({ jobId: req.params.id });
    }
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Initialize with default milestones
    project.milestones = [
      { title: 'Project Initialization', description: 'Setup environment and initial architecture', status: 'pending' },
      { title: 'Core Implementation', description: 'Development of primary features', status: 'pending' },
      { title: 'Final Delivery', description: 'Testing, refinement, and final hand-off', status: 'pending' }
    ];
    project.progressPercentage = 0;
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit a milestone
router.put('/:id/milestones/submit', auth, async (req, res) => {
  try {
    const { milestoneId, submissionNote, submissionLink } = req.body;
    let project = await Project.findById(req.params.id);
    if (!project) {
      project = await Project.findOne({ jobId: req.params.id });
    }
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.freelancerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the assigned freelancer can submit work' });
    }

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    milestone.status = 'submitted';
    milestone.submittedAt = Date.now();
    milestone.submissionNote = submissionNote;
    milestone.submissionLink = submissionLink;
    await project.save();

    // Notify Client
    const job = await Job.findById(project.jobId);
    if (job) {
      await Notification.create({
        userId: job.companyId,
        title: 'Milestone Submitted',
        message: `A milestone for "${job.title}" has been submitted for review.`,
        type: 'milestone_submitted',
        link: `/project/${project._id}`
      });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve a milestone
router.put('/:id/milestones/approve', auth, async (req, res) => {
  try {
    const { milestoneId, feedback } = req.body;
    let project = await Project.findById(req.params.id).populate('jobId');
    if (!project) {
      project = await Project.findOne({ jobId: req.params.id }).populate('jobId');
    }
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.jobId.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the hiring company can approve work' });
    }

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    milestone.status = 'approved';
    milestone.approvedAt = Date.now();
    milestone.feedback = feedback;

    // Recalculate progress percentage
    const approvedCount = project.milestones.filter(m => m.status === 'approved').length;
    project.progressPercentage = Math.round((approvedCount / project.milestones.length) * 100);

    await project.save();

    // Notify Freelancer
    await Notification.create({
      userId: project.freelancerId,
      title: 'Milestone Approved',
      message: `Your milestone for "${project.jobId.title}" has been approved.${feedback ? ` Feedback: ${feedback}` : ''}`,
      type: 'milestone_approved',
      link: `/project/${project._id}`
    });

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject a milestone
router.put('/:id/milestones/reject', auth, async (req, res) => {
  try {
    const { milestoneId, feedback } = req.body;
    let project = await Project.findById(req.params.id).populate('jobId');
    if (!project) {
      project = await Project.findOne({ jobId: req.params.id }).populate('jobId');
    }
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.jobId.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the hiring company can reject work' });
    }

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    milestone.status = 'rejected';
    milestone.feedback = feedback;
    await project.save();

    // Create notification for freelancer
    await Notification.create({
      userId: project.freelancerId,
      title: 'Milestone Rejected',
      message: `Your submission for "${milestone.title}" has been rejected. Please check the feedback and resubmit.`,
      type: 'milestone_rejected',
      link: `/project/${project._id}`
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
