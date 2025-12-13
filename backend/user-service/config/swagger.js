const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Service API',
      version: '1.0.0',
      description: 'API documentation for User Service - Authentication and User Management',
      contact: {
        name: 'Fashion E-commerce Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
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
        internalServiceToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-service-token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
            },
            name: {
              type: 'string',
              description: 'User full name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            role: {
              type: 'string',
              enum: ['Manager', 'Stock Clerk', 'Customer'],
              description: 'User role',
            },
            dob: {
              type: 'string',
              format: 'date',
              description: 'Date of birth',
            },
            phoneNumber: {
              type: 'string',
              description: 'Phone number',
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female', 'Others'],
              description: 'Gender',
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'Avatar URL',
            },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Customer ID',
            },
            userId: {
              type: 'string',
              description: 'Associated user ID',
            },
            loyaltyPoints: {
              type: 'number',
              description: 'Loyalty points balance',
            },
            addresses: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Address',
              },
            },
          },
        },
        Address: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Address ID',
            },
            name: {
              type: 'string',
              description: 'Address name/label',
            },
            addressInfo: {
              type: 'string',
              description: 'Full address information',
            },
            isDefault: {
              type: 'boolean',
              description: 'Whether this is the default address',
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
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js', './server.js'], // Paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};

