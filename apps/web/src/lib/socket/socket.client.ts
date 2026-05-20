import { io, Socket } from 'socket.io-client';
export { SOCKET_EMIT, SOCKET_ON } from '@fila/shared-types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '/';

let socket: Socket | null = null;

/**
 * Initialise (or re-initialise) the singleton socket connection.
 * Pass a JWT token to send it as handshake auth.
 */
export function initSocket(token?: string): Socket {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    path: '/socket.io',
    autoConnect: false,
    transports: ['websocket', 'polling'],
    ...(token ? { auth: { token } } : {}),
  });

  socket.connect();
  return socket;
}

/** Returns the singleton, creating a basic connection if none exists yet. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/** Cleanly disconnect and destroy the singleton. */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
