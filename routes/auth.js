const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');
const Job = require('../models/Job');
const Project = require('../models/Project');
const Bid = require('../models/Bid');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_for_production', {
    expiresIn: '30d'
  });
};

const getDashboardData = async (user) => {
  if (user.role === 'freelancer') {
    const profile = await FreelancerProfile.findOne({ userId: user._id }).populate('userId', ['name', 'email', 'trustScore', 'globalRating']);
    const projects = await Project.find({ freelancerId: user._id }).populate('jobId');
    const completedProjects = projects.filter(p => p.completionStatus === 'completed');
    const earnings = completedProjects.reduce((sum, p) => sum + (p.jobId?.budget || 0), 0);
    const successRate = projects.length > 0 ? Math.round((completedProjects.length / projects.length) * 100) : 100;

    // Smart job matching based on skills
    let recommendedJobs = [];
    if (profile && profile.skills && profile.skills.length > 0) {
      recommendedJobs = await Job.find({
        status: 'open',
        requiredSkills: { $in: profile.skills }
      }).limit(6).sort({ createdAt: -1 });
    }

    // Fallback to latest jobs if no skill matches or no profile
    if (recommendedJobs.length === 0) {
      recommendedJobs = await Job.find({ status: 'open' }).limit(6).sort({ createdAt: -1 });
    }

    return {
      profile,
      stats: { earnings, completedCount: completedProjects.length, successRate },
      activeProjects: projects.filter(p => p.completionStatus === 'in-progress'),
      recommendedJobs
    };
  } else {
    const myJobs = await Job.find({ companyId: user._id });
    const myApplications = await Bid.find({ jobId: { $in: myJobs.map(j => j._id) }, status: 'pending' })
      .populate('freelancerId', ['name', 'email', 'trustScore', 'globalRating', 'profileImage'])
      .populate('jobId', ['title']);

    const projects = await Project.find({})
      .populate({
        path: 'jobId',
        match: { companyId: user._id }
      })
      .populate('freelancerId', ['name', 'profileImage']);

    const activeProjects = projects.filter(p => p.jobId !== null && p.completionStatus === 'in-progress');

    const totalFreelancers = await User.countDocuments({ role: 'freelancer' });
    const totalJobs = await Job.countDocuments({});
    const totalCompletedProjects = await Project.countDocuments({ completionStatus: 'completed' });
    const allProjectsCount = await Project.countDocuments({});

    const matchingAccuracy = allProjectsCount > 0
      ? ((totalCompletedProjects / allProjectsCount) * 100).toFixed(1)
      : 98.5;

    // Aggregate top skills for stats
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

    return {
      myJobs,
      myApplications,
      activeProjects,
      platformStats: {
        totalFreelancers,
        totalJobs,
        totalProjects: totalCompletedProjects,
        matchingAccuracy,
        topSkills
      }
    };
  }
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, bio, skills, hourlyRate, country } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Create user with default scores and profile info
    const user = await User.create({ name, email, password, role, bio, country });
    
    if (role === 'freelancer') {
      // Pre-create the profile with any data provided during registration
      await FreelancerProfile.create({
        userId: user._id,
        bio: bio || '',
        skills: skills || [],
        hourlyRate: hourlyRate || 30,
        country: country || ''
      });
    }

    const dashboardData = await getDashboardData(user);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      trustScore: user.trustScore,
      globalRating: user.globalRating,
      profileImage: user.profileImage,
      token: generateToken(user._id),
      dashboardData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      const dashboardData = await getDashboardData(user);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        trustScore: user.trustScore,
        globalRating: user.globalRating,
        profileImage: user.profileImage,
        token: generateToken(user._id),
        dashboardData
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
