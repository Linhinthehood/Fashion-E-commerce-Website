const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const productService = require('../services/productService');
const orderService = require('../services/orderService');
const userService = require('../services/userService');
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

    // Handle ORDER queries
    if (intent.intent === 'order') {
      // Check if userId is provided
      if (!userId || userId === 'anonymous') {
        const aiResponse = "I'd love to help you check your orders, but you'll need to be logged in first. Please sign in to view your order history and track your packages!";
        
        logger.logConversation(userId, 'assistant', aiResponse);
        conversationCache.addMessage(userId, 'user', message);
        conversationCache.addMessage(userId, 'model', aiResponse);

        return res.json({
          success: true,
          data: {
            message: aiResponse,
            intent: intent.intent,
            requiresAuth: true,
            orders: [],
            timestamp: new Date().toISOString()
          }
        });
      }

      // VALIDATE USER AUTHENTICATION
      const isAuthenticated = await userService.isUserAuthenticated(userId);
      
      if (!isAuthenticated) {
        const aiResponse = "I couldn't verify your login status. Please make sure you're logged in to view your orders. If you're having trouble, try logging out and back in again.";
        
        logger.warn('Order query with invalid/unauthenticated userId', { userId });
        logger.logConversation(userId, 'assistant', aiResponse);
        conversationCache.addMessage(userId, 'user', message);
        conversationCache.addMessage(userId, 'model', aiResponse);

        return res.status(401).json({
          success: false,
          message: aiResponse,
          intent: intent.intent,
          requiresAuth: true,
          authenticated: false,
          timestamp: new Date().toISOString()
        });
      }

      // User is authenticated - proceed to fetch orders
      logger.info('Authenticated user requesting orders', { userId });
      const orders = await orderService.getRecentOrders(userId, 10);
      
      let aiResponse;
      if (orders.length === 0) {
        aiResponse = "You don't have any orders yet! Browse our collection and place your first order to start your fashion journey with us.";
      } else {
        // Build order context
        const orderSummary = orders.map((order, idx) => {
          const statusIcon = order.shipmentStatus === 'Delivered' ? '✅' : 
                            order.shipmentStatus === 'Packed' ? '📦' : 
                            order.shipmentStatus === 'Pending' ? '⏳' : '🔄';
          return `${idx + 1}. Order ${order.orderNumber} - ₫${order.finalPrice.toLocaleString()} - ${order.itemCount} items - ${statusIcon} ${order.shipmentStatus} - ${order.paymentStatus}`;
        }).join('\n');

        const orderContext = `User has ${orders.length} orders:\n${orderSummary}`;
        const prompt = `${message}\n\nORDER INFORMATION:\n${orderContext}\n\nProvide a helpful summary of the user's orders in a friendly way.`;
        
        aiResponse = await geminiService.generateResponse(
          prompt,
          conversationHistory,
          null,
          { intent: 'order' }
        );
      }

      logger.logConversation(userId, 'assistant', aiResponse);
      conversationCache.addMessage(userId, 'user', message);
      conversationCache.addMessage(userId, 'model', aiResponse);

      return res.json({
        success: true,
        data: {
          message: aiResponse,
          intent: intent.intent,
          orders: orders.map(order => ({
            id: order._id,
            orderNumber: order.orderNumber,
            totalPrice: order.totalPrice,
            finalPrice: order.finalPrice,
            itemCount: order.itemCount,
            paymentStatus: order.paymentStatus,
            shipmentStatus: order.shipmentStatus,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt
          })),
          timestamp: new Date().toISOString()
        }
      });
    }

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
        // For recommendation requests with multiple article types (outfit suggestions)
        if (intent.articleTypes && Array.isArray(intent.articleTypes) && intent.articleTypes.length > 0) {
          searchAttempted = true;
          logger.info('Recommendation with multiple article types', { 
            userId, 
            articleTypes: intent.articleTypes,
            occasion: intent.occasion 
          });
          
          // Search for each article type and combine results
          const productPromises = intent.articleTypes.map(async (articleType) => {
            const filters = {
              articleType: articleType,
              gender: intent.gender,
              brand: intent.brand,
              color: intent.color,
              limit: 5 // Limit per type to get variety
            };
            return await productService.searchProducts(filters);
          });
          
          const productArrays = await Promise.all(productPromises);
          productsData = productArrays.flat(); // Combine all results
          
          // Also include unisex items if gender specified
          if (intent.gender && (intent.gender === 'Male' || intent.gender === 'Female')) {
            const unisexPromises = intent.articleTypes.map(async (articleType) => {
              return await productService.searchProducts({
                articleType: articleType,
                gender: 'Unisex',
                limit: 3
              });
            });
            const unisexArrays = await Promise.all(unisexPromises);
            const unisexProducts = unisexArrays.flat();
            productsData = [...productsData, ...unisexProducts];
          }
          
          // Remove duplicates
          productsData = Array.from(
            new Map(productsData.map(p => [p._id.toString(), p])).values()
          );
          
          logger.info('Multi-type recommendation results', {
            userId,
            totalProducts: productsData.length,
            byType: intent.articleTypes.map(type => ({
              type,
              count: productsData.filter(p => p.articleType === type).length
            }))
          });
        }
        // For recommendation requests with single criteria
        else if (userId && userId !== 'anonymous') {
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

/**
 * POST /api/chat/orders
 * Get user's orders and provide AI response
 */
router.post('/orders', async (req, res) => {
  try {
    const { userId, question = 'Show me my orders' } = req.body;

    if (!userId || userId === 'anonymous') {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to fetch orders. Please log in to view your orders.',
        requiresAuth: true
      });
    }

    // VALIDATE USER AUTHENTICATION
    const isAuthenticated = await userService.isUserAuthenticated(userId);
    
    if (!isAuthenticated) {
      logger.warn('Unauthenticated order request', { userId });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again to view your orders.',
        requiresAuth: true,
        authenticated: false
      });
    }

    if (!geminiService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Chatbot service is not configured'
      });
    }

    // User is authenticated - proceed
    logger.info('Authenticated user fetching orders', { userId });

    // Load conversation history
    const conversationHistory = conversationCache.getHistory(userId);

    // Fetch user's recent orders (last 10)
    const orders = await orderService.getRecentOrders(userId, 10);

    let aiResponse;
    
    if (orders.length === 0) {
      aiResponse = "You don't have any orders yet! Browse our collection and place your first order to start your fashion journey with us.";
    } else {
      // Build order context for AI
      const orderSummary = orders.map((order, idx) => {
        const statusIcon = order.shipmentStatus === 'Delivered' ? '✅' : 
                          order.shipmentStatus === 'Packed' ? '📦' : 
                          order.shipmentStatus === 'Pending' ? '⏳' : '🔄';
        
        return `${idx + 1}. Order ${order.orderNumber} - ₫${order.finalPrice.toLocaleString()} - ${order.itemCount} items - ${statusIcon} ${order.shipmentStatus} - ${order.paymentStatus}`;
      }).join('\n');

      const orderContext = `User has ${orders.length} orders:\n${orderSummary}`;

      // Generate AI response about orders
      const prompt = `${question}\n\nORDER INFORMATION:\n${orderContext}\n\nProvide a helpful summary of the user's orders.`;
      
      aiResponse = await geminiService.generateResponse(
        prompt,
        conversationHistory,
        null,
        { intent: 'question' }
      );
    }

    // Save to conversation history
    conversationCache.addMessage(userId, 'user', question);
    conversationCache.addMessage(userId, 'model', aiResponse);

    res.json({
      success: true,
      data: {
        message: aiResponse,
        orders: orders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          totalPrice: order.totalPrice,
          finalPrice: order.finalPrice,
          itemCount: order.itemCount,
          paymentStatus: order.paymentStatus,
          shipmentStatus: order.shipmentStatus,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt
        })),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get orders'
    });
  }
});

/**
 * POST /api/chat/order/:orderId
 * Get specific order details and answer questions about it
 */
router.post('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId, question = 'Tell me about this order' } = req.body;

    if (!userId || userId === 'anonymous') {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to fetch order details',
        requiresAuth: true
      });
    }

    // VALIDATE USER AUTHENTICATION
    const isAuthenticated = await userService.isUserAuthenticated(userId);
    
    if (!isAuthenticated) {
      logger.warn('Unauthenticated order details request', { userId, orderId });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again to view order details.',
        requiresAuth: true,
        authenticated: false
      });
    }

    if (!geminiService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Chatbot service is not configured'
      });
    }

    // User is authenticated - proceed
    logger.info('Authenticated user fetching order details', { userId, orderId });

    // Fetch order details
    const orderData = await orderService.getOrderById(orderId);

    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const { order, orderItems } = orderData;

    // VERIFY ORDER BELONGS TO USER
    if (order.userId.toString() !== userId) {
      logger.warn('User attempted to access another user\'s order', { 
        userId, 
        orderId, 
        orderUserId: order.userId 
      });
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this order'
      });
    }

    // Load conversation history
    const conversationHistory = conversationCache.getHistory(userId);

    // Build detailed order context
    const itemsList = orderItems.map((item, idx) => 
      `${idx + 1}. ${item.productName} - ${item.brand} - Size: ${item.size} - Color: ${item.color} - Qty: ${item.quantity} - ₫${item.subPrice.toLocaleString()}`
    ).join('\n');

    const orderContext = `Order ${order.orderNumber}
Total: ₫${order.finalPrice.toLocaleString()} (${order.itemCount} items)
Payment: ${order.paymentStatus} via ${order.paymentMethod}
Shipping: ${order.shipmentStatus}
Created: ${new Date(order.createdAt).toLocaleDateString()}

Items:
${itemsList}`;

    const prompt = `${question}\n\nORDER DETAILS:\n${orderContext}\n\nAnswer the user's question about this order.`;

    const aiResponse = await geminiService.generateResponse(
      prompt,
      conversationHistory,
      null,
      { intent: 'question' }
    );

    // Save to conversation history
    conversationCache.addMessage(userId, 'user', question);
    conversationCache.addMessage(userId, 'model', aiResponse);

    res.json({
      success: true,
      data: {
        message: aiResponse,
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          totalPrice: order.totalPrice,
          finalPrice: order.finalPrice,
          discount: order.discount,
          itemCount: order.itemCount,
          paymentStatus: order.paymentStatus,
          shipmentStatus: order.shipmentStatus,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt
        },
        orderItems: orderItems.map(item => ({
          productName: item.productName,
          brand: item.brand,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          subPrice: item.subPrice,
          image: item.image
        })),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get order details'
    });
  }
});

module.exports = router;