const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const productService = require('../services/productService');

/**
 * POST /api/chat/message
 * Send a message to the chatbot
 */
router.post('/message', async (req, res) => {
  try {
    const { message, conversationHistory = [], userId = null } = req.body;

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

    // Extract search intent from message
    const intent = await geminiService.extractSearchIntent(message);
    console.log('Extracted intent:', intent);

    let productsData = [];
    let additionalContext = '';

    // If it's a search/recommendation intent, fetch products
    if (intent.intent === 'search' || intent.intent === 'recommendation') {
      if (intent.intent === 'recommendation' && userId) {
        // Get personalized recommendations
        productsData = await productService.getPersonalizedRecommendations(userId, 5);
        additionalContext = `\n\nI found ${productsData.length} personalized recommendations for you based on your preferences.`;
      } else if (intent.category || intent.brand || intent.color) {
        // Search products with filters
        productsData = await productService.searchProducts({
          category: intent.category,
          brand: intent.brand,
          gender: intent.gender,
          color: intent.color,
          limit: 5
        });
        additionalContext = `\n\nI found ${productsData.length} products matching your criteria.`;
      }
    }

    // Add product info to context if available
    let enhancedMessage = message;
    if (productsData.length > 0) {
      const productSummary = productsData.map((p, i) => 
        `${i + 1}. ${p.name || p.displayName} - ${p.brand || 'Unknown Brand'} (₫${(p.defaultPrice || p.price || 0).toLocaleString()})`
      ).join('\n');
      
      enhancedMessage += `\n\nAvailable products:\n${productSummary}\n\nProvide a helpful response mentioning these products.`;
    }

    // Generate AI response
    const aiResponse = await geminiService.generateResponse(enhancedMessage, conversationHistory);

    res.json({
      success: true,
      data: {
        message: aiResponse + additionalContext,
        intent: intent.intent,
        products: productsData.map(p => ({
          id: p._id,
          name: p.name || p.displayName,
          brand: p.brand,
          price: p.defaultPrice || p.price,
          image: p.imageUrls?.[0] || p.images?.[0]?.url || p.images?.[0]
        })),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
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
    const productContext = `
Product Information:
- Name: ${product.name || product.displayName}
- Brand: ${product.brand}
- Price: ₫${(product.defaultPrice || product.price || 0).toLocaleString()}
- Gender: ${product.gender}
- Category: ${product.categoryId?.articleType || 'Unknown'}
- Color: ${product.baseColour}
- Season: ${product.season}
- Description: ${product.productDisplayName || 'No description available'}

User question: ${question}

Please answer the user's question about this product clearly and concisely.`;

    const aiResponse = await geminiService.generateResponse(productContext, []);

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

    // Build context for AI
    const productList = products.map((p, i) => 
      `${i + 1}. ${p.name || p.displayName} by ${p.brand} - ₫${(p.defaultPrice || p.price || 0).toLocaleString()}`
    ).join('\n');

    const prompt = `Based on the user's shopping history and preferences${preferences ? ` (${preferences})` : ''}, here are some recommended products:

${productList}

Provide a friendly 2-3 sentence explanation of why these products might interest the user. Be enthusiastic and helpful!`;

    const aiResponse = await geminiService.generateResponse(prompt, []);

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

module.exports = router;
