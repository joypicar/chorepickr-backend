# 🧹 ChorePickr Backend

This is the backend service for **ChorePickr**, a productivity app that suggests household chores and uses OpenAI's GPT model to estimate the time it takes to complete them. Redis caching is used to save API cost and speed up repeated chore queries.

---

## ⚙️ Features

- 🔌 Express.js REST API
- 🤖 GPT-4o Mini integration (or GPT-3.5-Turbo fallback)
- ⚡ Redis-based caching for repeated prompts
- 🌐 CORS enabled for frontend communication

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/your-username/chorepickr-backend.git
cd chorepickr-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your-openai-api-key
REDIS_URL=redis://localhost:6379
PORT=3000
```

### 4. Run locally
```bash
node index.js
```

Or with auto-reload:
```bash
npx nodemon index.js
```

Your server should run at:
```
http://localhost:3000
```

---

## 📡 API Endpoint

### `POST /api/estimate-chore-time`
Estimate the time required to complete a chore using GPT.

#### Request Body:
```json
{
  "chore": "vacuum the living room"
}
```

#### Response:
```json
{
  "result": "Est. 15–20 mins",
  "cached": true
}
```

---

## 🧠 How It Works
- Chores are normalized (`.trim().toLowerCase()`) as Redis keys
- If cached, the server returns the saved estimate
- Otherwise, it queries OpenAI and stores the response in Redis (expires in 7 days)