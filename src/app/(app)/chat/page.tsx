// src/app/chat/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useWebRTC } from '@/hooks/useWebRTC'

type Status = 'idle' | 'requesting' | 'searching' | 'connected' | 'error'
type MediaState = { audioEnabled: boolean; videoEnabled: boolean }

export default function RandomChatPage() {
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socket = useSocket()

  const [status, setStatus] = useState<Status>('idle')
  const [peerId, setPeerId] = useState<string | null>(null)
  const [isInitiator, setIsInitiator] = useState(false)
  const [mediaState, setMediaState] = useState<MediaState>({ audioEnabled: true, videoEnabled: true })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [messages, setMessages] = useState<{ text: string; self: boolean }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [unread, setUnread] = useState(0)

  const isChatting = status === 'connected'

  // ── Media ────────────────────────────────────────────────
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
      stream.getAudioTracks().forEach(t => (t.enabled = mediaState.audioEnabled))
      stream.getVideoTracks().forEach(t => (t.enabled = mediaState.videoEnabled))
      return stream
    } catch (err: any) {
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera or microphone access was denied.'
          : 'Unable to access your camera or microphone.'
      )
      setStatus('error')
      return null
    }
  }

  const stopStream = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }

  // ── Actions ──────────────────────────────────────────────
  const handleStart = async () => {
    const stream = await getMedia()
    if (!stream || !socket) return
    setStatus('searching')
    socket.emit('join-queue')
  }

  const handleNext = () => {
    socket?.emit('next')
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setPeerId(null)
    setIsInitiator(false)
    setMessages([])
    setUnread(0)
    setStatus('searching')
    socket?.emit('join-queue')
  }

  const handleCancel = () => {
    socket?.emit('next')
    stopStream()
    setStatus('idle')
    setPeerId(null)
    setIsInitiator(false)
    setMessages([])
    setUnread(0)
    setShowChat(false)
  }

  const toggleAudio = () => {
    const t = localStreamRef.current?.getAudioTracks()[0]
    if (t) {
      t.enabled = !t.enabled
      setMediaState(p => ({ ...p, audioEnabled: t.enabled }))
    }
  }

  const toggleVideo = () => {
    const t = localStreamRef.current?.getVideoTracks()[0]
    if (t) {
      t.enabled = !t.enabled
      setMediaState(p => ({ ...p, videoEnabled: t.enabled }))
    }
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || status !== 'connected') return
    setMessages(p => [...p, { text: chatInput.trim(), self: true }])
    setChatInput('')
  }

  // ── Socket ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const handleMatched = (data: { peerId: string; isInitiator: boolean }) => {
      setPeerId(data.peerId)
      setIsInitiator(data.isInitiator)
      setStatus('connected')
      setMessages([])
      setUnread(0)
    }

    const handlePartnerLeft = () => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
      setPeerId(null)
      setIsInitiator(false)
      setMessages([])
      setUnread(0)
      setStatus('searching')
      socket.emit('join-queue')
    }

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

  // ── WebRTC ───────────────────────────────────────────────
  const { isWebRTCConnected } = useWebRTC({
    localStream: localStreamRef.current,
    peerId,
    isInitiator,
    remoteVideoRef,
  })

  // ── Auto-scroll + unread badge ───────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (messages.length > 0 && !messages[messages.length - 1].self && !showChat) {
      setUnread(p => p + 1)
    }
  }, [messages])

  useEffect(() => {
    if (showChat) setUnread(0)
  }, [showChat])

  useEffect(() => () => stopStream(), [])

  // ── Helpers ──────────────────────────────────────────────
  const statusLabel = () => {
    if (status === 'requesting') return 'Accessing camera…'
    if (status === 'searching') return 'Finding a stranger…'
    if (status === 'error') return errorMsg ?? 'Something went wrong'
    if (isChatting) return isWebRTCConnected ? 'Connected' : 'Connecting video…'
    return null
  }

  const dotColor =
    status === 'connected' && isWebRTCConnected ? 'bg-emerald-400'
    : status === 'searching' || (status === 'connected' && !isWebRTCConnected) ? 'bg-amber-400 animate-pulse'
    : status === 'error' ? 'bg-red-500'
    : 'bg-zinc-600'

  return (
    <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col overflow-hidden select-none">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="shrink-0 h-12 sm:h-14 bg-zinc-900/80 backdrop-blur border-b border-white/5 px-3 sm:px-5 flex items-center justify-between z-20">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.07A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <span className="font-semibold text-sm sm:text-base tracking-tight">Meetify</span>
        </div>

        {/* Status pill */}
        {statusLabel() && (
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
            <span className="text-xs text-zinc-300 truncate max-w-[140px] sm:max-w-xs">{statusLabel()}</span>
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {isChatting && (
            <button
              onClick={() => setShowChat(p => !p)}
              className="relative w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Toggle chat"
            >
              <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 rounded-full text-[10px] font-bold flex items-center justify-center leading-none">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          )}
          {(isChatting || status === 'searching') && (
            <button
              onClick={handleCancel}
              className="text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
            >
              Leave
            </button>
          )}
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isChatting && isWebRTCConnected ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Connecting placeholder */}
        {isChatting && !isWebRTCConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">Connecting peer…</p>
          </div>
        )}

        {/* ── Idle / Searching / Error overlay ────────── */}
        {!isChatting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 px-5">

            {status === 'searching' && (
              <div className="flex flex-col items-center gap-6 w-full max-w-xs text-center">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border border-violet-500/20 animate-ping" />
                  <div className="absolute inset-3 rounded-full border border-violet-500/30 animate-ping [animation-delay:250ms]" />
                  <div className="absolute inset-6 rounded-full border border-violet-500/40 animate-ping [animation-delay:500ms]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-lg">Finding someone…</p>
                  <p className="text-zinc-500 text-sm mt-1">This usually takes a few seconds</p>
                </div>
                <button
                  onClick={handleCancel}
                  className="w-full py-3.5 rounded-2xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-5 w-full max-w-xs text-center">
                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-red-400 text-base">Access denied</p>
                  <p className="text-zinc-500 text-sm mt-1 leading-relaxed">{errorMsg}</p>
                </div>
                <button
                  onClick={() => { setStatus('idle'); setErrorMsg(null) }}
                  className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 transition text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            )}

            {(status === 'idle' || status === 'requesting') && (
              <div className="flex flex-col items-center gap-8 w-full max-w-sm text-center">
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Meet a stranger</h1>
                  <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-[260px] sm:max-w-none mx-auto">
                    Instant face-to-face video with someone random.
                    <br className="hidden sm:block" />
                    No account. No history.
                  </p>
                </div>

                <button
                  onClick={handleStart}
                  disabled={status === 'requesting'}
                  className="w-full max-w-[200px] py-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 font-semibold text-base shadow-lg shadow-violet-500/20"
                >
                  {status === 'requesting' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Starting…
                    </span>
                  ) : 'Start chatting'}
                </button>

                <div className="flex items-center gap-5 text-[11px] text-zinc-600">
                  {[
                    { icon: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z', label: 'Anonymous' },
                    { icon: 'M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88', label: 'Not recorded' },
                    { icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Temporary' },
                  ].map(({ icon, label }) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                      </svg>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Local video PiP ─────────────────────────── */}
        {(isChatting || status === 'searching') && (
          <div className="absolute bottom-24 sm:bottom-4 right-3 sm:right-4 z-20
                          w-28 h-20 sm:w-44 sm:h-32 md:w-52 md:h-36
                          rounded-xl sm:rounded-2xl overflow-hidden
                          border border-white/10 shadow-2xl shadow-black/50
                          bg-zinc-900">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!mediaState.videoEnabled && (
              <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* ── Chat panel ──────────────────────────────── */}
        {isChatting && (
          <div className={`absolute inset-y-0 right-0 z-30 flex flex-col
                          w-full sm:w-80 md:w-96
                          bg-zinc-900/95 backdrop-blur-xl border-l border-white/5
                          transition-transform duration-300 ease-out
                          ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>

            <div className="shrink-0 h-12 px-4 flex items-center justify-between border-b border-white/5">
              <span className="text-sm font-medium text-zinc-300">Chat</span>
              <button
                onClick={() => setShowChat(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Close chat"
              >
                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-600">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-xs">Say something!</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.self ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words
                      ${msg.self
                        ? 'bg-violet-600 text-white rounded-br-md'
                        : 'bg-zinc-800 text-zinc-100 rounded-bl-md'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="shrink-0 p-3 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Message…"
                  maxLength={300}
                  autoComplete="off"
                  className="flex-1 min-w-0 bg-zinc-800 hover:bg-zinc-700 focus:bg-zinc-700 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-10 h-10 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Send message"
                >
                  <svg className="w-4 h-4 text-white rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Bottom controls ──────────────────────────────── */}
      {isChatting && (
        <div className="shrink-0 h-[76px] sm:h-20 bg-zinc-900/90 backdrop-blur border-t border-white/5 px-3 sm:px-6 flex items-center justify-center gap-2 sm:gap-3 z-20">

          {/* Mute */}
          <ControlBtn
            active={mediaState.audioEnabled}
            onClick={toggleAudio}
            label={mediaState.audioEnabled ? 'Mute' : 'Unmute'}
            icon={mediaState.audioEnabled
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            }
          />

          {/* Camera */}
          <ControlBtn
            active={mediaState.videoEnabled}
            onClick={toggleVideo}
            label={mediaState.videoEnabled ? 'Stop' : 'Start'}
            icon={mediaState.videoEnabled
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
            }
          />

          {/* Next — primary */}
          <button
            onClick={handleNext}
            className="flex flex-col items-center gap-0.5 px-5 sm:px-8 py-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 active:scale-95 transition-all shadow-md shadow-violet-500/20"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
            </svg>
            <span className="text-[10px] font-semibold text-white">Next</span>
          </button>

          {/* End call */}
          <ControlBtn
            active={false}
            danger
            onClick={handleCancel}
            label="End"
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 014.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 00-.38 1.21 12.035 12.035 0 007.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 011.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 01-2.25 2.25h-2.25z" />}
          />
        </div>
      )}
    </div>
  )
}

// ── Reusable control button ──────────────────────────────────
function ControlBtn({
  active,
  danger = false,
  onClick,
  label,
  icon,
}: {
  active: boolean
  danger?: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  const base = 'flex flex-col items-center gap-0.5 w-14 sm:w-16 py-2.5 rounded-2xl transition-all active:scale-95'
  const style = danger
    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
    : active
    ? 'bg-white/5 hover:bg-white/10 text-white'
    : 'bg-red-500/15 hover:bg-red-500/25 text-red-400'

  return (
    <button onClick={onClick} className={`${base} ${style}`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {icon}
      </svg>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}