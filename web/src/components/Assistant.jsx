import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Send, Mic, MicOff, X, ArrowRight, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'
import { cx } from './ui'

// Minimal markdown: **bold** and line breaks.
export function Markdown({ text }) {
  return (
    <div className="space-y-1 whitespace-pre-wrap">
      {text.split('\n').map((line, i) => (
        <p key={i} className={line ? '' : 'h-2'}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => (part.startsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part))}
        </p>
      ))}
    </div>
  )
}

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export default function Assistant() {
  const { user, assistantOpen, setAssistantOpen, assistantSeed, setAssistantSeed, refresh } = useApp()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [listening, setListening] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const endRef = useRef(null)
  const recRef = useRef(null)

  useEffect(() => {
    setMessages([{ role: 'assistant', text: `Hi ${user.name.split(' ')[0]}! 👋 I'm your SocietyOS AI. Ask me about dues, complaints, visitors, bookings or reports.` }])
    setSuggestions(user.role === 'admin' ? ['Who are the top defaulters?', 'Summarise open complaints', 'How much did we spend this month?', 'Draft a notice about pest control next Monday'] : user.role === 'guard' ? ['How many visitors today?', 'Latest notices'] : ['What are my dues?', 'Book the gym tomorrow evening', 'Any notices for me?', 'Report a water leak in my kitchen'])
  }, [user])

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, thinking])

  useEffect(() => {
    if (assistantOpen && assistantSeed) {
      send(assistantSeed)
      setAssistantSeed('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantOpen, assistantSeed])

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg }])
    setThinking(true)
    try {
      const res = await api.post('/api/ai/chat', { message: msg })
      setThinking(false)
      // Simulated token streaming
      const words = res.reply.split(/(\s+)/)
      setMessages((m) => [...m, { role: 'assistant', text: '', action: res.action, streaming: true }])
      for (let i = 0; i < words.length; i += 3) {
        await new Promise((r) => setTimeout(r, 18))
        const partial = words.slice(0, i + 3).join('')
        setMessages((m) => [...m.slice(0, -1), { ...m.at(-1), text: partial }])
      }
      setMessages((m) => [...m.slice(0, -1), { ...m.at(-1), text: res.reply, streaming: false }])
      if (res.suggestions) setSuggestions(res.suggestions)
      refresh()
    } catch (e) {
      setThinking(false)
      setMessages((m) => [...m, { role: 'assistant', text: `Sorry, something went wrong: ${e.message}` }])
    }
  }

  const toggleMic = () => {
    if (!SpeechRecognition) return
    if (listening) return recRef.current?.stop()
    const rec = new SpeechRecognition()
    rec.lang = 'en-IN'
    rec.interimResults = true
    rec.onresult = (e) => setInput([...e.results].map((r) => r[0].transcript).join(''))
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  return (
    <>
      <div className={cx('fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] transition', assistantOpen ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setAssistantOpen(false)} />
      <aside className={cx('fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:w-[420px] dark:bg-slate-900', assistantOpen ? 'translate-x-0' : 'translate-x-full')} aria-hidden={!assistantOpen}>
        <div className="ai-gradient flex items-center justify-between px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-white/20"><Sparkles className="size-5" /></div>
            <div>
              <p className="font-semibold">SocietyOS AI</p>
              <p className="text-xs text-white/80">Knows your society’s live data</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setMessages((m) => m.slice(0, 1))} className="rounded-lg p-1.5 hover:bg-white/20" title="New chat" aria-label="New chat"><RotateCcw className="size-4" /></button>
            <button onClick={() => setAssistantOpen(false)} className="rounded-lg p-1.5 hover:bg-white/20" aria-label="Close assistant"><X className="size-5" /></button>
          </div>
        </div>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <div key={i} className={cx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[88%] rounded-2xl px-4 py-2.5 text-sm', m.role === 'user' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-slate-100 dark:bg-slate-800')}>
                <Markdown text={m.text} />
                {m.streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-violet-500 align-middle" />}
                {m.action && !m.streaming && (
                  <button onClick={() => (navigate(m.action.to), setAssistantOpen(false))} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm dark:bg-slate-700 dark:text-white">
                    {m.action.label} <ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="size-2 animate-bounce rounded-full bg-violet-500" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
              Thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="scrollbar-thin mb-3 flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-violet-400 hover:text-violet-600 dark:border-slate-700 dark:text-slate-300">{s}</button>
            ))}
          </div>
          <form onSubmit={(e) => (e.preventDefault(), send())} className="ai-border flex items-center gap-2 rounded-2xl bg-slate-50 p-1.5 pl-4 dark:bg-slate-800">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? 'Listening…' : 'Ask anything…'} className="flex-1 bg-transparent py-2 text-sm outline-none" />
            {SpeechRecognition && (
              <button type="button" onClick={toggleMic} className={cx('rounded-xl p-2', listening ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700')} aria-label="Voice input">
                {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            )}
            <button type="submit" disabled={!input.trim() || thinking} className="ai-gradient rounded-xl p-2 text-white disabled:opacity-40" aria-label="Send"><Send className="size-4" /></button>
          </form>
          <p className="mt-2 text-center text-[11px] text-slate-400">AI answers come from demo data. Check anything important.</p>
        </div>
      </aside>
    </>
  )
}
