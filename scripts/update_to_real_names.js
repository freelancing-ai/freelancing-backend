const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const firstNames = [
  'Arjun', 'Aditi', 'Aravind', 'Ananya', 'Bhavana', 'Bharat', 'Chaitra', 'Deepak', 'Divya', 'Eshwar',
  'Gautam', 'Gayatri', 'Hari', 'Indu', 'Jaya', 'Karthik', 'Kavita', 'Lokesh', 'Lakshmi', 'Manoj',
  'Meena', 'Naveen', 'Nisha', 'Omkar', 'Prakash', 'Priya', 'Rahul', 'Rupa', 'Sanjay', 'Sneha',
  'Tarun', 'Uma', 'Varun', 'Vidya', 'Yash', 'Zoya', 'Abhishek', 'Amrita', 'Anil', 'Archana',
  'Balaji', 'Chitra', 'Dinesh', 'Esha', 'Ganesh', 'Heena', 'Irfan', 'Jyoti', 'Kiran', 'Lata',
  'Mahesh', 'Nandini', 'Pankaj', 'Rashmi', 'Suresh', 'Tanvi', 'Uday', 'Vani', 'Vivek', 'Yamini',
  'Akash', 'Ishani', 'Karan', 'Mehak', 'Pranav', 'Riya', 'Sameer', 'Tanya', 'Utkarsh', 'Zeenat',
  'Amit', 'Barkha', 'Chetan', 'Dolly', 'Ekta', 'Farah', 'Gaurav', 'Ishita', 'Jatin', 'Kajal',
  'Lalit', 'Maya', 'Nitin', 'Payal', 'Raj', 'Suman', 'Tushar', 'Urvashi', 'Vikas', 'Zaid',
  'Aadil', 'Bina', 'Charu', 'Daksh', 'Elena', 'Firoz', 'Gita', 'Harsh', 'Ila', 'Jeevan'
];

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Iyer', 'Nair', 'Reddy', 'Patel', 'Singh', 'Kumar', 'Mishra',
  'Joshi', 'Kulkarni', 'Deshpande', 'Choudhury', 'Das', 'Bose', 'Chatterjee', 'Banerjee', 'Ghosh', 'Malhotra',
  'Khanna', 'Mehra', 'Kapoor', 'Seth', 'Bansal', 'Agarwal', 'Goel', 'Tyagi', 'Yadav', 'Rao',
  'Menon', 'Pillai', 'Ranganathan', 'Subramanian', 'Krishnan', 'Venkat', 'Murthy', 'Prasad', 'Naidu', 'Shetty',
  'Hegde', 'Pai', 'Shenoy', 'Prabhu', 'Deshmukh', 'Patil', 'Pawar', 'Shinde', 'Gaikwad', 'Jadhav'
];

const companyNames = [
  'Nexurah Solutions', 'Quantum Tech', 'CloudArc Systems', 'Innovate IO', 'BlueWave Digital',
  'Apex Software', 'Zenith Consulting', 'Elite Web Services', 'Symmetry AI', 'Titan Labs',
  'Nova Dynamics', 'Echo Systems', 'Swift Code', 'Vertex Media', 'Pixel Perfect',
  'Stellar Apps', 'Prism Technologies', 'Velocity IT', 'Core Logic', 'Foundry Labs',
  'Alpha Stream', 'Beta Build', 'Gamma Group', 'Delta Design', 'Sigma Soft',
  'Nebula Networks', 'Orbit Tech', 'Pulsar Digital', 'Quasar Labs', 'Ray Tracer',
  'Solaris Soft', 'Terra Tech', 'Ultra Systems', 'Vanguard IO', 'West Wind',
  'Xenon Web', 'Yield Tech', 'Zero One', 'Aura Labs', 'Beacon Systems',
  'Catalyst AI', 'Drift Media', 'Edge Soft', 'Flux IT', 'Grid Logic',
  'Hexa Digital', 'Ion Systems', 'Jolt Tech', 'Kinetix', 'Lucid Labs'
];

const updateToReal = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Find all users created by our seed script (name matches Freelancer X or Company X)
    const users = await User.find({ 
      $or: [
        { name: /^Freelancer \d+/ },
        { name: /^Company \d+/ }
      ]
    });

    console.log(`Found ${users.length} users to update.`);

    for (let user of users) {
      if (user.role === 'freelancer') {
        const first = firstNames[Math.floor(Math.random() * firstNames.length)];
        const last = lastNames[Math.floor(Math.random() * lastNames.length)];
        user.name = `${first} ${last}`;
      } else if (user.role === 'company') {
        const baseCompany = companyNames[Math.floor(Math.random() * companyNames.length)];
        // Add a bit of uniqueness to avoid duplicate names if we have more than 50
        user.name = `${baseCompany} ${Math.random().toString(36).substring(7).toUpperCase()}`;
      }
      
      await user.save();
    }

    console.log('Successfully updated users with real names!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating names:', error);
    process.exit(1);
  }
};

updateToReal();
