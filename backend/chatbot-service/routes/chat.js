const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const productService = require('../services/productService');
const conversationCache = require('../services/conversationCache');
const logger = require('../utils/logger');

/**
 * POST /api/chat/message
 * Send a message to the chatbot
 * UPDATED: Fixed product context passing and gender filtering
 */
router.post('/message', async (req, res) => {
  try {
    const { message, userId = 'anonymous' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Check if Gemini is configured
    if (!geminiService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Chatbot service is not configured. Please contact administrator.'
      });
    }

    // Load conversation history from cache
    const conversationHistory = conversationCache.getHistory(userId);
    logger.logConversationHistory(userId, conversationHistory.length);

    // Log incoming message
    logger.logConversation(userId, 'user', message);

    // Extract search intent from message
    const intent = await geminiService.extractSearchIntent(message);
    logger.logIntent(userId, intent);

    let productsData = [];
    let searchAttempted = false;
    let searchFilters = null; // Initialize searchFilters at the top scope

    // Handle out-of-topic questions directly
    if (intent.intent === 'out-of-topic') {
      // Generate response directly without product search
      const aiResponse = await geminiService.generateResponse(
        message, 
        conversationHistory,
        null, // No product context for out-of-topic questions
        intent // Pass intent for proper handling
      );
      
      // Log AI response
      logger.logConversation(userId, 'assistant', aiResponse);

      // Save user message and AI response to cache
      conversationCache.addMessage(userId, 'user', message);
      conversationCache.addMessage(userId, 'model', aiResponse);

      res.json({
        success: true,
        data: {
          message: aiResponse,
          intent: intent.intent,
          productsFound: 0,
          products: [],
          timestamp: new Date().toISOString()
        }
      });
      return; // Exit early for out-of-topic questions
    }

    // If it's a search/recommendation intent, fetch products
    if (intent.intent === 'search' || intent.intent === 'recommendation') {
      if (intent.intent === 'recommendation') {
        // For recommendation requests, try different approaches
        if (userId && userId !== 'anonymous') {
          // Get personalized recommendations if user is logged in
          searchAttempted = true;
          productsData = await productService.getPersonalizedRecommendations(userId, 10);
        } else if (intent.category || intent.articleType || intent.gender || intent.color) {
          // If user specified some criteria, search for matching products
          searchAttempted = true;
          searchFilters = {
            category: intent.category,
            articleType: intent.articleType,
            brand: intent.brand,
            gender: intent.gender,
            color: intent.color,
            limit: 15
          };
          productsData = await productService.searchProducts(searchFilters);
        } else {
          // For general recommendations without specific criteria, get a diverse selection
          searchAttempted = true;
          productsData = await productService.getGeneralRecommendations(12);
        }
      } else if (intent.intent === 'search') {
        // ALWAYS search for products when intent is 'search'
        searchAttempted = true;
        
        searchFilters = {
          category: intent.category,
          articleType: intent.articleType,
          brand: intent.brand,
          gender: intent.gender,
          color: intent.color,
          limit: 20 // Increased limit for better results
        };
        
        productsData = await productService.searchProducts(searchFilters);
        
        // IMPORTANT FIX: If gender filter is Male or Female, also include Unisex items
        if (intent.gender && (intent.gender === 'Male' || intent.gender === 'Female')) {
          const unisexFilters = { ...searchFilters, gender: 'Unisex' };
          const unisexProducts = await productService.searchProducts(unisexFilters);
          
          // Combine and remove duplicates based on _id
          const combinedProducts = [...productsData, ...unisexProducts];
          const uniqueProducts = Array.from(
            new Map(combinedProducts.map(p => [p._id.toString(), p])).values()
          );
          productsData = uniqueProducts;
          
          logger.info('Combined gender-specific and unisex products', {
            userId,
            originalCount: productsData.length - unisexProducts.length,
            unisexCount: unisexProducts.length,
            totalCount: productsData.length
          });
        }
        
        // Log search results to file
        logger.logSearch(userId, searchFilters, productsData.length);
      }
    }

    // UPDATED: Build enhanced message with strict product context
    let productContext = null;
    if (productsData.length > 0) {
      // Format product details with gender and all relevant info
      const productList = productsData.map((p, i) => 
        `${i + 1}. ${p.name || p.displayName} - ${p.brand || 'Unknown'} (₫${(p.defaultPrice || p.price || 0).toLocaleString()}) [Gender: ${p.gender}, Color: ${p.color}]`
      ).join('\n');
      
      productContext = {
        products: productsData,
        intent: intent
      };
      
      logger.info('Passing product context to AI', {
        userId,
        productCount: productsData.length,
        genderFilter: intent.gender
      });
    } else if (searchAttempted) {
      // We searched but found nothing - pass empty array
      productContext = {
        products: [],
        intent: intent
      };
      
      logger.info('No products found, passing empty context', {
        userId,
        filters: searchFilters
      });
    }

    // Generate AI response with product context (UPDATED METHOD SIGNATURE)
    const aiResponse = await geminiService.generateResponse(
      message, 
      conversationHistory,
      productContext, // Pass product context as third parameter
      intent // Pass intent to help with response generation
    );
    
    // Log AI response
    logger.logConversation(userId, 'assistant', aiResponse);

    // Save user message and AI response to cache
    conversationCache.addMessage(userId, 'user', message);
    conversationCache.addMessage(userId, 'model', aiResponse);

    res.json({
      success: true,
      data: {
        message: aiResponse,
        intent: intent.intent,
        productsFound: productsData.length,
        products: productsData.map(p => ({
          id: p._id,
          name: p.name || p.displayName,
          brand: p.brand,
          price: p.defaultPrice || p.price,
          gender: p.gender,
          color: p.color,
          image: p.imageUrls?.[0] || p.images?.[0]?.url || p.images?.[0]
        })),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Chat error', {
      userId: req.body.userId || 'anonymous',
      message: req.body.message,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process chat message',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/chat/product-query
 * Ask about a specific product
 */
router.post('/product-query', async (req, res) => {
  try {
    const { productId, question } = req.body;

    if (!productId || !question) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and question are required'
      });
    }

    if (!geminiService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Chatbot service is not configured'
      });
    }

    // Fetch product details
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Build context with product details
    const productContext = {
      products: [product],
      intent: { intent: 'question' }
    };

    // Generate AI response with product context
    const aiResponse = await geminiService.generateResponse(
      question,
      [],
      productContext,
      { intent: 'question' }
    );

    res.json({
      success: true,
      data: {
        message: aiResponse,
        product: {
          id: product._id,
          name: product.name || product.displayName,
          brand: product.brand,
          price: product.defaultPrice || product.price
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Product query error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process product query'
    });
  }
});

/**
 * POST /api/chat/recommendations
 * Get AI-powered product recommendations with explanation
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { userId, preferences = '', limit = 8 } = req.body;

    if (!geminiService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Chatbot service is not configured'
      });
    }

    // Get personalized recommendations
    const products = await productService.getPersonalizedRecommendations(userId, limit);

    if (products.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'I couldn\'t find personalized recommendations at the moment. Try browsing our catalog or tell me what you\'re looking for!',
          products: [],
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build product context for AI
    const productContext = {
      products: products,
      intent: { intent: 'recommendation' }
    };

    const prompt = preferences 
      ? `Recommend products based on user preferences: ${preferences}`
      : 'Recommend these products to the user with enthusiasm';

    const aiResponse = await geminiService.generateResponse(
      prompt,
      [],
      productContext,
      { intent: 'recommendation' }
    );

    res.json({
      success: true,
      data: {
        message: aiResponse,
        products: products.map(p => ({
          id: p._id,
          name: p.name || p.displayName,
          brand: p.brand,
          price: p.defaultPrice || p.price,
          image: p.imageUrls?.[0] || p.images?.[0]?.url || p.images?.[0],
          category: p.categoryId?.articleType
        })),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get recommendations'
    });
  }
});

/**
 * DELETE /api/chat/history/:userId
 * Clear conversation history for a user
 */
router.delete('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    conversationCache.clearHistory(userId);
    
    res.json({
      success: true,
      message: `Conversation history cleared for user: ${userId}`
    });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear history'
    });
  }
});

/**
 * GET /api/chat/history/:userId
 * Get conversation history for a user
 */
router.get('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const history = conversationCache.getHistory(userId);
    
    res.json({
      success: true,
      data: {
        userId,
        messageCount: history.length,
        history
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get history'
    });
  }
});

/**
 * GET /api/chat/stats
 * Get cache statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = conversationCache.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get stats'
    });
  }
});

module.exports = router;