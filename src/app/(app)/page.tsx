// src/app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);

  const handleStart = () => {
    if (!consentChecked) {
      setShowConsentError(true);
      return;
    }
    setLoading(true);
    setTimeout(() => router.push('/chat'), 500);
  };

  const handleConsent = (checked: boolean) => {
    setConsentChecked(checked);
    if (checked) setShowConsentError(false);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col">

      {/* ── Header ── */}
      <header className="shrink-0 h-12 sm:h-14 bg-zinc-900/80 backdrop-blur border-b border-white/5 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.07A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <span className="font-semibold text-sm sm:text-base tracking-tight">Meetify</span>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-400 font-medium">Live</span>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-12 sm:pt-20 pb-16">

        {/* Top badge */}
        <div className="mb-6 sm:mb-8 flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3.5 py-1.5">
          <svg className="w-3.5 h-3.5 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <span className="text-xs text-violet-300 font-medium">Peer-to-peer · No servers see your video</span>
        </div>

        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-4 sm:space-y-5">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            Talk to a stranger.{' '}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Instantly.
            </span>
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg md:text-xl leading-relaxed max-w-lg mx-auto">
            Random face-to-face video with real people from anywhere in the world.
            No account, no history, no trace.
          </p>
        </div>

        {/* Feature pills */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {[
            { icon: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z', label: 'No account needed' },
            { icon: 'M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88', label: 'Not recorded' },
            { icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', label: 'End-to-end encrypted' },
            { icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Connections are temporary' },
          ].map(({ icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-zinc-400">
              <svg className="w-3.5 h-3.5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              {label}
            </span>
          ))}
        </div>

        {/* ── Consent + CTA card ── */}
        <div className="mt-10 sm:mt-12 w-full max-w-md bg-zinc-900 border border-white/8 rounded-3xl p-6 sm:p-8 space-y-5">

          {/* 18+ warning */}
          <div className="flex gap-3 p-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl">
            <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-400">Adults only — 18+</p>
              <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">
                This platform may contain adult content. You must be 18 or older to use it.
                By continuing you confirm you meet this requirement.
              </p>
            </div>
          </div>

          {/* Consent checkbox */}
          <label className={`flex items-start gap-3 cursor-pointer group rounded-2xl p-3 -mx-1 transition-colors ${showConsentError ? 'bg-red-500/5 border border-red-500/20' : 'hover:bg-white/3'}`}>
            <div className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all
              ${consentChecked
                ? 'bg-violet-600 border-violet-600'
                : showConsentError
                ? 'border-red-500'
                : 'border-zinc-600 group-hover:border-zinc-400'}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={consentChecked}
                onChange={e => handleConsent(e.target.checked)}
              />
              {consentChecked && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
            <span className="text-sm text-zinc-300 leading-relaxed">
              I confirm I am <span className="text-white font-semibold">18 years of age or older</span> and I agree to the{' '}
              <a href="/terms" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors" onClick={e => e.stopPropagation()}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors" onClick={e => e.stopPropagation()}>Privacy Policy</a>.
            </span>
          </label>

          {showConsentError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5 -mt-2 px-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              You must confirm you are 18+ to continue.
            </p>
          )}

          {/* CTA button */}
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 font-semibold text-base shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2.5"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting…
              </>
            ) : (
              <>
                Start chatting
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          <p className="text-center text-xs text-zinc-600 leading-relaxed">
            Camera &amp; microphone access will be requested on the next screen.
          </p>
        </div>

        {/* ── How it works ── */}
        <div className="mt-16 sm:mt-20 w-full max-w-2xl">
          <h2 className="text-center text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-8">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: 'Allow camera',
                desc: 'Grant access to your camera and microphone — nothing is stored.',
                icon: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
              },
              {
                step: '02',
                title: 'Get matched',
                desc: 'We pair you with a random stranger in seconds.',
                icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
              },
              {
                step: '03',
                title: 'Chat or skip',
                desc: 'Talk as long as you like. Hit Next to meet someone new.',
                icon: 'M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z',
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="relative flex flex-col gap-3 bg-zinc-900/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-violet-400 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <span className="text-xs font-mono text-zinc-700">{step}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">{title}</p>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="shrink-0 border-t border-white/5 px-4 sm:px-6 py-5">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-600 text-center sm:text-left">
            © {new Date().getFullYear()} Meetify. For adults 18+ only.
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <a href="/terms" className="hover:text-zinc-400 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="/safety" className="hover:text-zinc-400 transition-colors">Safety</a>
            <a href="mailto:abuse@meetify.app" className="hover:text-zinc-400 transition-colors">Report abuse</a>
          </div>
        </div>
      </footer>
    </div>
  );
}