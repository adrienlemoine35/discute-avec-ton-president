import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Message, AskResponse } from './types'
import { MessageBubble } from './MessageBubble'

const API_URL = import.meta.env.VITE_PRESIDENT_API_URL ?? 'http://localhost:3001'

const FR_BLUE = '#0055A4'
const FR_RED = '#EF4135'

const TOPICS: { label: string; question: string; emoji: string }[] = [
  { emoji: '👴', label: 'Retraites', question: 'Quelle est votre position sur la réforme des retraites ?' },
  { emoji: '🇪🇺', label: 'Europe', question: "Quelle est votre vision pour l'Europe et la souveraineté européenne ?" },
  { emoji: '⚛️', label: 'Nucléaire', question: "Quelle est votre politique sur l'énergie nucléaire ?" },
  { emoji: '🌿', label: 'Écologie', question: 'Comment abordez-vous la transition écologique et le climat ?' },
  { emoji: '🏭', label: 'Industrie', question: "Comment reindustrialiser la France et retrouver la souveraineté industrielle ?" },
  { emoji: '🧑‍🎓', label: 'Éducation', question: 'Quelle est votre politique en matière d\'éducation et d\'école ?' },
  { emoji: '🤖', label: 'IA', question: "Quelle est la stratégie de la France sur l'intelligence artificielle ?" },
  { emoji: '🛡️', label: 'Défense', question: 'Quelle est votre vision pour la défense nationale et européenne ?' },
  { emoji: '🇺🇦', label: 'Ukraine', question: 'Quelle est votre position sur la guerre en Ukraine ?' },
  { emoji: '🌊', label: 'Immigration', question: "Quelle est votre politique en matière d'immigration ?" },
  { emoji: '💶', label: 'Économie', question: "Comment améliorez-vous le pouvoir d'achat des Français ?" },
  { emoji: '🚜', label: 'Agriculture', question: 'Quelle est votre politique pour les agriculteurs français ?' },
  { emoji: '🏥', label: 'Santé', question: 'Quelle est votre vision pour le système de santé français ?' },
  { emoji: '🕌', label: 'Laïcité', question: 'Quelle est votre position sur la laïcité et le séparatisme ?' },
  { emoji: '🏠', label: 'Logement', question: 'Comment comptez-vous résoudre la crise du logement ?' },
  { emoji: '👮', label: 'Sécurité', question: 'Quelle est votre politique en matière de sécurité et de police ?' },
]

const INITIAL_MESSAGE: Message = {
  id: 'init',
  role: 'assistant',
  content:
    "Bonjour. Je suis l'agent conversationnel \"Président IA\". Posez-moi une question sur la politique française, une réforme, une position de l'exécutif. Je m'appuie exclusivement sur des déclarations publiques sourcées.",
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')
  const [showAllTopics, setShowAllTopics] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasSentMessage = messages.length > 1

  useEffect(() => {
    fetch(`${API_URL}/api/president/health`)
      .then((r) => setApiStatus(r.ok ? 'online' : 'offline'))
      .catch(() => setApiStatus('offline'))
  }, [])

  useEffect(() => {
    // Scroll uniquement le conteneur de messages, pas la page entière
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() }
    const loadingMsg: Message = { id: `loading-${Date.now()}`, role: 'assistant', content: '', isLoading: true }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/president/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text.trim() }),
      })
      const data: AskResponse = await res.json()
      setMessages((prev) => [
        ...prev.filter((m) => !m.isLoading),
        { id: `bot-${Date.now()}`, role: 'assistant', content: data.error ?? data.answer, sources: data.error ? undefined : data.sources, mode: data.error ? undefined : data.mode },
      ])
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => !m.isLoading),
        { id: `err-${Date.now()}`, role: 'assistant', content: "Je ne parviens pas à joindre le serveur. Vérifiez que l'API est démarrée sur le port 3001." },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const visibleTopics = showAllTopics ? TOPICS : TOPICS.slice(0, 8)

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden">

      {/* ── Status bar ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${apiStatus === 'online' ? 'bg-emerald-500' : apiStatus === 'offline' ? 'bg-red-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
        {apiStatus === 'online' && 'Backend RAG connecté'}
        {apiStatus === 'offline' && 'Backend hors ligne — démarrez le serveur (npm run dev dans /server)'}
        {apiStatus === 'unknown' && 'Connexion…'}
      </div>

      {/* ── Topics chips ──────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Recherche par thème</p>
        <div className="flex flex-wrap gap-1.5">
          {visibleTopics.map((t) => (
            <button
              key={t.label}
              onClick={() => sendMessage(t.question)}
              disabled={isLoading}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-all disabled:opacity-40"
            >
              <span>{t.emoji}</span>
              <span className="font-medium">{t.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowAllTopics((v) => !v)}
            className="text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showAllTopics ? '↑ Moins' : `+${TOPICS.length - 8} autres`}
          </button>
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────────────────── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4" style={{ minHeight: 360, maxHeight: 460 }}>
        {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
        {!hasSentMessage && (
          <div className="flex flex-col items-start gap-2 mt-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Questions suggérées</p>
            {[
              'Parlez-moi de votre bilan économique depuis 2017.',
              "Quelle est votre vision pour la France en 2030 ?",
              'Comment répondez-vous aux critiques sur votre politique sociale ?',
            ].map((s) => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-left">
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ─────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 p-4">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex gap-2 items-end">
          <textarea
            ref={inputRef} rows={1} value={input}
            onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Posez votre question ou entrez des mots-clés…"
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button type="submit" disabled={isLoading || !input.trim()}
            className="rounded-xl text-white font-semibold px-5 py-3 text-sm shadow hover:opacity-90 transition disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${FR_BLUE} 0%, ${FR_RED} 100%)` }}>
            {isLoading ? '…' : 'Envoyer'}
          </button>
        </form>
        <p className="mt-2 text-[10px] text-slate-400 text-center">
          ⚠️ Réponses générées par IA à partir de déclarations publiques. Usage éducatif uniquement.
        </p>
      </div>

    </div>
  )
}
