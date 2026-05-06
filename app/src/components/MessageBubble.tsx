import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message } from './types'
import { SourceCard } from './SourceCard'

const FR_BLUE = '#0055A4'
const FR_RED  = '#EF4135'
const API_URL = import.meta.env.VITE_PRESIDENT_API_URL ?? 'http://localhost:3001'

/* ── Supprime le markdown pour la lecture audio ─────────────────────────── */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // **gras**
    .replace(/\*([^*]+)\*/g, '$1')        // *italique*
    .replace(/`([^`]+)`/g, '$1')          // `code`
    .replace(/#{1,6}\s/g, '')             // # Titres
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [texte](url)
    .trim()
}

/* ── Indicateur de chargement ────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-slate-400"
          style={{ animation: 'presidentBlink 1.4s infinite both', animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )
}

/* ── Bouton lecture audio ────────────────────────────────────────────────── */
function SpeakButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const stop = () => {
    audioRef.current?.pause()
    audioRef.current = null
    window.speechSynthesis?.cancel()
    setState('idle')
  }

  const speak = async () => {
    if (state !== 'idle') { stop(); return }

    const cleanText = stripMarkdown(text)

    // 1. Tente ElevenLabs via le serveur
    setState('loading')
    try {
      const res = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => { setState('idle'); URL.revokeObjectURL(url) }
        audio.onerror = () => { setState('idle'); URL.revokeObjectURL(url) }
        setState('playing')
        audio.play()
        return
      }
    } catch { /* ElevenLabs indisponible → fallback navigateur */ }

    // 2. Fallback : Web Speech API (voix navigateur)
    if (!supported) { setState('idle'); return }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'fr-FR'
    utterance.rate = 0.90
    utterance.pitch = 0.85

    const voices = window.speechSynthesis.getVoices()
    const frVoice =
      voices.find(v => v.lang === 'fr-FR' && v.name.toLowerCase().includes('thomas')) ??
      voices.find(v => v.lang === 'fr-FR' && v.localService) ??
      voices.find(v => v.lang === 'fr-FR')
    if (frVoice) utterance.voice = frVoice

    utterance.onstart = () => setState('playing')
    utterance.onend   = () => setState('idle')
    utterance.onerror = () => setState('idle')

    setState('playing')
    window.speechSynthesis.speak(utterance)
  }

  if (!supported) return null

  return (
    <button
      onClick={speak}
      title={state !== 'idle' ? 'Arrêter la lecture' : 'Écouter la réponse'}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
        state === 'playing'
          ? 'bg-blue-100 border-blue-300 text-blue-700 animate-pulse'
          : state === 'loading'
          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-wait'
          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600'
      }`}
    >
      {state === 'playing' ? '⏹ Stop' : state === 'loading' ? '⏳' : '🔊 Écouter'}
    </button>
  )
}

/* ── Rendu markdown personnalisé ────────────────────────────────────────── */
const mdComponents = {
  p: ({ children }: any) => (
    <p className="text-sm text-slate-800 leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }: any) => <em className="italic">{children}</em>,
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside space-y-0.5 my-1.5 text-sm text-slate-800">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-0.5 my-1.5 text-sm text-slate-800">{children}</ol>
  ),
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800 break-all"
    >
      {children}
    </a>
  ),
  code: ({ children }: any) => (
    <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),
}

/* ── Composant principal ─────────────────────────────────────────────────── */
export function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex gap-3 justify-end animate-president-msg">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-xs font-bold text-slate-600">
          U
        </div>
      </div>
    )
  }

  const isSourced = message.mode === 'sourced'
  const isStyled  = message.mode === 'styled'

  return (
    <div className="flex gap-3 animate-president-msg">
      {/* Avatar tricolore */}
      <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden flex" style={{ minWidth: 32 }}>
        <div className="flex-1" style={{ background: FR_BLUE }} />
        <div className="flex-1 bg-white border-y border-slate-200" />
        <div className="flex-1" style={{ background: FR_RED }} />
      </div>

      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm border border-slate-100 flex-1">
        {message.isLoading ? (
          <TypingDots />
        ) : (
          <>
            {/* Réponse avec rendu markdown */}
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {message.content}
            </ReactMarkdown>

            {/* Barre inférieure : mode + TTS */}
            {message.mode && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                {isSourced && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    📎 Sourcé
                  </span>
                )}
                {isStyled && (
                  <>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      🎭 Style Macron
                    </span>
                    <span className="text-[10px] text-slate-400 italic">Réponse mimétique</span>
                  </>
                )}
                <div className="ml-auto">
                  <SpeakButton text={message.content} />
                </div>
              </div>
            )}

            {/* Sources officielles */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-2 space-y-2.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Sources officielles ({message.sources.length})
                </p>
                {message.sources.map((src, i) => (
                  <SourceCard key={i} source={src} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
