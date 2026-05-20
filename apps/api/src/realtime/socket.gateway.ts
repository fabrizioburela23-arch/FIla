import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../shared/utils/logger';
import { registerRoomHandlers } from './rooms.manager';

let io: Server;

export function initSocketGateway(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'Socket connected');
    registerRoomHandlers(io, socket);
  });

  logger.info('Socket.io gateway initialized');
  return io;
}

export function getSocketGateway(): Server {
  if (!io) throw new Error('Socket.io gateway not initialized');
  return io;
}
