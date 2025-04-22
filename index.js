// index.js (Merged estimate + motivation endpoint with Redis caching)

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const { Redis } = require('@upstash/redis');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

app.use(cors());
app.use(express.json());

// Merged estimate + motivation route
app.post('/api/chore-details', async (req, res) => {
  const { chore } = req.body;
  const cleanedChore = chore.trim().toLowerCase();

  const estimateKey = `chore:${cleanedChore}`;
  const motivationKey = `motivation:${cleanedChore}`;

  let estimatedTime = null;
  let motivationText = null;
  let cached = true;

  try {
    // Fetch or generate estimated time
    const cachedEstimate = await redis.get(estimateKey);
    if (cachedEstimate) {
      estimatedTime = cachedEstimate;
    } else {
      cached = false;
      const estimatePrompt = `Estimate how long it usually takes to complete this household chore: "${chore}". Reply in the format: Est. XX–YY mins.`;
      const estimateResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You estimate realistic time durations for chores in a friendly and concise way." },
          { role: "user", content: estimatePrompt }
        ],
        max_tokens: 50,
      });
      estimatedTime = estimateResponse.choices[0].message.content;
      await redis.set(estimateKey, estimatedTime);
    }

    // Fetch or generate motivation
    const cachedMotivation = await redis.get(motivationKey);
    if (cachedMotivation) {
      motivationText = cachedMotivation;
    } else {
      cached = false;
      const motivationPrompt = `Craft a short, intellectually engaging motivational message that uses scientific or psychological reasoning to encourage someone to do this chore: "${chore}". Keep it under 25 words.`;
      ;
      const motivationResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a motivational assistant who gives short, encouraging quotes." },
          { role: "user", content: motivationPrompt }
        ],
        max_tokens: 40,
      });
      motivationText = motivationResponse.choices[0].message.content;
      await redis.set(motivationKey, motivationText);
    }

    res.json({ estimatedTime, motivationText, cached });
  } catch (err) {
    console.error('Error fetching estimate or motivation:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to generate chore details' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
