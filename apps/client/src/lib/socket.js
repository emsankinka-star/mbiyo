import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'], // Fallback polling pour connexions lentes
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket connecté');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket déconnecté:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('WebSocket erreur:', err.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
