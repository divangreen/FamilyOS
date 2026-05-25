'use client'

import { useEffect, useRef, useState } from 'react'

type Message = {
  role:    'user' | 'assistant'
  content: string
}

const OPENER: Message = {
  role:    'assistant',
  content: "Hi, I'm here to listen. Parenting is hard — what's on your mind today?",
}

export function CoachChat() {
  const [messages,   setMessages]   = useState<Message[]>([OPENER])
  const [input,      setInput]      = useState('')
  const [sessionId,  setSessionId]  = useState<string | undefined>(undefined)
  const [loading,    setLoading]    = useState(false)
  const [crisis,     setCrisis]     = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, session_id: sessionId }),
      })

      const data = await res.json() as {
        reply?:      string
        session_id?: string
        crisis?:     boolean
        error?:      string
        upgrade?:    boolean
      }

      if (res.status === 429) {
        setMessages((prev) => [
          ...prev,
          {
            role:    'assistant',
            content: data.upgrade
              ? "You've reached your free daily limit. Upgrade for unlimited access."
              : (data.error ?? 'Limit reached.'),
          },
        ])
        return
      }

      if (data.crisis) setCrisis(true)

      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply! }])
      }

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Crisis banner */}
      {crisis && (
        <div className="bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800 px-5 py-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
            If you are in crisis, please call SOS: 1-767 (24 hr) or IMH: 6389-2222.
          </p>
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[380px] max-h-[520px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex items-end gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
          rows={1}
          placeholder="Share what's on your mind… (Enter to send)"
          className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50"
          style={{ maxHeight: '120px' }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${el.scrollHeight}px`
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
