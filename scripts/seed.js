const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');
const Job = require('../models/Job');
const Bid = require('../models/Bid');
const Project = require('../models/Project');
const dotenv = require('dotenv');

dotenv.config();

const DATA_DIR = path.join(__dirname, '../Test');

const parseCSV = (content) => {
  if (!content) return [];
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] ? values[i].replace(/^"|"$/g, '').trim() : '';
    });
    return obj;
  });
};

const seedData = async () => {
  try {
    console.log('Connecting to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // Clear existing data
    console.log('Cleaning database...');
    await User.deleteMany({});
    await FreelancerProfile.deleteMany({});
    await Job.deleteMany({});
    await Bid.deleteMany({});
    await Project.deleteMany({});
    console.log('Database cleaned.');

    const companyMapping = {}; // csv_id -> mongo_id
    const freelancerMapping = {}; // csv_id -> mongo_id
    const jobMapping = {}; // csv_id -> mongo_id

    // 1. Seed Companies
    console.log('Seeding Companies...');
    const companiesData = parseCSV(fs.readFileSync(path.join(DATA_DIR, 'companies.csv'), 'utf8'));
    for (const comp of companiesData) {
      if (!comp.company_id) continue;
      try {
        const user = await User.create({
          name: comp.company_name,
          email: `contact@${comp.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}${Math.floor(Math.random() * 100)}.com`,
          password: 'password123',
          role: 'company'
        });
        companyMapping[comp.company_id] = user._id;
      } catch (e) {
        // console.error(`Error seeding company ${comp.company_name}:`, e.message);
      }
    }
    console.log(`Seeded ${Object.keys(companyMapping).length} companies.`);

    // 2. Seed Freelancers
    console.log('Seeding Freelancers...');
    const freelancersData = parseCSV(fs.readFileSync(path.join(DATA_DIR, 'freelancers.csv'), 'utf8'));
    for (const f of freelancersData) {
      if (!f.freelancer_id) continue;
      try {
        const user = await User.create({
          name: f.name,
          email: `${f.name.toLowerCase().replace(/[^a-z0-9]/g, '')}${Math.floor(Math.random() * 10000)}@example.com`,
          password: 'password123',
          role: 'freelancer',
          trustScore: parseFloat(f.safety_score) || 50,
          globalRating: parseFloat(f.overall_rating) || 0
        });

        const skills = f.skills ? f.skills.split(',').map(s => s.trim()) : [];

        await FreelancerProfile.create({
          userId: user._id,
          skills: skills,
          bio: f.bio,
          hourlyRate: parseFloat(f.hourly_rate) || 0,
          country: f.location ? f.location.split(',').pop().trim() : 'India',
          verified: f.verified_status === 'Verified',
          testScore: parseFloat(f.verified_skill_score) || 0,
          testTaken: !!f.verified_skill_score,
          category: f.primary_role
        });
        freelancerMapping[f.freelancer_id] = user._id;
      } catch (err) {
        // console.error(`Error seeding freelancer ${f.name}:`, err.message);
      }
    }
    console.log(`Seeded ${Object.keys(freelancerMapping).length} freelancers.`);

    // 3. Seed Jobs
    console.log('Seeding Jobs...');
    const jobsData = parseCSV(fs.readFileSync(path.join(DATA_DIR, 'jobs.csv'), 'utf8'));
    for (const j of jobsData) {
      if (!j.job_id) continue;
      const mongoCompanyId = companyMapping[j.company_id];
      if (!mongoCompanyId) continue;

      const skills = j.required_skills ? j.required_skills.split(',').map(s => s.trim()) : [];
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (parseInt(j.duration_days) || 30));

      const job = await Job.create({
        companyId: mongoCompanyId,
        title: j.title,
        description: j.description,
        budget: parseFloat(j.budget) || 0,
        deadline: deadline,
        requiredSkills: skills,
        status: j.status ? j.status.toLowerCase().replace(' ', '-') : 'open'
      });
      jobMapping[j.job_id] = job._id;
    }
    console.log(`Seeded ${Object.keys(jobMapping).length} jobs.`);

    // 4. Seed Bids (from proposals.csv)
    console.log('Seeding Bids...');
    const proposalsFile = path.join(DATA_DIR, 'proposals.csv');
    if (fs.existsSync(proposalsFile)) {
      const proposalsData = parseCSV(fs.readFileSync(proposalsFile, 'utf8'));
      let bidCount = 0;
      for (const p of proposalsData) {
        const mongoJobId = jobMapping[p.job_id];
        const mongoFreelancerId = freelancerMapping[p.freelancer_id];
        if (!mongoJobId || !mongoFreelancerId) continue;

        await Bid.create({
          jobId: mongoJobId,
          freelancerId: mongoFreelancerId,
          amount: parseFloat(p.bid_amount) || 0,
          proposal: p.cover_letter || 'Interested in this job',
          deliveryInDays: 7, // Default
          status: (p.status || 'pending').toLowerCase()
        });
        bidCount++;
      }
      console.log(`Seeded ${bidCount} bids.`);
    }

    // 5. Seed Projects (from job_history.csv)
    console.log('Seeding Projects...');
    const historyFile = path.join(DATA_DIR, 'job_history.csv');
    if (fs.existsSync(historyFile)) {
      const historyData = parseCSV(fs.readFileSync(historyFile, 'utf8'));
      let projectCount = 0;
      for (const h of historyData) {
        const mongoJobId = jobMapping[h.job_id];
        const mongoFreelancerId = freelancerMapping[h.freelancer_id];
        if (!mongoJobId || !mongoFreelancerId) continue;

        await Project.create({
          jobId: mongoJobId,
          freelancerId: mongoFreelancerId,
          completionStatus: 'completed',
          clientRating: parseFloat(h.rating) || 5,
          deliveryTime: 'on-time'
        });
        projectCount++;
      }
      console.log(`Seeded ${projectCount} projects.`);
    }

    console.log('Seed data created successfully from Test directory!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
