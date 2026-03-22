// src/app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = () => {
    setLoading(true);
    // Small delay just for feel (optional)
    setTimeout(() => {
      router.push('/chat');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl text-center space-y-8">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">
          Random Video Chat
        </h1>

        <p className="text-xl sm:text-2xl text-gray-300 max-w-2xl mx-auto">
          Talk face-to-face with strangers from around the world — instantly.
          <br className="hidden sm:block" />
          No account needed. Just click and go.
        </p>

        <button
          onClick={handleStart}
          disabled={loading}
          className={`
            mt-8 px-12 py-6 text-2xl md:text-3xl font-semibold rounded-full
            bg-gradient-to-r from-blue-600 to-indigo-600
            hover:from-blue-700 hover:to-indigo-700
            shadow-2xl shadow-blue-900/40
            transition-all duration-300
            hover:scale-105 active:scale-95
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center gap-3 mx-auto
          `}
        >
          {loading ? 'Starting...' : 'Start Random Chat'}
          {!loading && (
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          )}
        </button>

        <div className="pt-12 text-sm text-gray-500 space-y-2">
          <p>Camera + microphone access will be requested when you start</p>
          <p className="text-xs">Anonymous • No recordings • Connections are temporary</p>
        </div>
      </div>
    </div>
  );
}