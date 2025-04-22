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

app.post('/api/estimate-chore-time', async (req, res) => {
  const { chore } = req.body;
  const cleanedChore = chore.trim().toLowerCase();
  const redisKey = `chore:${cleanedChore}`;

  try {
    // Check Redis (Upstash) cache
    const cached = await redis.get(redisKey);
    if (cached) {
      return res.json({ result: cached, cached: true });
    }

    const prompt = `Estimate how long it usually takes to complete this household chore: "${chore}". Reply in the format: Est. XX–YY mins.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You estimate realistic time durations for chores in a friendly and concise way." },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
    });

    const estimate = response.choices[0].message.content;

    // Save to Upstash Redis
    await redis.set(redisKey, estimate);

    res.json({ result: estimate, cached: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching estimate or connecting to Redis/OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
