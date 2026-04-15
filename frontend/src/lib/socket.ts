import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * Derive the WebSocket base URL from the API URL.
 * e.g., "http://localhost:3000/api/v1" → "http://localhost:3000"
 */
function getWsBaseUrl(): string {
  try {
    const url = new URL(API_URL);
    return url.origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export function createSocket(token: string): Socket {
  return io(`${getWsBaseUrl()}/ws`, {
    autoConnect: false,
    auth: { token },
    transports: ['websocket', 'polling'],
  });
}
