// src/hooks/useWebRTC.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
];

export function useWebRTC(localStream: MediaStream | null, isMatched: boolean, peerId: string | null) {
  const socket = useSocket();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isWebRTCConnected, setIsWebRTCConnected] = useState(false);

  useEffect(() => {
    if (!socket || !isMatched || !localStream || !peerId) return;

    console.log(`🔥 Starting WebRTC with peer: ${peerId}`);

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    // Add local tracks
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // Receive remote track
    pc.ontrack = (event) => {
      console.log("✅ Remote video track received!");
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsWebRTCConnected(true);
      }
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: peerId, candidate: event.candidate });
      }
    };

    // === IMPORTANT: Set up listeners FIRST ===
    const onOffer = async ({ from, offer }: any) => {
      console.log(`📥 Received offer from ${from}`);
      try {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
        console.log("📤 Sent answer");
      } catch (err) {
        console.error("Error handling offer", err);
      }
    };

    const onAnswer = async ({ answer }: any) => {
      console.log("📥 Received answer");
      try {
        await pc.setRemoteDescription(answer);
        setIsWebRTCConnected(true);
        console.log("🎉 WebRTC Connection Successful! Remote video should now appear.");
      } catch (err) {
        console.error("Error handling answer", err);
      }
    };

    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', ({ candidate }) => pc.addIceCandidate(new RTCIceCandidate(candidate)));

    // Create offer if we are the initiator (one side only)
    const createOffer = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: peerId, offer });
        console.log(`📤 Sent offer to ${peerId}`);
      } catch (err) {
        console.error("Failed to create offer", err);
      }
    };

    // Only the initiator creates the offer
    setTimeout(() => {
      if (!pc.remoteDescription) {
        createOffer();
      }
    }, 1000);

    return () => {
      pc.close();
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
    };
  }, [socket, localStream, isMatched, peerId]);

  return { remoteVideoRef, isWebRTCConnected };
}