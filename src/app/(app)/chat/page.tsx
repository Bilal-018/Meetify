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
  // FIX: remoteVideoRef lives here and is passed down — don't try to copy it
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const socket = useSocket()

  const [status, setStatus] = useState<'idle' | 'requesting' | 'searching' | 'connected' | 'error'>('idle')
  const [peerId, setPeerId] = useState<string | null>(null)
  // FIX: track isInitiator from the matched event
  const [isInitiator, setIsInitiator] = useState(false)
  const [mediaState, setMediaState] = useState<MediaState>({ audioEnabled: true, videoEnabled: true })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [messages, setMessages] = useState<string[]>([])
  const [chatInput, setChatInput] = useState('')

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

  // "Next Stranger" — keep your camera/mic alive, drop peer, re-queue
  const handleNext = () => {
    socket?.emit('next')
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setPeerId(null)
    setIsInitiator(false)
    setMessages([])
    setStatus('searching')
    socket?.emit('join-queue')
  }

  // "Cancel" during search or full stop — kill stream and go idle
  const handleCancel = () => {
    socket?.emit('next')
    stopStream()
    setStatus('idle')
    setPeerId(null)
    setIsInitiator(false)
    setMessages([])
  }

  const stopStream = () => {
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

  // Socket events
  useEffect(() => {
    if (!socket) return

    const handleMatched = (data: { peerId: string; isInitiator: boolean }) => {
      console.log('🔥 Matched:', data)
      setPeerId(data.peerId)
      setIsInitiator(data.isInitiator)
      setStatus('connected')
    }

    // Partner clicked Next — clear remote, re-queue automatically
    const handlePartnerLeft = () => {
      console.log('Partner left')
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
      setPeerId(null)
      setIsInitiator(false)
      setMessages([])
      setStatus('searching')
      socket.emit('join-queue')
    }

    // Server confirms queue status
    const handleStatus = (s: 'waiting' | 'idle') => {
      if (s === 'waiting') setStatus('searching')
    }

    socket.on('matched', handleMatched)
    socket.on('partner-left', handlePartnerLeft)
    socket.on('status', handleStatus)

    return () => {
      socket.off('matched', handleMatched)
      socket.off('partner-left', handlePartnerLeft)
      socket.off('status', handleStatus)
    }
  }, [socket])

  // FIX: pass isInitiator — useWebRTC now accepts it
  // FIX: pass remoteVideoRef so the hook writes directly to the DOM element
  const { isWebRTCConnected } = useWebRTC({
    localStream: localStreamRef.current,
    peerId,
    isInitiator,
    remoteVideoRef,
  })

  useEffect(() => {
    return () => stopStream()
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
          {status === 'error' && (errorMsg ?? 'Error')}
        </div>
      </header>

      <div className="flex-1 relative flex">
        <div className={`flex-1 relative ${isChatting ? 'mr-80' : ''}`}>
          {/* FIX: remoteVideoRef is defined in THIS component and passed to both the DOM and the hook */}
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
                  <button onClick={handleCancel} className="px-10 py-4 bg-zinc-700 hover:bg-zinc-600 rounded-full">
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
          <button onClick={handleNext} className="px-10 py-4 bg-red-600 hover:bg-red-700 rounded-full font-semibold">
            Next Stranger
          </button>
        </footer>
      )}
    </div>
  )
}