const mongoose = require('mongoose');
const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');
const Job = require('../models/Job');
const dotenv = require('dotenv');

dotenv.config();

const skillsPool = [
  'React', 'Node.js', 'MongoDB', 'JavaScript', 'TypeScript', 'Python', 
  'Django', 'Flask', 'GraphQL', 'AWS', 'Docker', 'Kubernetes', 
  'UI/UX Design', 'Figma', 'Solidity', 'Web3', 'Blockchain', 
  'Next.js', 'Tailwind CSS', 'Redux', 'PostgreSQL', 'Redis'
];

const categories = ['Web Development', 'Mobile Apps', 'Design', 'Data Science', 'Blockchain', 'DevOps'];

const seed100 = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // Optional: Only clear if you want a fresh 100
    // console.log('Cleaning existing data...');
    // await User.deleteMany({ email: /seed-test/ }); // Selective delete or all? 
    // The user said "create and dump", usually implies additive or fresh. 
    // I'll skip clear to be safe, but use unique emails.

    const companyIds = [];

    console.log('Generating 100 Company Users...');
    for (let i = 1; i <= 100; i++) {
      const company = await User.create({
        name: `Company ${i}`,
        email: `company${i}_${Date.now()}@seed.com`,
        password: 'test',
        role: 'company',
        bio: `Bio for Company ${i}`,
        country: 'India'
      });
      companyIds.push(company._id);
    }

    console.log('Generating 100 Freelancer Users and Profiles...');
    for (let i = 1; i <= 100; i++) {
      const freelancer = await User.create({
        name: `Freelancer ${i}`,
        email: `freelancer${i}_${Date.now()}@seed.com`,
        password: 'test',
        role: 'freelancer',
        bio: `Bio for Freelancer ${i}`,
        country: 'India',
        trustScore: Math.floor(Math.random() * 40) + 60,
        globalRating: parseFloat((Math.random() * 5 + 5).toFixed(1)) // 5 to 10
      });

      const randomSkills = [];
      const skillCount = Math.floor(Math.random() * 4) + 2;
      for (let s = 0; s < skillCount; s++) {
        const skill = skillsPool[Math.floor(Math.random() * skillsPool.length)];
        if (!randomSkills.includes(skill)) randomSkills.push(skill);
      }

      await FreelancerProfile.create({
        userId: freelancer._id,
        skills: randomSkills,
        bio: `Professional profile bio for Freelancer ${i}`,
        hourlyRate: Math.floor(Math.random() * 50) + 15,
        country: 'India',
        region: 'Tamil Nadu',
        verified: Math.random() > 0.3,
        testScore: Math.floor(Math.random() * 30) + 70,
        testTaken: true,
        category: categories[Math.floor(Math.random() * categories.length)]
      });
    }

    console.log('Generating 100 Jobs...');
    const jobTypes = ['quick_task', 'mid_level_task', 'advanced_task'];
    for (let i = 1; i <= 100; i++) {
      const randomCompId = companyIds[Math.floor(Math.random() * companyIds.length)];
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const jobSkills = [];
      for (let s = 0; s < 3; s++) {
        const skill = skillsPool[Math.floor(Math.random() * skillsPool.length)];
        if (!jobSkills.includes(skill)) jobSkills.push(skill);
      }

      await Job.create({
        companyId: randomCompId,
        title: `Job Title ${i}: ${jobSkills[0]} Expert Needed`,
        description: `This is a generated description for job ${i}. We need someone proficient in ${jobSkills.join(', ')}.`,
        budget: Math.floor(Math.random() * 1000) + 100,
        deadline: deadline,
        requiredSkills: jobSkills,
        jobType: jobTypes[Math.floor(Math.random() * jobTypes.length)],
        status: 'open'
      });
    }

    console.log('Successfully seeded 100 of each!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seed100();
