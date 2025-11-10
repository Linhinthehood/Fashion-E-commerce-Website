const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    
    if (!this.apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not set. Chatbot will not work.');
      this.genAI = null;
      return;
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    // Use gemini-1.5-flash for text generation (gemini-2.5-flash-live is for Live API only)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    
    // System context for fashion e-commerce
    this.systemContext = `You are a helpful AI shopping assistant for a fashion e-commerce website.

Your role:
- Help customers find products (clothes, shoes, accessories)
- Answer questions about products, brands, categories
- Provide fashion advice and recommendations
- Assist with size, color, and style queries
- Be friendly, concise, and helpful

Available product categories:
- Apparel (Topwear, Bottomwear, Innerwear)
- Footwear (Shoes, Flip Flops, Sandals)
- Accessories (Bags, Watches, Sunglasses, Belts, Wallets)

Guidelines:
- Keep responses under 150 words
- Be conversational and friendly
- If asked about specific products, suggest using product search
- Don't make up product details - ask for clarification
- Format recommendations in bullet points when listing items`;

    console.log('✓ Gemini AI initialized with model: gemini-1.5-flash');
  }

  /**
   * Generate a chat response using Gemini
   * @param {string} userMessage - The user's message
   * @param {Array} conversationHistory - Previous messages [{role: 'user'|'model', content: string}]
   * @returns {Promise<string>} - AI response
   */
  async generateResponse(userMessage, conversationHistory = []) {
    if (!this.genAI) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }

    try {
      // Build conversation context
      const chatHistory = conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Start chat with history
      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: this.systemContext }]
          },
          {
            role: 'model',
            parts: [{ text: 'Understood! I\'m ready to help customers with their fashion shopping needs. How can I assist you today?' }]
          },
          ...chatHistory
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 500,
        },
      });

      const result = await chat.sendMessage(userMessage);
      const response = result.response;
      return response.text();

    } catch (error) {
      console.error('Gemini API error:', error);
      
      // Handle specific errors
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key. Please check your configuration.');
      }
      if (error.message?.includes('RATE_LIMIT')) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Generate product search query from natural language
   * @param {string} userMessage - User's natural language query
   * @returns {Promise<Object>} - Structured search parameters
   */
  async extractSearchIntent(userMessage) {
    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    const prompt = `Extract product search parameters from this user query: "${userMessage}"

Return a JSON object with these fields (only include if mentioned):
{
  "category": "masterCategory name (Apparel, Footwear, Accessories)",
  "subCategory": "subCategory name if specified",
  "articleType": "specific type (Shirt, Jeans, Shoes, etc.)",
  "brand": "brand name if mentioned",
  "color": "color if mentioned",
  "gender": "Men, Women, Boys, Girls, or Unisex",
  "priceRange": "budget|affordable|mid-range|premium|luxury",
  "intent": "search|recommendation|question|general"
}

Examples:
"Show me red Nike shoes" -> {"category": "Footwear", "articleType": "Shoes", "brand": "Nike", "color": "Red", "intent": "search"}
"I need affordable men's shirts" -> {"category": "Apparel", "articleType": "Shirt", "gender": "Men", "priceRange": "affordable", "intent": "search"}
"What's trending?" -> {"intent": "recommendation"}

Return ONLY valid JSON, no explanation.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = response.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      return JSON.parse(jsonText);

    } catch (error) {
      console.error('Failed to extract search intent:', error);
      // Return default intent if parsing fails
      return { intent: 'general' };
    }
  }

  /**
   * Check if Gemini service is available
   * @returns {boolean}
   */
  isAvailable() {
    return !!this.genAI;
  }
}

module.exports = new GeminiService();
