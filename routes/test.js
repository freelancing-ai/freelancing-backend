const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FreelancerProfile = require('../models/FreelancerProfile');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-flash-latest"
});

// Generate 10 questions based on role
router.post('/generate', auth, async (req, res) => {
  const { roles } = req.body;
  if (!roles || (Array.isArray(roles) && roles.length === 0)) {
    return res.status(400).json({ message: 'At least one role is required' });
  }

  const roleText = Array.isArray(roles) ? roles.join(' and ') : roles;

  try {
    const prompt = `Generate 10 multiple choice questions for an assessment test for a freelancer specializing in ${roleText}. 
    Each question should have 4 options and 1 correct answer (index 0-3).
    Return only a JSON object matching this schema:
    { "questions": [{ "question": "string", "options": ["string", "string", "string", "string"], "correctAnswer": number }] }`;

    const result = await model.generateContent(prompt);
    let content = result.response.text();
    console.log('Gemini Raw Response:', content);
    
    // Clean up markdown if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(content);
    res.json(data.questions);
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ message: 'Failed to generate questions', error: error.message });
  }
});

// Submit test result
router.post('/submit', auth, async (req, res) => {
  const { score, category } = req.body;
  
  try {
    const profile = await FreelancerProfile.findOneAndUpdate(
      { userId: req.user._id },
      { 
        testScore: score, 
        testTaken: true,
        category: category
      },
      { new: true, upsert: true }
    );

    res.json({ message: 'Score saved successfully', profile });
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ message: 'Failed to save score' });
  }
});

module.exports = router;
