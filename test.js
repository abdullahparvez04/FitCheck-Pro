import dotenv from 'dotenv';
dotenv.config();

async function checkSupportedModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    console.log("\n✅ ACTIVE MODELS THAT SUPPORT IMAGE ANALYSIS:");
    console.log("--------------------------------------------");
    
    data.models.forEach(model => {
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        console.log(model.name.replace('models/', ''));
      }
    });
    console.log("--------------------------------------------\n");
  } catch (err) {
    console.error("Error fetching models:", err);
  }
}

checkSupportedModels();