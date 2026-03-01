const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There isn't a direct listModels in the high level SDK usually, but let's try a simple prompt with a few names
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("test");
        console.log(`Model ${modelName}: SUCCESS`);
      } catch (e) {
        console.log(`Model ${modelName}: FAILED - ${e.message}`);
      }
    }
  } catch (error) {
    console.error("Setup Error:", error);
  }
}

listModels();
