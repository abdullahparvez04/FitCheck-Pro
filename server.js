import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

let cachedModelName = null;

async function getActiveModel(apiKey) {
  if (cachedModelName) return cachedModelName;

  const preferredModels = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.models && data.models.length > 0) {
      const availableNames = data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));

      for (const model of preferredModels) {
        if (availableNames.includes(model)) {
          cachedModelName = model;
          return cachedModelName;
        }
      }
    }
  } catch (err) {
    console.warn('Defaulting model to gemini-3.6-flash');
  }

  cachedModelName = 'gemini-3.6-flash';
  return cachedModelName;
}

// Map frontend choices to detailed system prompts
function getSystemPrompt(personaChoice) {
  switch (personaChoice) {
    case 'roast':
      return `You are a hilarious, no-nonsense high-fashion critic. 
      Be witty, cheeky, and playfully roast bad fashion choices, but keep recommendations sharp and helpful.`;
    
    case 'executive':
      return `You are a top-tier luxury fashion executive. 
      Keep your tone formal, direct, minimalist, and authoritative. Focus strictly on proportions, fabrics, and formality levels.`;
    
    case 'friend':
    default:
      return `You are a warm, supportive, and enthusiastic best friend giving outfit feedback. 
      Use casual, human-like, encouraging language. Make the user feel great while giving helpful tips.`;
  }
}

app.post('/api/rate-outfit', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image file.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in .env file.' });
    }

    const occasion = req.body.occasion || 'Casual Everyday';
    const personaChoice = req.body.persona || 'friend';
    
    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const modelName = await getActiveModel(apiKey);
    console.log(`Using model: ${modelName} | Persona: ${personaChoice}`);

    const promptText = `
    Evaluate the outfit in this photo for the occasion: "${occasion}".
    
    Provide your evaluation structured in JSON with keys:
    - score (number out of 10)
    - vibe (short phrase)
    - summary (1-2 sentences matching your persona)
    - pros (array of strings)
    - cons (array of strings)
    - tips (array of strings)
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // system_instruction forces Gemini to adopt the selected persona
        system_instruction: {
          parts: [{ text: getSystemPrompt(personaChoice) }]
        },
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('Gemini API Error:', data);
      return res.status(apiResponse.status).json({ 
        error: data.error?.message || 'Gemini API request failed.' 
      });
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini API.');
    }

    const parsedData = JSON.parse(responseText);
    res.json(parsedData);

  } catch (err) {
    console.error('--- SERVER ERROR ---', err);
    res.status(500).json({ error: 'Failed to analyze outfit.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});