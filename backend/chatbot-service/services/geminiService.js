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
      // ENHANCED: Load different system context based on intent
      let systemContext;
      let enhancedMessage = userMessage;
      
      // Use order-specific context for order queries
      if (intent && intent.intent === 'order') {
        systemContext = promptLoader.loadPrompt('order-context');
        
        // For orders, the message should already be enhanced in chat.js with order data
        // Just pass it through
        enhancedMessage = userMessage;
        
        logger.info('Using order-specific context', { intent: intent.intent });
      } else {
        // Use product context for search/recommendation/general
        systemContext = promptLoader.loadPrompt('system-context');
        
        // Build enhanced message with product context
        if (intent && (intent.intent === 'search' || intent.intent === 'recommendation')) {
          if (productContext && productContext.products && productContext.products.length > 0) {
            // Format products clearly for the AI
            const productList = productContext.products.map((p, idx) => 
              `${idx + 1}. ${p.name} - ${p.brand} (₫${p.defaultPrice?.toLocaleString() || 'N/A'}) [Gender: ${p.gender}, Color: ${p.color}, Usage: ${p.usage || 'N/A'}]`
            ).join('\n');
            
            // ENHANCED: Stronger anti-hallucination rules
            enhancedMessage = `User question: "${userMessage}"

AVAILABLE PRODUCTS (${productContext.products.length} total):
${productList}

🚨 CRITICAL RULES - VIOLATIONS WILL CAUSE SYSTEM FAILURE:
1. NEVER invent or make up product names that are not in the list above
2. NEVER mention specific product names in your response
3. If asked for a specific product name, check if it EXISTS in the list:
   - If it EXISTS → Say "Great choice! I found it for you"
   - If it DOES NOT EXIST → Say "I don't see that specific product, but here are similar options"
4. The UI will show product cards - you do NOT need to describe products
5. Keep response under 2 sentences
6. Only mention the COUNT: "${productContext.products.length} products"
7. DO NOT write product names like "Áo Blouse..." - let the UI show them

REMEMBER: The product cards below your message will show all details. You just provide a friendly intro!`;
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
        
        logger.info('Using product-specific context', { intent: intent?.intent || 'general' });
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
            parts: [{ text: intent?.intent === 'order' 
              ? 'Hello! I\'m here to help you with your orders. What would you like to know?' 
              : 'Hello! I\'m here to help you find fashion items. What are you looking for today?' 
            }]
          },
          ...chatHistory
        ],
        generationConfig: {
          temperature: 0.3,
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
        intent: intent?.intent || 'unknown',
        contextUsed: intent?.intent === 'order' ? 'order-context' : 'system-context'
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
   * ENHANCED: Now includes fallback logic to detect outfit requests
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

      // ENHANCED: Use higher temperature for better intent detection
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 500
        }
      });

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

      // ===== ENHANCEMENT: Auto-detect outfit requests that Gemini missed =====
      if (parsed.intent === 'recommendation' || parsed.intent === 'search') {
        const message = userMessage.toLowerCase();
        
        // Detect outfit keywords
        const outfitKeywords = ['outfit', 'complete look', 'group', 'matching', 'pair', 'set', 'combination'];
        const hasOutfitKeyword = outfitKeywords.some(kw => message.includes(kw));
        
        // Detect multiple product mentions
        const mentionsShirt = /shirt|top|tee|blouse/.test(message);
        const mentionsPants = /pant|trouser|jean|bottom/.test(message);
        const mentionsShoes = /shoe|footwear|sandal/.test(message);
        const mentionsAccessories = /watch|cap|hat|wallet|accessori/.test(message);
        
        const mentionedTypes = [
          mentionsShirt ? 'Shirt' : null,
          mentionsPants ? 'Pants' : null,
          mentionsShoes ? 'Casual shoes' : null,
          mentionsAccessories ? 'Watch' : null
        ].filter(Boolean);
        
        const multipleProductTypes = mentionedTypes.length >= 2;
        
        // Detect conjunctions suggesting multiple items
        const hasConjunction = /\band\b|\bwith\b|\bplus\b/.test(message);
        
        // CRITICAL: Detect style words like "formal", "casual", "sport" as occasions
        const styleWords = {
          'formal': 'formal',
          'casual': 'casual', 
          'sport': 'sport',
          'sporty': 'sport',
          'gym': 'gym',
          'workout': 'gym'
        };
        
        for (const [word, occasion] of Object.entries(styleWords)) {
          if (message.includes(word) && !parsed.occasion) {
            parsed.occasion = occasion;
            logger.info('🎯 Detected style word as occasion', { word, occasion });
          }
        }
        
        // If outfit request OR occasion mentioned OR multiple products mentioned
        // AND articleTypes is not already properly set
        if ((hasOutfitKeyword || multipleProductTypes || (parsed.occasion && hasConjunction)) && 
            (!parsed.articleTypes || parsed.articleTypes.length < 2)) {
          
          // Build articleTypes based on what was mentioned
          if (mentionedTypes.length >= 2) {
            // User explicitly mentioned multiple types
            parsed.articleTypes = mentionedTypes;
          } else if (parsed.occasion) {
            // User mentioned occasion - provide complete outfit
            parsed.articleTypes = ['Shirt', 'Pants'];
            // Add accessories for formal occasions
            if (['wedding', 'interview', 'formal', 'work'].includes(parsed.occasion)) {
              parsed.articleTypes.push('Watch');
            }
          } else if (hasOutfitKeyword) {
            // Generic outfit request
            parsed.articleTypes = ['Shirt', 'Pants'];
          }
          
          // Remove single articleType if articleTypes array is set
          if (parsed.articleTypes && parsed.articleTypes.length > 0) {
            delete parsed.articleType;
          }
          
          logger.info('🔧 Auto-enhanced articleTypes for outfit request', {
            userMessage: userMessage.substring(0, 80),
            detectedKeyword: outfitKeywords.filter(kw => message.includes(kw)),
            mentionedTypes,
            occasion: parsed.occasion,
            originalArticleType: parsed.articleType,
            enhancedArticleTypes: parsed.articleTypes
          });
        }
      }
      // ===== END ENHANCEMENT =====

      logger.info('Extracted search intent', { 
        message: userMessage.substring(0, 50), 
        intent: parsed,
        hasMultipleTypes: parsed.articleTypes?.length > 1
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