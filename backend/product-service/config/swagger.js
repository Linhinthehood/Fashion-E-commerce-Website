const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Product Service API',
      version: '1.0.0',
      description: 'API documentation for Product Service - Product, Category, and Variant Management',
      contact: {
        name: 'Fashion E-commerce Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3002}`,
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
        Product: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Product ID',
            },
            name: {
              type: 'string',
              description: 'Product name',
            },
            description: {
              type: 'string',
              description: 'Product description',
            },
            brand: {
              type: 'string',
              description: 'Product brand',
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female', 'Unisex'],
              description: 'Target gender',
            },
            usage: {
              type: 'string',
              description: 'Product usage/occasion',
            },
            color: {
              type: 'string',
              description: 'Product color',
            },
            categoryId: {
              type: 'string',
              description: 'Category ID',
            },
            images: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri',
              },
              description: 'Product images URLs',
            },
            defaultPrice: {
              type: 'number',
              description: 'Default price',
            },
            isActive: {
              type: 'boolean',
              description: 'Product active status',
            },
          },
        },
        Category: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Category ID',
            },
            masterCategory: {
              type: 'string',
              description: 'Master category (e.g., Clothing, Footwear)',
            },
            subCategory: {
              type: 'string',
              description: 'Sub category (e.g., T-Shirts, Jeans)',
            },
            articleType: {
              type: 'string',
              description: 'Article type (e.g., Casual, Formal)',
            },
            description: {
              type: 'string',
              description: 'Category description',
            },
            isActive: {
              type: 'boolean',
              description: 'Category active status',
            },
          },
        },
        Variant: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Variant ID',
            },
            productId: {
              type: 'string',
              description: 'Product ID',
            },
            size: {
              type: 'string',
              description: 'Variant size',
            },
            stock: {
              type: 'integer',
              description: 'Stock quantity',
            },
            price: {
              type: 'number',
              description: 'Variant price',
            },
            status: {
              type: 'string',
              enum: ['Active', 'Inactive'],
              description: 'Variant status',
            },
            sku: {
              type: 'string',
              description: 'Stock Keeping Unit',
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful',
            },
            message: {
              type: 'string',
              description: 'Response message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            error: {
              type: 'string',
              description: 'Error message (if any)',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: { type: 'string' },
                  param: { type: 'string' },
                },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                },
                pagination: {
                  type: 'object',
                  properties: {
                    current: { type: 'integer' },
                    pages: { type: 'integer' },
                    total: { type: 'integer' },
                    limit: { type: 'integer' },
                  },
                },
              },
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

