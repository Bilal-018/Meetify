// src/hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// const SOCKET_URL = 'http://localhost:4000';
const SOCKET_URL = 'https://bb51-37-216-212-89.ngrok-free.app';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Prevent multiple connections
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}