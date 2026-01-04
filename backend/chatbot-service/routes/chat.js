const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const productService = require('../services/productService');
const orderService = require('../services/orderService');
const userService = require('../services/userService');
const conversationCache = require('../services/conversationCache');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Send a message to the chatbot
 *     tags: [Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: User message
 *                 example: "Show me red t-shirts for men"
 *               userId:
 *                 type: string
 *                 description: User ID (optional, defaults to 'anonymous')
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Chatbot response with products/orders
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ChatMessage'
 *       400:
 *         description: Message is required
 *       401:
 *         description: Unauthorized (for order queries)
 *       503:
 *         description: Chatbot service not configured
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
    const conversationHistory = await conversationCache.getHistory(userId);
    logger.logConversationHistory(userId, conversationHistory.length);

    // Log incoming message
    logger.logConversation(userId, 'user', message);

    // Extract search intent from message
    const intent = await geminiService.extractSearchIntent(message);
    logger.logIntent(userId, intent);

    let productsData = [];
    let searchAttempted = false;
    let searchFilters = null;

    // Handle ORDER queries
    if (intent.intent === 'order') {
      // Check if userId is provided
      if (!userId || userId === 'anonymous') {
        const aiResponse = "I'd love to help you check your orders, but you'll need to be logged in first. Please sign in to view your order history and track your packages!";
        
        logger.logConversation(userId, 'assistant', aiResponse);
        await conversationCache.addMessage(userId, 'user', message);
        await conversationCache.addMessage(userId, 'model', aiResponse);

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
        await conversationCache.addMessage(userId, 'user', message);
        await conversationCache.addMessage(userId, 'model', aiResponse);

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
      await conversationCache.addMessage(userId, 'user', message);
      await conversationCache.addMessage(userId, 'model', aiResponse);

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
      const aiResponse = await geminiService.generateResponse(
        message, 
        conversationHistory,
        null,
        intent
      );
      
      logger.logConversation(userId, 'assistant', aiResponse);
      await conversationCache.addMessage(userId, 'user', message);
      await conversationCache.addMessage(userId, 'model', aiResponse);

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
      return;
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
          
          // FIXED: Search for each article type with occasion parameter
          const productPromises = intent.articleTypes.map(async (articleType) => {
            const filters = {
              articleType: articleType,
              gender: intent.gender,
              brand: intent.brand,
              color: intent.color,
              occasion: intent.occasion, // ← ADDED FOR SMART FILTERING
              limit: 10 // Increased for better filtering
            };
            return await productService.searchProducts(filters);
          });
          
          const productArrays = await Promise.all(productPromises);
          productsData = productArrays.flat();
          
          // FIXED: Also include unisex items with occasion
          if (intent.gender && (intent.gender === 'Male' || intent.gender === 'Female')) {
            const unisexPromises = intent.articleTypes.map(async (articleType) => {
              return await productService.searchProducts({
                articleType: articleType,
                gender: 'Unisex',
                occasion: intent.occasion, // ← ADDED FOR SMART FILTERING
                limit: 5
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
            occasion: intent.occasion,
            byType: intent.articleTypes.map(type => ({
              type,
              count: productsData.filter(p => {
                // Try to match by category articleType
                if (p.categoryId && p.categoryId.articleType) {
                  return p.categoryId.articleType === type;
                }
                // Fallback: match by name
                return p.name.toLowerCase().includes(type.toLowerCase());
              }).length
            }))
          });
        }
        // For recommendation requests with single criteria
        else if (userId && userId !== 'anonymous') {
          searchAttempted = true;
          
          // Try personalized recommendations first
          try {
            productsData = await productService.getPersonalizedRecommendations(userId, 8);
            logger.info('Using personalized recommendations', { 
              userId, 
              count: productsData.length 
            });
          } catch (error) {
            logger.warn('Personalized recommendations failed, using search fallback', { 
              userId, 
              error: error.message 
            });
            productsData = [];
          }
          
          // FIXED: Fallback to search with filters including occasion
          if (productsData.length === 0) {
            searchFilters = {
              category: intent.category,
              articleType: intent.articleType,
              brand: intent.brand,
              gender: intent.gender,
              color: intent.color,
              occasion: intent.occasion, // ← ADDED FOR SMART FILTERING
              limit: 10
            };
            
            productsData = await productService.searchProducts(searchFilters);
            logger.info('Fallback search results', { 
              filters: searchFilters, 
              count: productsData.length 
            });
          }
        } else {
          // Anonymous user - use general search with filters
          searchAttempted = true;
          searchFilters = {
            category: intent.category,
            articleType: intent.articleType,
            brand: intent.brand,
            gender: intent.gender,
            color: intent.color,
            occasion: intent.occasion, // ← ADDED FOR SMART FILTERING
            limit: 10
          };
          
          productsData = await productService.searchProducts(searchFilters);
        }
      } else {
        // SEARCH intent - direct product lookup
        searchAttempted = true;
        
        // FIXED: Build search filters with occasion
        searchFilters = {
          category: intent.category,
          articleType: intent.articleType,
          brand: intent.brand,
          gender: intent.gender,
          color: intent.color,
          occasion: intent.occasion, // ← ADDED FOR SMART FILTERING
          limit: 20 // Higher limit for search, filtering will reduce it
        };
        
        productsData = await productService.searchProducts(searchFilters);
        
        logger.info('Direct search results', { 
          userId,
          filters: searchFilters,
          count: productsData.length,
          occasion: intent.occasion
        });
      }
      
      // Include Unisex items for gendered searches
      if (productsData.length > 0 && 
          intent.gender && 
          (intent.gender === 'Male' || intent.gender === 'Female') &&
          (!intent.articleTypes || intent.articleTypes.length === 0)) {
        
        try {
          // FIXED: Add occasion to unisex search
          const unisexFilters = {
            ...searchFilters,
            gender: 'Unisex',
            occasion: intent.occasion, // ← ADDED FOR SMART FILTERING
            limit: 5
          };
          
          const unisexProducts = await productService.searchProducts(unisexFilters);
          
          if (unisexProducts.length > 0) {
            productsData = [...productsData, ...unisexProducts];
            
            // Remove duplicates by ID
            productsData = Array.from(
              new Map(productsData.map(p => [p._id.toString(), p])).values()
            );
            
            logger.info('Added unisex products', { 
              unisexCount: unisexProducts.length,
              totalCount: productsData.length 
            });
          }
        } catch (error) {
          logger.warn('Failed to fetch unisex products', { error: error.message });
        }
      }
    }

    // Generate AI response with product context
    const productContext = productsData.length > 0 ? { products: productsData } : null;
    
    const aiResponse = await geminiService.generateResponse(
      message,
      conversationHistory,
      productContext,
      intent
    );

    // Log AI response
    logger.logConversation(userId, 'assistant', aiResponse);

    // Format products for response
    const formattedProducts = productsData.map(product => ({
      id: product._id || product.id,
      name: product.name,
      brand: product.brand,
      price: product.defaultPrice || product.price,
      gender: product.gender,
      color: product.color,
      usage: product.usage, // Include usage for frontend debugging
      image: (product.images && product.images[0]) || product.image || null,
      categoryId: product.categoryId
    }));

    // Save to conversation cache
    await conversationCache.addMessage(userId, 'user', message);
    await conversationCache.addMessage(userId, 'model', aiResponse);

    // Send response
    res.json({
      success: true,
      data: {
        message: aiResponse,
        intent: intent.intent,
        occasion: intent.occasion, // Include occasion in response for debugging
        productsFound: formattedProducts.length,
        products: formattedProducts,
        searchFilters: searchFilters,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    logger.error('Chat message error', { error: error.message, stack: error.stack });
    
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while processing your request'
    });
  }
});

/**
 * @swagger
 * /api/chat/clear:
 *   post:
 *     summary: Clear conversation history for a user
 *     tags: [Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID (defaults to 'anonymous')
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Conversation history cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Failed to clear conversation history
 */
router.post('/clear', async (req, res) => {
  try {
    const { userId = 'anonymous' } = req.body;
    
    await conversationCache.clearHistory(userId);
    logger.info('Conversation history cleared', { userId });
    
    res.json({
      success: true,
      message: 'Conversation history cleared'
    });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear conversation history'
    });
  }
});

/**
 * @swagger
 * /api/chat/orders:
 *   post:
 *     summary: Get user's orders with AI assistance
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "507f1f77bcf86cd799439011"
 *               question:
 *                 type: string
 *                 description: Question about orders
 *                 default: "Show me my orders"
 *                 example: "What are my recent orders?"
 *     responses:
 *       200:
 *         description: Orders retrieved successfully with AI response
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                         orders:
 *                           type: array
 *                           items:
 *                             type: object
 *                         timestamp:
 *                           type: string
 *       400:
 *         description: User ID is required
 *       401:
 *         description: Unauthorized or invalid session
 *       503:
 *         description: Chatbot service not configured
 */
router.post('/orders', async (req, res) => {
  try {
    const { userId, question = 'Show me my orders' } = req.body;

    if (!userId || userId === 'anonymous') {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to fetch orders',
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
    const conversationHistory = await conversationCache.getHistory(userId);

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
    await conversationCache.addMessage(userId, 'user', question);
    await conversationCache.addMessage(userId, 'model', aiResponse);

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
 * @swagger
 * /api/chat/order/{orderId}:
 *   post:
 *     summary: Get specific order details and answer questions about it
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *         example: "507f1f77bcf86cd799439013"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "507f1f77bcf86cd799439011"
 *               question:
 *                 type: string
 *                 description: Question about the order
 *                 default: "Tell me about this order"
 *                 example: "What items are in this order?"
 *     responses:
 *       200:
 *         description: Order details retrieved successfully with AI response
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                         order:
 *                           type: object
 *                         orderItems:
 *                           type: array
 *                         timestamp:
 *                           type: string
 *       400:
 *         description: User ID is required
 *       401:
 *         description: Unauthorized or invalid session
 *       403:
 *         description: Permission denied (order doesn't belong to user)
 *       404:
 *         description: Order not found
 *       503:
 *         description: Chatbot service not configured
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
    const conversationHistory = await conversationCache.getHistory(userId);

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
    await conversationCache.addMessage(userId, 'user', question);
    await conversationCache.addMessage(userId, 'model', aiResponse);

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