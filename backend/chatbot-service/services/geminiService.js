const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const promptLoader = require('../utils/promptLoader');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    
    if (!this.apiKey) {
      logger.error('GEMINI_API_KEY not set. Chatbot will not work.');
      this.genAI = null;
      return;
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite'
    });

    this.lastRequestTime = 0;
    this.minRequestInterval = 2000;

    logger.info('Gemini AI initialized successfully');
  }

  async generateResponse(userMessage, conversationHistory = [], productContext = null, intent = null) {
    await this.waitForRateLimit();

    if (!this.genAI) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }

    try {
      // Load system context from prompt file
      const systemContext = promptLoader.loadPrompt('system-context');

      // Build enhanced message with product context
      let enhancedMessage = userMessage;
      
      // FIXED: Only add product context for search/recommendation intents
      if (intent && (intent.intent === 'search' || intent.intent === 'recommendation')) {
        if (productContext && productContext.products && productContext.products.length > 0) {
          // Format products clearly for the AI
          const productList = productContext.products.map((p, idx) => 
            `${idx + 1}. ${p.name} - ${p.brand} (₫${p.defaultPrice?.toLocaleString() || 'N/A'}) [Gender: ${p.gender}, Color: ${p.color}]`
          ).join('\n');
          
          enhancedMessage = `User question: "${userMessage}"

AVAILABLE PRODUCTS (${productContext.products.length} total):
${productList}

IMPORTANT: 
- Only mention products from the list above
- Count = ${productContext.products.length} products
- If asked "how many", answer: "${productContext.products.length}"
- Never mention products not in this list`;
        } else {
          // No products found - handle based on intent
          if (intent.intent === 'recommendation') {
            enhancedMessage = `User question: "${userMessage}"

AVAILABLE PRODUCTS: None found

IMPORTANT: 
- This is a RECOMMENDATION request asking for styling advice
- Provide helpful fashion advice even though we don't have products in stock
- If asking about pairing items (pants with shirts, shoes with outfits), give style suggestions
- Be educational about fashion coordination and color matching
- Example: "Shirts pair well with dress pants for formal looks, jeans for casual wear, or chinos for business casual"`;
          } else if (intent.intent === 'search') {
            enhancedMessage = `User question: "${userMessage}"

AVAILABLE PRODUCTS: None found

IMPORTANT: Since no products were found, politely inform the user we don't have those items in stock right now.`;
          }
        }
      } else {
        // For general, question, or out-of-topic intents - don't mention products at all
        enhancedMessage = `User question: "${userMessage}"

INTENT: ${intent?.intent || 'general'}

IMPORTANT: 
- This is a ${intent?.intent || 'general'} conversation
- DO NOT mention product availability or stock
- Respond naturally based on the intent type as described in your instructions`;
      }

      // Build chat history
      const chatHistory = conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemContext }]
          },
          {
            role: 'model',
            parts: [{ text: 'Hello! I\'m here to help you find fashion items. What are you looking for today?' }]
          },
          ...chatHistory
        ],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent responses
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 300,
        },
      });

      const result = await chat.sendMessage(enhancedMessage);
      const response = result.response;
      const text = typeof response.text === 'function' ? response.text() : (response.text || '');
      
      logger.info('Generated AI response', { 
        messageLength: userMessage.length, 
        responseLength: text.length,
        productsProvided: productContext?.products?.length || 0,
        intent: intent?.intent || 'unknown'
      });
      
      return text;

    } catch (error) {
      logger.error('Gemini API error', { error: error.message });
      
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key. Please check your configuration.');
      }
      
      if (error.message?.includes('RATE_LIMIT') || error.message?.includes('429')) {
        throw new Error('System is busy. Please try again in a moment.');
      }
      
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Extract search intent from user message
   */
  async extractSearchIntent(userMessage) {
    await this.waitForRateLimit();
    
    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    try {
      // Load intent extraction prompt and substitute user message
      const prompt = promptLoader.loadPrompt('intent-extraction', {
        userMessage: userMessage
      });

      const result = await this.model.generateContent(prompt);
      const responseText = typeof result.response.text === 'function' 
        ? result.response.text() 
        : (result.response.text || '');

      let jsonText = responseText.trim();
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonText);
      
      // Validate and normalize
      const validIntent = ['search', 'recommendation', 'question', 'general', 'order', 'out-of-topic'];
      if (!parsed.intent || !validIntent.includes(parsed.intent)) {
        parsed.intent = 'general';
      }

      // Normalize gender values
      if (parsed.gender) {
        const genderLower = parsed.gender.toLowerCase();
        if (genderLower === 'men' || genderLower === 'male') {
          parsed.gender = 'Male';
        } else if (genderLower === 'women' || genderLower === 'female') {
          parsed.gender = 'Female';
        } else if (genderLower === 'unisex') {
          parsed.gender = 'Unisex';
        }
      }

      // Convert null strings to actual null
      Object.keys(parsed).forEach(key => {
        if (parsed[key] === 'null' || parsed[key] === '') {
          parsed[key] = null;
        }
      });

      logger.info('Extracted search intent', { 
        message: userMessage.substring(0, 50), 
        intent: parsed 
      });

      return parsed;

    } catch (error) {
      logger.error('Failed to extract search intent', { error: error.message });
      return { intent: 'general' };
    }
  }

  isAvailable() {
    return !!this.genAI;
  }

  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
}

module.exports = new GeminiService();