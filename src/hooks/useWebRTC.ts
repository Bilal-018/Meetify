// src/hooks/useWebRTC.ts
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface WebRTCOptions {
  localStream: MediaStream | null;
  peerId: string | null;
  isInitiator: boolean;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useWebRTC({ localStream, peerId, isInitiator, remoteVideoRef }: WebRTCOptions) {
  const socket = useSocket();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  // FIX: queue candidates that arrive before remoteDescription is set
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // FIX: socket is now properly non-null when this runs (because useSocket returns state)
    if (!socket || !localStream || !peerId) return;

    console.log(`🚀 useWebRTC starting — peerId: ${peerId}, isInitiator: ${isInitiator}`);

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    pendingCandidates.current = [];

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (e) => {
      console.log('✅ Remote track received');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') setIsConnected(true);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsConnected(false);
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('📤 Sending ICE candidate');
        socket.emit('ice-candidate', { to: peerId, candidate: e.candidate });
      }
    };

    // FIX: helper to flush queued candidates after remoteDescription is set
    const flushPendingCandidates = async () => {
      for (const candidate of pendingCandidates.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ Applied queued ICE candidate');
        } catch (err) {
          console.error('❌ Error applying queued ICE candidate:', err);
        }
      }
      pendingCandidates.current = [];
    };

    // ICE candidates handler — queue if remote isn't set yet
    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      if (!pc.remoteDescription) {
        console.log('⏳ Queuing ICE candidate (no remoteDescription yet)');
        pendingCandidates.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('✅ Applied ICE candidate');
      } catch (err) {
        console.error('❌ Error applying ICE candidate:', err);
      }
    };

    // FIX: only the non-initiator handles incoming offers
    const handleOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      if (isInitiator) return; // initiator never receives an offer in a 1-to-1 call
      console.log('📥 Received offer');
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
      console.log('📤 Sent answer');
    };

    // FIX: only the initiator handles the answer
    const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (!isInitiator) return;
      console.log('📥 Received answer');
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await flushPendingCandidates();
    };

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    // FIX: only the initiator creates the offer — no setTimeout needed
    if (isInitiator) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: peerId, offer });
        console.log('📤 Sent offer');
      })();
    }

    return () => {
      console.log('🧹 Cleaning up RTCPeerConnection');
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      pc.close();
      pcRef.current = null;
    };
  }, [socket, localStream, peerId, isInitiator]);

  return { isWebRTCConnected: isConnected };
}