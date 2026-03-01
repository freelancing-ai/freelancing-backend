const mongoose = require('mongoose');
const Job = require('./models/Job');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const jobs = await Job.find({});
    console.log('Jobs in DB:', jobs.length);
    console.log(JSON.stringify(jobs, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
  });
