// src/hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// const SOCKET_URL = 'http://localhost:4000';
// const SOCKET_URL = 'https://a250-37-216-212-89.ngrok-free.app';
const SOCKET_URL = process.env.NEXT_PUBLIC_SIGNALING_URL;

let globalSocket: Socket | null = null;   // ← Global singleton

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // If we already have a global socket, use it
    if (globalSocket) {
      socketRef.current = globalSocket;
      return;
    }

    console.log('🔌 Creating new socket connection to:', SOCKET_URL);

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    globalSocket = socket;
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      globalSocket = null;
    });

    return () => {
      // Only disconnect if this is the last component using it
      if (socketRef.current === globalSocket) {
        console.log('🧹 Cleaning up global socket...');
        socket.disconnect();
        globalSocket = null;
      }
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}