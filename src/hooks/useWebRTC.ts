// src/hooks/useWebRTC.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

export function useWebRTC(localStream: MediaStream | null, peerId: string | null) {
  const socket = useSocket();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket || !localStream || !peerId) return;

    console.log("🚀 useWebRTC starting with peerId:", peerId);

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (e) => {
      console.log("✅ Remote video track received!");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setIsConnected(true);
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice-candidate', { to: peerId, candidate: e.candidate });
    };

    socket.on('offer', async ({ from, offer }) => {
      console.log("📥 Received offer");
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    });

    socket.on('answer', async ({ answer }) => {
      console.log("📥 Received answer");
      await pc.setRemoteDescription(answer);
      setIsConnected(true);
    });

    // Create offer
    setTimeout(async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: peerId, offer });
      console.log("📤 Sent offer");
    }, 1500);

    return () => pc.close();
  }, [socket, localStream, peerId]);

  return { remoteVideoRef, isWebRTCConnected: isConnected };
}