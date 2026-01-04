const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chatbot Service API',
      version: '1.0.0',
      description: 'API documentation for Chatbot Service - AI-powered customer support using Google Gemini',
      contact: {
        name: 'Fashion E-commerce Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3009}`,
        description: 'Development server',
      },
      {
        url: process.env.CHATBOT_SERVICE_URL || 'http://localhost:3009',
        description: 'Chatbot Service',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ChatMessage: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'AI response message',
            },
            intent: {
              type: 'string',
              enum: ['search', 'recommendation', 'order', 'out-of-topic'],
              description: 'Detected intent',
            },
            productsFound: {
              type: 'integer',
              description: 'Number of products found',
            },
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  brand: { type: 'string' },
                  price: { type: 'number' },
                  gender: { type: 'string' },
                  color: { type: 'string' },
                  image: { type: 'string', format: 'uri' },
                },
              },
            },
            orders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  orderNumber: { type: 'string' },
                  totalPrice: { type: 'number' },
                  finalPrice: { type: 'number' },
                  itemCount: { type: 'integer' },
                  paymentStatus: { type: 'string' },
                  shipmentStatus: { type: 'string' },
                  paymentMethod: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'object',
            },
            error: {
              type: 'string',
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js', './server.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};





