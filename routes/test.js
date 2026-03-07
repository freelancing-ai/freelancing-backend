const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FreelancerProfile = require('../models/FreelancerProfile');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
});

// Generate 10 questions based on role
router.post('/generate', auth, async (req, res) => {
  const { roles } = req.body;
  if (!roles || (Array.isArray(roles) && roles.length === 0)) {
    return res.status(400).json({ message: 'At least one role is required' });
  }

  const roleText = Array.isArray(roles) ? roles.join(' and ') : roles;

  try {
    const prompt = `Generate exactly 10 multiple choice questions for an assessment test for a freelancer specializing strictly in ${roleText}. 
    Do not include general freelancing questions. All questions MUST be highly specific to the technical and professional domain of ${roleText}.
    Each question should have exactly 4 options and 1 correct answer (indicated by the 0-based index of the option, from 0 to 3).
    Return ONLY a raw JSON object and nothing else. Do not use markdown blocks like \`\`\`json. The JSON object must strictly match this schema:
    { "questions": [{ "question": "string", "options": ["string", "string", "string", "string"], "correctAnswer": number }] }`;

    const result = await model.generateContent(prompt);
    let content = result.response.text();
    console.log('Gemini Raw Response:', content);

    // Clean up markdown if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    let data;
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      // Fallback: try to extract the JSON object using regex if there's extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse JSON from AI response.");
      }
    }

    if (!data || !data.questions) {
      throw new Error("Invalid response format from AI.");
    }

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

    // Seed globalRating from AI test score if the worker hasn't received any client rating yet.
    // ratingCount = 0 means no prior client ratings → set testScore as the starting rating (count = 1).
    // This ensures future client ratings average correctly with the AI score.
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    if (user && user.ratingCount === 0) {
      user.globalRating = parseFloat(score.toFixed(2));
      user.ratingCount = 1; // count = 1 → "1 rating received (the AI test)"
      await user.save();
    }

    res.json({ message: 'Score saved successfully', profile });
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ message: 'Failed to save score' });
  }
});

module.exports = router;
