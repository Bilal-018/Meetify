// src/hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// const SOCKET_URL = 'http://localhost:4000';
const SOCKET_URL = 'https://bb51-37-216-212-89.ngrok-free.app';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (socketRef.current) return;

    console.log('Creating new socket connection...');

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],   // Try websocket first
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 30000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully:', socket.id);
      setIsConnected(true);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    return () => {
      console.log('Cleaning up socket...');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}