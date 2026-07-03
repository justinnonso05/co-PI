import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Collaborative Research Management Platform API',
      version: '1.0.0',
      description: 'API documentation for the CRMP Backend, featuring role-based access control and real-time collaboration endpoints.',
      contact: {
        name: 'CRMP Dev Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Paths to files containing OpenAPI annotations
};

export const swaggerSpec = swaggerJsdoc(options);
