import { Server, Socket } from 'socket.io';
import { prisma } from '../db';

export let io: Server;

export const setupCollaborationSockets = (serverIo: Server) => {
  io = serverIo;
  
  // We can create a dedicated namespace, or just use the root namespace. We'll use root for simplicity.
  io.on('connection', (socket: Socket) => {
    
    // When a user opens a document, they join a dedicated room for that document
    socket.on('join-document', (documentId: string, userId: string) => {
      socket.join(documentId);
      console.log(`User ${userId} joined document room: ${documentId}`);
      
      // Optionally notify others in the room that someone joined
      socket.to(documentId).emit('user-joined', { userId });
    });

    // When a user closes the document
    socket.on('leave-document', (documentId: string, userId: string) => {
      socket.leave(documentId);
      console.log(`User ${userId} left document room: ${documentId}`);
      socket.to(documentId).emit('user-left', { userId });
    });

    // Real-time synchronization of text/delta changes
    socket.on('send-changes', (documentId: string, delta: any) => {
      // Broadcast the changes to everyone else in the same document room
      socket.to(documentId).emit('receive-changes', delta);
    });

    // Real-time synchronization of cursor positions
    socket.on('cursor-move', (documentId: string, cursorData: any) => {
      // Broadcast cursor movements (e.g., { userId: '123', index: 15, length: 0 })
      socket.to(documentId).emit('cursor-update', cursorData);
    });

    // Handle @coPI mentions for streaming drafting
    socket.on('copi-draft', async (documentId: string, payload: { prompt: string, repositoryId: string }) => {
      try {
        const facts = await prisma.aiFact.findMany({
          where: { repositoryId: payload.repositoryId },
          orderBy: { createdAt: 'desc' },
          take: 5
        });
        const factContext = facts.map((f: any) => `- ${f.content}`).join('\n');

        let systemPrompt = 'You are an AI co-PI. Draft or edit the proposal section based on the user prompt.';
        if (factContext) {
          systemPrompt += `\n\nProject Context/Memory:\n${factContext}`;
        }

        const { BtlRuntimeService } = require('../services/btlRuntime.service');
        const stream = BtlRuntimeService.createChatCompletionStream({
          repositoryId: payload.repositoryId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: payload.prompt }
          ]
        });

        let fullResponse = '';
        for await (const chunk of stream) {
          fullResponse += chunk;
          // Send each chunk back to the client that requested it (and optionally broadcast)
          socket.emit('copi-stream-chunk', { documentId, chunk });
          socket.to(documentId).emit('copi-stream-chunk', { documentId, chunk });
        }
        
        // Notify that stream is finished
        socket.emit('copi-stream-end', { documentId });
        socket.to(documentId).emit('copi-stream-end', { documentId });
        
        // Asynchronously save this interaction to Memory
        const { AiController } = require('../controllers/ai.controller');
        AiController.extractAndSaveFact(
          payload.repositoryId, 
          [
            { role: 'system', content: 'You are an AI co-PI. Draft or edit the proposal section based on the user prompt.' },
            { role: 'user', content: payload.prompt }
          ], 
          fullResponse, 
          'chat'
        ).catch((err: any) => console.error('Failed to save AI fact in background:', err));
      } catch (err: any) {
        console.error('Error during @coPI stream:', err);
        socket.emit('copi-stream-error', { documentId, error: err.message });
      }
    });

    // ------------------------------------------------------------------------
    // Project Dashboard & Activity Feed Events (per PRD)
    // ------------------------------------------------------------------------

    // User joins a project room (for dashboard notifications)
    socket.on('join-project', (projectId: string, userId: string) => {
      socket.join(`project-${projectId}`);
      console.log(`User ${userId} joined project dashboard: ${projectId}`);
    });

    // User joins personal room (for getting added to projects dynamically)
    socket.on('join-user', (userId: string) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined personal room: user-${userId}`);
    });

    // User leaves a project room
    socket.on('leave-project', (projectId: string, userId: string) => {
      socket.leave(`project-${projectId}`);
      console.log(`User ${userId} left project dashboard: ${projectId}`);
    });

    // Broadcast a general project activity (e.g., Task completed, Document added)
    socket.on('broadcast-activity', async (payload: { projectId: string, activityType: string, message: string, initiatorId?: string, targetId?: string, metadata?: any }) => {
      try {
        // Persist to DB
        const activity = await prisma.activity.create({
          data: {
            projectId: payload.projectId,
            activityType: payload.activityType,
            message: payload.message,
            initiatorId: payload.initiatorId,
            targetId: payload.targetId,
            metadata: payload.metadata ?? {},
          }
        });
        
        // Forward the notification with the new DB ID and timestamp
        socket.to(`project-${payload.projectId}`).emit('receive-activity', activity);
      } catch (err) {
        console.error('Failed to save and broadcast activity:', err);
      }
    });
    
  });
};
