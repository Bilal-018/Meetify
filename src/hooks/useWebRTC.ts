// src/hooks/useWebRTC.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
];

export function useWebRTC(localStream: MediaStream | null, shouldStart: boolean, peerId: string | null) {
  const socket = useSocket();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isWebRTCConnected, setIsWebRTCConnected] = useState(false);

  useEffect(() => {
    if (!shouldStart || !socket || !localStream || !peerId) {
      return;
    }

    console.log(`🔥 Starting WebRTC with peer: ${peerId}`);

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      console.log("✅ Remote video track received!");
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsWebRTCConnected(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: peerId, candidate: event.candidate });
      }
    };

    const onOffer = async ({ from, offer }: any) => {
      console.log(`📥 Received offer from ${from}`);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    };

    const onAnswer = async ({ answer }: any) => {
      console.log("📥 Received answer");
      await pc.setRemoteDescription(answer);
      setIsWebRTCConnected(true);
      console.log("🎉 WebRTC Connection Successful!");
    };

    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', ({ candidate }) => {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // Create offer
    const createOffer = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: peerId, offer });
      console.log(`📤 Sent offer to ${peerId}`);
    };

    setTimeout(createOffer, 1000);

    return () => {
      pc.close();
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
    };
  }, [socket, localStream, shouldStart, peerId]);

  return { remoteVideoRef, isWebRTCConnected };
}