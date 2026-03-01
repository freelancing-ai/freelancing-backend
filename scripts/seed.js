const mongoose = require('mongoose');
const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');
const Job = require('../models/Job');
const dotenv = require('dotenv');

dotenv.config();

const seedData = async () => {
  try {
    console.log('Connecting to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    console.log('Cleaning database...');
    await User.deleteMany({});
    await FreelancerProfile.deleteMany({});
    await Job.deleteMany({});
    console.log('Database cleaned.');

    // Create Company
    console.log('Creating company user...');
    const company = await User.create({
      name: 'Nexurah Corp',
      email: 'company@nexurah.com',
      password: 'password123',
      role: 'company'
    });
    console.log('Company created:', company._id);

    // Create Freelancers
    console.log('Creating freelancers...');
    const freelancers = [
      { name: 'Alice Smith', email: 'alice@example.com', skills: ['React', 'Node.js', 'Tailwind CSS'], trustScore: 92, rating: 4.8 },
      { name: 'Bob Johnson', email: 'bob@example.com', skills: ['React', 'TypeScript', 'MongoDB'], trustScore: 75, rating: 4.2 },
      { name: 'Charlie Brown', email: 'charlie@example.com', skills: ['Node.js', 'Express', 'PostgreSQL'], trustScore: 60, rating: 3.5 },
      { name: 'Diana Prince', email: 'diana@example.com', skills: ['React', 'Redux', 'Node.js', 'AWS'], trustScore: 88, rating: 4.9 }
    ];

    for (const f of freelancers) {
      try {
        const user = await User.create({
          name: f.name,
          email: f.email,
          password: 'password123',
          role: 'freelancer',
          trustScore: f.trustScore,
          globalRating: f.rating
        });

        await FreelancerProfile.create({
          userId: user._id,
          skills: f.skills,
          bio: `Experienced freelance developer specialized in ${f.skills.join(', ')}.`,
          hourlyRate: 50 + Math.floor(Math.random() * 50),
          country: ' United States',
          verified: true
        });
        console.log(`Created freelancer: ${f.name}`);
      } catch (err) {
        console.error(`Failed to create freelancer ${f.name}:`, err.message);
      }
    }

    // Create Sample Jobs
    console.log('Creating jobs...');
    const jobData = [
      {
        companyId: company._id,
        title: 'Full Stack React Developer',
        description: 'We need a developer to build a smart matching engine dashboard using React and Node.js. Must be proficient in Tailwind CSS and have experience with AI integrations.',
        budget: 1500,
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        requiredSkills: ['React', 'Node.js', 'Tailwind CSS']
      },
      {
        companyId: company._id,
        title: 'E-commerce Mobile App (React Native)',
        description: 'Looking for an expert to develop a cross-platform mobile app for a luxury fashion brand. Features include payment gateway integration and AR product preview.',
        budget: 4500,
        deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        requiredSkills: ['React Native', 'Firebase', 'Stripe']
      },
      {
        companyId: company._id,
        title: 'Python Data Scientist for AI NLP',
        description: 'Help us build a sentiment analysis tool for customer feedback. You will work with large datasets and fine-tune LLM models.',
        budget: 3200,
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        requiredSkills: ['Python', 'PyTorch', 'NLP']
      },
      {
        companyId: company._id,
        title: 'Logo & Brand Identity Design',
        description: 'Startup looking for a creative designer to craft a modern logo and complete brand guidelines. Must have a strong portfolio.',
        budget: 800,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        requiredSkills: ['Graphic Design', 'Illustrator', 'Branding']
      }
    ];

    await Job.insertMany(jobData);
    console.log('Sample jobs created.');

    console.log('Seed data created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
