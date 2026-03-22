// src/app/chat/layout.tsx

export const metadata = {
  title: 'Random Video Chat',
  description: 'Talk to strangers right now',
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <div className="bg-black text-white antialiased">
        {children}
      </div>
  )
}