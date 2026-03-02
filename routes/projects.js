const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');
const Job = require('../models/Job');
const Notification = require('../models/Notification');

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
    const { clientRating, clientReview, deliveryTime } = req.body; 
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    project.completionStatus = 'completed';
    project.paymentStatus = 'paid';
    project.clientRating = clientRating;
    project.clientReview = clientReview;
    project.deliveryTime = deliveryTime;
    project.endDate = Date.now();
    await project.save();

    // Notify freelancer
    await Notification.create({
      userId: project.freelancerId,
      title: 'Project Completed!',
      message: `Project "${project.jobId?.title}" has been finalized and payment is released.`,
      type: 'project_completed',
      link: `/project/${project._id}`
    });

    // Update Freelancer Trust Score and Global Rating
    const freelancer = await User.findById(project.freelancerId);
    if (!freelancer) return res.status(404).json({ message: 'Freelancer not found' });
    
    // Global Rating Update (out of 10)
    const oldRating = freelancer.globalRating || 0;
    freelancer.globalRating = (oldRating === 0) ? clientRating : (oldRating * 0.7) + (clientRating * 0.3);

    // Update testScore in FreelancerProfile (which is displayed on dashboard)
    const FreelancerProfile = require('../models/FreelancerProfile');
    const profile = await FreelancerProfile.findOne({ userId: project.freelancerId });
    if (profile) {
      const currentTestScore = profile.testScore || 0;
      profile.testScore = (currentTestScore === 0) ? clientRating : Math.round(((currentTestScore * 0.5) + (clientRating * 0.5)) * 10) / 10;
      await profile.save();
    }

    // Trust Score Calculation
    const clientRatingScore = clientRating * 10; // Scaling 1-10 to 1-100
    const onTimeScore = (deliveryTime === 'on-time') ? 100 : 40;
    const previousTrustScore = freelancer.trustScore || 50;
    
    freelancer.trustScore = Math.min(100, Math.round(
      (previousTrustScore * 0.6) +
      (clientRatingScore * 0.3) + 
      (onTimeScore * 0.1)
    ));

    await freelancer.save();

    // Also update the job status to completed
    await Job.findByIdAndUpdate(project.jobId, { status: 'completed' });

    res.json({ project, newTrustScore: freelancer.trustScore, newGlobalRating: freelancer.globalRating, newTestScore: profile?.testScore });
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
    const project = await Project.findById(req.params.id)
      .populate('jobId')
      .populate('freelancerId', ['name', 'profileImage', 'trustScore', 'globalRating']);

    if (!project) return res.status(404).json({ message: 'Project not found' });

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit a milestone (Freelancer)
router.put('/:id/milestones/submit', auth, async (req, res) => {
  try {
    const { milestoneId, submissionNote, submissionLink } = req.body;
    const project = await Project.findById(req.params.id);
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

    // Notify Company
    const populatedProject = await Project.findById(project._id).populate('jobId');
    await Notification.create({
      userId: populatedProject.jobId.companyId,
      title: 'Milestone Submitted',
      message: `A milestone for "${populatedProject.jobId.title}" has been submitted for review.`,
      type: 'milestone_submitted',
      link: `/project/${project._id}`
    });

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve a milestone (Company)
router.put('/:id/milestones/approve', auth, async (req, res) => {
  try {
    const { milestoneId, feedback } = req.body;
    const project = await Project.findById(req.params.id).populate('jobId');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.jobId.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the hiring company can approve work' });
    }

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    milestone.status = 'approved';
    milestone.approvedAt = Date.now();
    milestone.feedback = feedback;

    // Calculate overall progress
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

// Initialize milestones for existing projects
router.put('/:id/initialize-milestones', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.milestones && project.milestones.length > 0) {
      return res.status(400).json({ message: 'Milestones already initialized' });
    }

    project.milestones = [
      { title: 'Project Kickoff', description: 'Initial sync and environment setup', status: 'pending' },
      { title: 'Core Implementation', description: 'Development of primary features', status: 'pending' },
      { title: 'Final Delivery', description: 'Testing, refinement, and final hand-off', status: 'pending' }
    ];

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
