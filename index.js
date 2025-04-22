const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { OpenAI } = require('openai');

const { createClient } = require('redis');

const redis = createClient({
    url: process.env.REDIS_URL // Defaults to localhost:6379
  });
  redis.connect().catch(console.error); 
redis.connect().catch(console.error);

const app = express();
const PORT = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

app.post('/api/estimate-chore-time', async (req, res) => {
    const { chore } = req.body;
    const cleanedChore = chore.trim().toLowerCase();
    const redisKey = `chore:${cleanedChore}`;
  
    try {
      // Check Redis cache first
      const cached = await redis.get(redisKey);
      if (cached) {
        return res.json({ result: cached, cached: true });
      }
  
      // Call OpenAI API if not cached
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
  
      // Save to Redis (set with expiration of 7 days = 604800 seconds)
      await redis.setEx(redisKey, 604800, estimate);
  
      res.json({ result: estimate, cached: false });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'OpenAI API error or Redis issue.' });
    }
});
  

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
