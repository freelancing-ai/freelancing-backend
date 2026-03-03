const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { upload } = require('../middleware/cloudinary');
const FreelancerProfile = require('../models/FreelancerProfile');
const User = require('../models/User');

// Update profile image
router.post('/avatar', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const user = await User.findById(req.user._id);
    user.profileImage = req.file.path;
    await user.save();

    res.json({ imageUrl: req.file.path });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await FreelancerProfile.findOne({ userId: req.user._id }).populate('userId', ['name', 'email', 'trustScore', 'globalRating']);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get profile by ID
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Profile not found' });

    let profileData = {
      ...user.toObject(),
      avgRating: user.globalRating || 5.0,
      totalProjects: 0,
      totalJobsPosted: 0
    };

    if (user.role === 'freelancer') {
      const freelancerProfile = await FreelancerProfile.findOne({ userId: user._id });
      if (freelancerProfile) {
        profileData = {
          ...profileData,
          ...freelancerProfile.toObject(),
          // Re-ensure basic user info is not overwritten by null values
          name: user.name,
          profileImage: user.profileImage,
          bio: freelancerProfile.bio || user.bio,
          country: freelancerProfile.country || user.country
        };
      }
    } else if (user.role === 'company') {
      // For companies, count jobs posted
      const Job = require('../models/Job');
      const jobsPostedCount = await Job.countDocuments({ companyId: user._id });
      profileData.totalJobsPosted = jobsPostedCount;
    }

    res.json(profileData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/me', auth, async (req, res) => {
  try {
    const { skills, bio, hourlyRate, country, region, education, experience } = req.body;
    
    // Simple Fraud Check (as per user request)
    let fraudScore = 0;
    if (bio && bio.length < 30) fraudScore = 80;
    if (bio && /(copy|paste|fake|test)/i.test(bio)) fraudScore += 20;

    let profile = await FreelancerProfile.findOne({ userId: req.user._id });
    
    // Update basic user info too so it shows in User documents
    if (bio || country) {
      await User.findByIdAndUpdate(req.user._id, { bio, country });
    }

    if (profile) {
      profile.skills = skills || profile.skills;
      profile.bio = bio || profile.bio;
      profile.hourlyRate = hourlyRate || profile.hourlyRate;
      profile.country = country || profile.country;
      profile.region = region || profile.region;
      profile.education = education || profile.education;
      profile.experience = experience || profile.experience;
      profile.fraudScore = fraudScore;
      await profile.save();
      return res.json(profile);
    }

    profile = await FreelancerProfile.create({
      userId: req.user._id,
      skills,
      bio,
      hourlyRate,
      country,
      region,
      education,
      experience,
      fraudScore
    });

    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
