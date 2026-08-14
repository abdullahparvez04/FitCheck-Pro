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

app.post('/api/rate-outfit', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image file.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in .env file.' });
    }

    const selectedModel = await getActiveModel(apiKey);

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const systemPrompt = "You are an objective, hilarious fashion critic operating the FitCheck-Pro Aura Points system.";

    const auraPrompt = `
    TASK:
    Analyze the clothing items visible in the photo strictly on fit, color harmony, silhouette, and style execution.
    
    CONTEXT ASSUMPTION:
    Assume the outfit is for everyday casual wear. Do not analyze suitability for specific events.

    OUTPUT INSTRUCTIONS:
    - Return ONLY valid JSON with no markdown formatting.
    - Focus exclusively on: fabric choice, fit/tailoring, color coordination, accessories, and grooming.
    - NEVER include questions in your response. Output direct statements only.

    JSON FORMAT EXACT STRUCTURE:
    {
      "totalAura": "+4,200",
      "verdict": "Unspoken Rizz",
      "auraBreakdown": [
        "+2,500 Aura: Monochromatic color palette execution",
        "+2,000 Aura: Perfectly proportioned jacket length",
        "-300 Aura: Scuffed footwear needs attention"
      ],
      "feedback": "Immaculate color balance and silhouette. A quick shoe refresh takes this straight to peak Aura."
    }
    `;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: auraPrompt },
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

    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini API.');
    }

    // Clean up markdown formatting if returned
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(responseText);
    res.json(parsedData);

  } catch (err) {
    console.error('--- SERVER ERROR ---', err);
    res.status(500).json({ error: 'Failed to calculate Aura Points.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});