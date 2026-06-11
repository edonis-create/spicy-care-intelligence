import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, MessageSquare, Send, X } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  role: 'assistant',
  content:
    "Hi! I'm Spicy Assistant. I can help you understand patient risk tiers, disease prediction scores, medication adherence metrics, and any KPI in the platform. What would you like to know?",
}

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 80)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'No response.' }])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Connection error — make sure the backend is running.' },
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

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }

  return (
    <>
      {/* ── Panel ──────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-20 right-4 sm:right-6 z-50 flex flex-col transition-all"
        style={{
          width: 384,
          maxWidth: 'calc(100vw - 32px)',
          height: 520,
          maxHeight: 'calc(100vh - 120px)',
          pointerEvents: open ? 'all' : 'none',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
          transformOrigin: 'bottom right',
          transition: 'opacity 200ms ease, transform 200ms cubic-bezier(0.2,0.8,0.2,1)',
        }}
      >
        <div
          className="s1 flex flex-col overflow-hidden"
          style={{ height: '100%', borderRadius: 20 }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center gap-3 px-4 py-3 border-b"
            style={{
              borderColor: 'rgba(255,255,255,0.07)',
              background:
                'linear-gradient(180deg, rgba(255,42,42,0.10) 0%, rgba(255,42,42,0.02) 100%)',
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: 'rgba(255,42,42,0.15)',
                border: '1px solid rgba(255,42,42,0.30)',
              }}
            >
              <Bot className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Spicy Assistant
              </p>
              <p className="text-[10.5px]" style={{ color: 'var(--text-quaternary)' }}>
                Powered by platform knowledge base
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="btn-ghost"
              style={{ padding: '4px 8px' }}
              aria-label="Close chat"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'rgba(255,42,42,0.12)',
                      border: '1px solid rgba(255,42,42,0.22)',
                    }}
                  >
                    <Bot className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                  </div>
                )}
                <div
                  className={msg.role === 'user' ? 'max-w-[78%]' : 'max-w-[88%]'}
                  style={{
                    background:
                      msg.role === 'user'
                        ? 'var(--accent)'
                        : 'var(--surface-3)',
                    border:
                      msg.role === 'user'
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.06)',
                    borderRadius:
                      msg.role === 'user'
                        ? '16px 16px 4px 16px'
                        : '4px 16px 16px 16px',
                    padding: '9px 13px',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color:
                      msg.role === 'user'
                        ? '#ffffff'
                        : 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: 'rgba(255,42,42,0.12)',
                    border: '1px solid rgba(255,42,42,0.22)',
                  }}
                >
                  <Bot className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                </div>
                <div
                  className="flex items-center gap-1.5 px-4 py-3"
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '4px 16px 16px 16px',
                  }}
                >
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        background: 'var(--text-quaternary)',
                        display: 'inline-block',
                        animation: 'chat-dot-bounce 1.2s ease-in-out infinite',
                        animationDelay: `${i * 200}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="shrink-0 px-4 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKey}
                placeholder="Ask about risk tiers, KPIs, models…"
                rows={1}
                className="flex-1 resize-none rounded-xl px-3 py-2.5 scrollbar-thin focus:outline-none"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  minHeight: 40,
                  maxHeight: 96,
                  transition: 'border-color 150ms ease',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(255,42,42,0.40)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-35 hover:brightness-110 active:scale-95"
                style={{ background: 'var(--accent)' }}
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Send className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
            <p
              className="mt-1.5 text-center"
              style={{ fontSize: 10, color: 'var(--text-quaternary)' }}
            >
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* ── FAB trigger ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'var(--accent)',
          boxShadow: open
            ? '0 0 0 4px rgba(255,42,42,0.20), 0 8px 24px rgba(255,42,42,0.50)'
            : '0 4px 16px rgba(255,42,42,0.45)',
        }}
        aria-label={open ? 'Close Spicy Assistant' : 'Open Spicy Assistant'}
      >
        <div style={{ transition: 'transform 200ms ease, opacity 200ms ease' }}>
          {open ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <MessageSquare className="h-5 w-5 text-white" />
          )}
        </div>
      </button>

      {/* ── Dot bounce keyframes ──────────────────────────────────────── */}
      <style>{`
        @keyframes chat-dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  )
}
