# Chatbot Service - Google Gemini AI

AI-powered chatbot service for fashion e-commerce using Google Gemini API.

## Features

- 🤖 Natural language conversation with Gemini AI
- 🔍 Product search via chat
- 💡 Personalized recommendations with AI explanations
- 📦 Product-specific Q&A
- 🎯 Intent extraction (search, recommendation, general)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 3. Configure Environment

Create `.env` file:

```env
PORT=3009
GEMINI_API_KEY=your_gemini_api_key_here
FASHION_SERVICE_URL=http://localhost:3008
PRODUCT_SERVICE_URL=http://localhost:3002
FRONTEND_URL=http://localhost:5173
```

### 4. Run Service

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### 1. Send Chat Message

```http
POST /api/chat/message
Content-Type: application/json

{
  "message": "Show me red Nike shoes",
  "conversationHistory": [
    {"role": "user", "content": "Hello"},
    {"role": "model", "content": "Hi! How can I help?"}
  ],
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "I found 3 Nike shoes in red...",
    "intent": "search",
    "products": [...],
    "timestamp": "2025-11-09T..."
  }
}
```

### 2. Product-Specific Query

```http
POST /api/chat/product-query
Content-Type: application/json

{
  "productId": "6908...",
  "question": "What sizes are available?"
}
```

### 3. Get Recommendations with AI Explanation

```http
POST /api/chat/recommendations
Content-Type: application/json

{
  "userId": "68e4058c...",
  "preferences": "casual style",
  "limit": 8
}
```

## Integration with Existing Services

The chatbot automatically calls:

- **Fashion Service** (`/api/recommendations/retrieve/personalized`) - Personalized recommendations
- **Product Service** (`/api/products`) - Product search and details
- **Fashion Service** (`/api/recommendations/product/:id`) - Similar products

## Rate Limits

- 30 requests per minute per IP
- Configurable via `RATE_LIMIT_MAX_REQUESTS` env variable

## Model Used

- **Gemini 1.5 Flash** - Fast, efficient responses
- Temperature: 0.7 (creative but focused)
- Max tokens: 500 (concise responses)

## Error Handling

- Invalid API key → 503 Service Unavailable
- Rate limit → 429 Too Many Requests
- Network errors → Graceful fallback with error message

## Development

```bash
# Watch mode
npm run dev

# Test health endpoint
curl http://localhost:3009/health
```

## Docker

```bash
# Build
docker build -t chatbot-service .

# Run
docker run -p 3009:3009 --env-file .env chatbot-service
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3009` |
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `FASHION_SERVICE_URL` | Fashion/AI service URL | `http://localhost:3008` |
| `PRODUCT_SERVICE_URL` | Product service URL | `http://localhost:3002` |
| `FRONTEND_URL` | CORS origin | `http://localhost:5173` |
| `RATE_LIMIT_MAX_REQUESTS` | Requests per minute | `30` |

## Next Steps

1. Get Gemini API key from Google AI Studio
2. Add to `.env` file
3. Run `npm install`
4. Start service: `npm run dev`
5. Test: `curl -X POST http://localhost:3009/api/chat/message -H "Content-Type: application/json" -d '{"message":"Hello"}'`
