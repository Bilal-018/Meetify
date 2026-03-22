// src/app/chat/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useWebRTC } from '@/hooks/useWebRTC'

type MediaState = {
  audioEnabled: boolean
  videoEnabled: boolean
}

export default function RandomChatPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const localStreamRef = useRef<MediaStream | null>(null)
  const socket = useSocket()

  const [status, setStatus] = useState<'idle' | 'requesting' | 'searching' | 'connected' | 'error'>('idle')
  const [peerId, setPeerId] = useState<string | null>(null)        // ← New
  const [mediaState, setMediaState] = useState<MediaState>({ audioEnabled: true, videoEnabled: true })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [messages, setMessages] = useState<string[]>([])
  const [chatInput, setChatInput] = useState('')

  // Get media
  const getMedia = async () => {
    try {
      setStatus('requesting')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
      }

      const audioTrack = stream.getAudioTracks()[0]
      const videoTrack = stream.getVideoTracks()[0]
      if (audioTrack) audioTrack.enabled = mediaState.audioEnabled
      if (videoTrack) videoTrack.enabled = mediaState.videoEnabled

      return stream
    } catch (err: any) {
      setErrorMsg(err.name === 'NotAllowedError' ? 'Camera/microphone permission denied' : 'Cannot access media devices')
      setStatus('error')
      return null
    }
  }

  const handleStart = async () => {
    const stream = await getMedia()
    if (!stream || !socket) return

    setStatus('searching')
    socket.emit('join-queue')
  }

  const handleCancelOrEnd = () => {
    socket?.emit('next')
    cleanupStream()
    setStatus('idle')
    setPeerId(null)
    setMessages([])
  }

  const cleanupStream = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }

  const toggleAudio = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setMediaState(prev => ({ ...prev, audioEnabled: audioTrack.enabled }))
    }
  }

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setMediaState(prev => ({ ...prev, videoEnabled: videoTrack.enabled }))
    }
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || status !== 'connected') return
    setMessages(prev => [...prev, `You: ${chatInput}`])
    setChatInput('')
  }

  // Socket Events
  useEffect(() => {
    if (!socket) return;

    const handleMatched = (data: any) => {
      console.log('🎉 MATCHED EVENT RECEIVED!', data);
      console.log('Type of data:', typeof data);
      console.log('peerId value:', data?.peerId);

      if (data?.peerId) {
        setPeerId(data.peerId);
        setStatus('connected');
        console.log('✅ peerId set successfully to:', data.peerId);
      } else {
        console.error('❌ No peerId in matched event!', data);
      }
    };

    const handlePartnerLeft = () => {
      console.log('Partner left');
      setStatus('idle');
      setPeerId(null);
      cleanupStream();
    };

    socket.on('matched', handleMatched);
    socket.on('partner-left', handlePartnerLeft);

    return () => {
      socket.off('matched', handleMatched);
      socket.off('partner-left', handlePartnerLeft);
    };
  }, [socket]);

  // WebRTC
  const { remoteVideoRef: webrtcRemoteRef, isWebRTCConnected } = useWebRTC(
    localStreamRef.current,
    peerId
  );

  console.log("WebRTC hook called → peerId:", peerId);

  useEffect(() => {
    if (webrtcRemoteRef.current) {
      remoteVideoRef.current = webrtcRemoteRef.current
    }
  }, [webrtcRemoteRef])

  // Cleanup
  useEffect(() => {
    return () => cleanupStream()
  }, [])

  const isChatting = status === 'connected'

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="h-14 bg-zinc-950 border-b border-zinc-800 px-4 flex items-center justify-between">
        <div className="text-lg font-semibold">Random Video Chat</div>
        <div className="text-sm opacity-70">
          {status === 'idle' && 'Ready to chat'}
          {status === 'requesting' && 'Requesting camera...'}
          {status === 'searching' && 'Finding someone...'}
          {isChatting && (isWebRTCConnected ? 'Connected • Video Active' : 'Connected • Connecting video...')}
        </div>
      </header>

      <div className="flex-1 relative flex">
        <div className={`flex-1 relative ${isChatting ? 'mr-80' : ''}`}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover bg-zinc-900"
          />

          <div className="absolute bottom-4 right-4 w-56 sm:w-72 aspect-video rounded-xl overflow-hidden border-2 border-zinc-700 shadow-2xl bg-black/60">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {!isChatting && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
              {status === 'searching' ? (
                <>
                  <div className="text-xl animate-pulse">Looking for a stranger...</div>
                  <button onClick={handleCancelOrEnd} className="px-10 py-4 bg-zinc-700 hover:bg-zinc-600 rounded-full">
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={status === 'requesting'}
                  className="px-12 py-6 text-2xl font-bold rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                >
                  Start Chatting
                </button>
              )}
            </div>
          )}
        </div>

        {isChatting && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col hidden lg:flex">
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-zinc-500 text-sm mt-10">Say something nice...</p>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`p-3 rounded-xl max-w-[85%] ${msg.startsWith('You:') ? 'ml-auto bg-indigo-600/30' : 'bg-zinc-800'}`}>
                    {msg}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-zinc-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-zinc-800 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button type="submit" className="px-5 bg-indigo-600 hover:bg-indigo-700 rounded-full font-medium">
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {isChatting && (
        <footer className="h-20 bg-zinc-950 border-t border-zinc-800 flex items-center justify-center gap-8">
          <button onClick={toggleAudio} className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${mediaState.audioEnabled ? 'bg-zinc-800' : 'bg-red-600/80'}`}>
            {mediaState.audioEnabled ? '🎤' : '🔇'}
          </button>
          <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${mediaState.videoEnabled ? 'bg-zinc-800' : 'bg-red-600/80'}`}>
            {mediaState.videoEnabled ? '📷' : '🚫'}
          </button>
          <button onClick={handleCancelOrEnd} className="px-10 py-4 bg-red-600 hover:bg-red-700 rounded-full font-semibold">
            Next Stranger
          </button>
        </footer>
      )}
    </div>
  )
}