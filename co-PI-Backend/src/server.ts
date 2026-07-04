import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import documentRoutes from './routes/documentRoutes';
import surveyRoutes from './routes/surveyRoutes';
import outputRoutes from './routes/outputRoutes';
import activityRoutes from './routes/activityRoutes';
import discoveryRoutes from './routes/discoveryRoutes';
import proposalRoutes from './routes/proposalRoutes';
import aiRoutes from './routes/ai.routes';
import { errorHandler } from './middlewares/errorHandler';
import { setupCollaborationSockets } from './sockets/collaborationHandler';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // TODO: restrict to frontend origin later
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

import uploadRoutes from './routes/uploadRoutes';
import userRoutes from './routes/userRoutes';
import applicationRoutes from './routes/applicationRoutes';

// Base route redirects
app.get('/', (req: Request, res: Response) => res.redirect('/api-docs/'));
app.get('/api', (req: Request, res: Response) => res.redirect('/api-docs/'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/repositories', projectRoutes);
app.use('/api/repositories', proposalRoutes);
app.use('/api', taskRoutes);
app.use('/api', documentRoutes);
app.use('/api', surveyRoutes);
app.use('/api', outputRoutes);
app.use('/api', activityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/discover', discoveryRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ai', aiRoutes);

// Basic health check route
app.get('/api/ping', (req: Request, res: Response) => {
  res.status(200).json({ message: 'pong', status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler (must be the last app.use)
app.use(errorHandler);

// Socket.io initialization
setupCollaborationSockets(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
