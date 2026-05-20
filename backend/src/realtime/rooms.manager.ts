import { Server, Socket } from 'socket.io';
import { logger } from '../shared/utils/logger';
import { EMIT } from './socket.events';

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on(EMIT.JOIN_BRANCH_ROOM, (branchId: string) => {
    socket.join(`branch:${branchId}`);
    logger.debug({ socketId: socket.id, branchId }, 'Socket joined branch room');
  });

  socket.on(EMIT.JOIN_TICKET_ROOM, (ticketId: string) => {
    socket.join(`ticket:${ticketId}`);
    logger.debug({ socketId: socket.id, ticketId }, 'Socket joined ticket room');
  });

  socket.on(EMIT.JOIN_OPERATOR_ROOM, (operatorId: string) => {
    socket.join(`operator:${operatorId}`);
    logger.debug({ socketId: socket.id, operatorId }, 'Socket joined operator room');
  });

  socket.on('disconnect', (reason) => {
    logger.debug({ socketId: socket.id, reason }, 'Socket disconnected');
  });
}
