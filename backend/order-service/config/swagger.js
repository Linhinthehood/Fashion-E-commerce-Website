const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Order Service API',
      version: '1.0.0',
      description: 'API documentation for Order Service - Order Management, Analytics, and Event Tracking',
      contact: {
        name: 'Fashion E-commerce Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3003}`,
        description: 'Development server',
      },
      {
        url: process.env.API_GATEWAY_URL || 'http://localhost:3000/api',
        description: 'API Gateway',
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
        Order: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Order ID',
            },
            userId: {
              type: 'string',
              description: 'User ID',
            },
            addressId: {
              type: 'string',
              description: 'Address ID',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  variantId: { type: 'string' },
                  quantity: { type: 'integer' },
                  price: { type: 'number' },
                },
              },
            },
            paymentMethod: {
              type: 'string',
              enum: ['COD', 'Momo', 'Bank'],
            },
            paymentStatus: {
              type: 'string',
              enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
            },
            shipmentStatus: {
              type: 'string',
              enum: ['Pending', 'Packed', 'Delivered', 'Returned'],
            },
            subtotal: {
              type: 'number',
            },
            discount: {
              type: 'number',
            },
            finalPrice: {
              type: 'number',
            },
          },
        },
        Event: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['view', 'add_to_cart', 'purchase', 'wishlist', 'search', 'impression'],
            },
            userId: {
              type: 'string',
            },
            sessionId: {
              type: 'string',
            },
            itemIds: {
              type: 'array',
              items: { type: 'string' },
            },
            occurredAt: {
              type: 'string',
              format: 'date-time',
            },
            context: {
              type: 'object',
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
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js', './server.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};

