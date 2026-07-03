# Collaborative Research Management Platform (CRMP) - Backend

This is the backend API for the Collaborative Research Management Platform. It provides a robust, secure, and real-time backend infrastructure to support collaborative research projects, real-time document editing, task management, and research outputs.

## Tech Stack
- **Framework**: Node.js + Express.js (v5)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Neon)
- **ORM**: Prisma Client + Prisma Adapter PG
- **Authentication**: JWT (JSON Web Tokens) & bcrypt for password hashing
- **Real-time Engine**: Socket.IO for live collaborative document editing and notifications
- **File Storage**: Cloudinary (via Multer)
- **Email Service**: Brevo API
- **API Documentation**: Swagger UI & Swagger JSDoc
- **Validation**: Zod

## Key Features
- **User Authentication**: Secure registration, login, and JWT-based session management.
- **Project Management**: Create projects, manage visibility (public/private), and handle research lifecycle stages.
- **Role-based Access Control (RBAC)**: Fine-grained permissions for Principal Investigators (PI), Co-Investigators, Research Assistants, and Reviewers.
- **Real-time Collaboration**: WebSocket integration for live document editing with cursor tracking.
- **Task Management**: Assign, track, and complete project tasks.
- **Email Notifications**: Automated notifications for task assignments, project completion, and collaboration requests.
- **File Uploads**: Direct integration with Cloudinary for research output attachments and resources.

## Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory and add the necessary variables:
   ```env
   PORT=3000
   DATABASE_URL="your-postgresql-connection-string"
   JWT_SECRET="your-jwt-secret-key"
   BREVO_API_KEY="your-brevo-api-key"
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   FRONTEND_URL="https://res-crmp.justinch.dev"
   ```

3. **Database Migration & Seeding:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Running the Application:**
   - **Development**: `npm run dev` (runs with nodemon)
   - **Production Build**: `npm run build`
   - **Start Production Server**: `npm run start`

## API Documentation
Once the server is running, you can view the complete interactive API documentation via Swagger by navigating to:
`http://localhost:3000/api-docs`
