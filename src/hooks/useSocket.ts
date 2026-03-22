// src/hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// const SOCKET_URL = 'http://localhost:4000';
const SOCKET_URL = 'https://bb51-37-216-212-89.ngrok-free.app';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // If socket already exists and is connected, do nothing
    if (socketRef.current?.connected) {
      return;
    }

    console.log('🔌 Creating new socket connection to:', SOCKET_URL);

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket...');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Empty dependency array is intentional

  return socketRef.current;
}