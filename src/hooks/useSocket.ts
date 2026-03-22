// src/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SIGNALING_URL;

let globalSocket: Socket | null = null;

export function useSocket() {
  // FIX: Use useState instead of useRef so consumers re-render when socket is ready
  const [socket, setSocket] = useState<Socket | null>(globalSocket);

  useEffect(() => {
    if (globalSocket) {
      setSocket(globalSocket);
      return;
    }

    console.log('🔌 Creating new socket connection to:', SOCKET_URL);

    const s = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    globalSocket = s;
    setSocket(s);

    s.on('connect', () => {
      console.log('✅ Socket connected:', s.id);
    });

    s.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    s.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      globalSocket = null;
      setSocket(null);
    });

    return () => {
      s.disconnect();
      globalSocket = null;
      setSocket(null);
    };
  }, []);

  return socket;
}