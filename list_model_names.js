const dotenv = require("dotenv");
dotenv.config();

async function listModels() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      data.models.forEach(m => {
        console.log(m.name);
      });
    } else {
      console.log("No models found or error:", data);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
