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
    const strictRule = " ABSOLUTE RULE: DO NOT ask what the occasion, event, or destination is. NEVER ask 'Where are you wearing this?'. Assume a versatile everyday outfit and give immediate ratings and style feedback based strictly on what you see in the photo.";

    switch (personaChoice) {
        case 'roast':
            return `You are a hilarious, no-nonsense high-fashion critic.${strictRule} Be witty, cheeky, and playfully roast bad fashion choices, but keep recommendations helpful.`;

        case 'executive':
            return `You are a top-tier luxury fashion executive.${strictRule} Keep your tone formal, direct, minimalist, and authoritative. Focus strictly on proportion, fit, and color.`;

        case 'friend':
        default:
            return `You are a warm, supportive, and enthusiastic best friend giving outfit feedback.${strictRule} Use casual, human-like, encouraging language. Make the user feel great while giving helpful advice.`;
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

    const personaChoice = req.body.persona || 'executive';
    const systemPrompt = getSystemPrompt(personaChoice);
    const selectedModel = await getActiveModel(apiKey);

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: "user",
          parts: [
            { 
              text: "Analyze this outfit immediately. Give complete feedback on fit, color harmony, and styling tips. DO NOT ask any follow-up questions. DO NOT ask for the occasion or event." 
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ]
    };

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('Gemini API Error:', data);
      return res.status(500).json({ error: data.error?.message || 'Gemini API call failed.' });
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini API.');
    }

    res.json({ result: responseText });

  } catch (err) {
    console.error('--- SERVER ERROR ---', err);
    res.status(500).json({ error: 'Failed to analyze outfit.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});