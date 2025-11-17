# Chatbot Service - Google Gemini AI

AI-powered chatbot service for fashion e-commerce using Google Gemini AI with conversation memory.

## Features

- 🤖 Natural language conversation with Gemini AI
- 💬 **Conversation Memory** - Remembers context across multiple messages
- 🌐 **Bilingual Support** - Vietnamese and English
- 🔍 Product search via chat
- 💡 Personalized recommendations with AI explanations
- 📦 **Order Tracking** - Check order status and history with authentication
- 🔒 **User Authentication** - Validates credentials with user-service
- 🛍️ Product-specific Q&A
- 🎯 Intent extraction (search, recommendation, order, general)
- 🧹 Automatic cache cleanup (30-minute expiry)

## Conversation Memory System

The chatbot now remembers previous messages in a conversation, enabling natural multi-turn dialogues:

### How It Works

- Each user gets a unique conversation history stored in memory
- Last 10 messages per user are kept
- Conversations expire after 30 minutes of inactivity
- Automatic cleanup runs every 5 minutes

### Example Multi-Turn Conversation

```
User: "Cho tôi xem áo sơ mi"
Bot: [Shows shirts]

User: "Có màu xanh không?"  ← Bot remembers we're talking about shirts
Bot: [Shows blue shirts]

User: "Nike có không?"  ← Bot still remembers the context
Bot: [Shows Nike blue shirts]
```

### Managing Conversation History

**Clear history for a user:**
```bash
DELETE /api/chat/history/:userId
```

**Get conversation history:**
```bash
GET /api/chat/history/:userId
```

**Get cache statistics:**
```bash
GET /api/chat/stats
```

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

## Testing

### Interactive Chat Mode

Start chatting directly with the chatbot to test conversation memory:

```bash
# Start chatbot service first
npm run dev

# In another terminal, start interactive chat
npm run chat
```

You'll be able to:
- Type messages like a real customer
- Use commands: `/history`, `/clear`, `/exit`
- Test Vietnamese: "Cho tôi xem áo sơ mi"
- Test English: "Show me some shoes"
- Watch the bot remember your conversation context

### Quick Test Mode

Run an automated 3-message conversation test:

```bash
npm run test:quick
```

This will automatically test:
1. "Cho tôi xem áo sơ mi" (Show me shirts)
2. "Có màu xanh không?" (Do you have blue?) ← Remembers shirts
3. "Nike có không?" (Do you have Nike?) ← Remembers blue shirts

**Note:** Service must be running before testing.

## API Endpoints

### 1. Send Chat Message

```http
POST /api/chat/message
Content-Type: application/json

{
  "message": "Show me red Nike shoes",
  "userId": "user-123"  // Optional, defaults to "anonymous"
}
```

**Note:** `conversationHistory` is now managed automatically by the server. Just provide `userId` to maintain conversation context.

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

**Vietnamese Example:**
```json
{
  "message": "Cho tôi xem áo sơ mi màu xanh",
  "userId": "user-vn-456"
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

### 4. Get User Orders

```http
POST /api/chat/orders
Content-Type: application/json

{
  "userId": "user-123",
  "question": "Show me my orders"  // Optional, defaults to "Show me my orders"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "You have 3 orders with us! Here's what's happening: ...",
    "orders": [
      {
        "id": "6547abc123...",
        "orderNumber": "ORD-1699876543-abc123",
        "totalPrice": 850000,
        "finalPrice": 850000,
        "itemCount": 2,
        "paymentStatus": "Paid",
        "shipmentStatus": "Delivered",
        "paymentMethod": "Momo",
        "createdAt": "2025-11-01T..."
      }
    ],
    "timestamp": "2025-11-14T..."
  }
}
```

**Notes:**
- Requires `userId` (not "anonymous")
- Returns last 10 orders
- AI provides friendly summary with status icons (✅📦⏳)

### 5. Get Specific Order Details

```http
POST /api/chat/order/:orderId
Content-Type: application/json

{
  "userId": "user-123",
  "question": "Tell me about this order"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "This order contains 2 items totaling ₫850,000...",
    "order": {
      "id": "6547abc123...",
      "orderNumber": "ORD-1699876543-abc123",
      "totalPrice": 850000,
      "finalPrice": 850000,
      "itemCount": 2,
      "paymentStatus": "Paid",
      "shipmentStatus": "Delivered"
    },
    "orderItems": [
      {
        "productName": "SWE RING BOXY TEE",
        "brand": "SWE",
        "color": "Black",
        "size": "M",
        "quantity": 1,
        "price": 650000,
        "subPrice": 650000,
        "image": "https://..."
      }
    ],
    "timestamp": "2025-11-14T..."
  }
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
