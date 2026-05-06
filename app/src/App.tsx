import { ChatInterface } from './components/ChatInterface'

const FR_BLUE = '#0055A4'
const FR_RED = '#EF4135'

const isEmbedded = new URLSearchParams(window.location.search).get('embed') === '1'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8F9FB' }}>

      {/* ── Header (masqué en mode embed) ───────────────────────────────── */}
      {!isEmbedded && <header className="bg-white border-b border-slate-200 sticky top-0 z-50" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
        <div className="flex h-1">
          <div className="flex-1" style={{ background: FR_BLUE }} />
          <div className="flex-1 bg-white" />
          <div className="flex-1" style={{ background: FR_RED }} />
        </div>
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 rounded-lg overflow-hidden shadow-sm border border-slate-100">
              <div className="flex-1" style={{ background: FR_BLUE }} />
              <div className="flex-1 bg-white" />
              <div className="flex-1" style={{ background: FR_RED }} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 leading-none mb-0.5">Projet IA / RAG</p>
              <h1 className="text-sm font-bold text-slate-900 leading-none">Discute avec ton Président</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            {['RAG', 'Agentic', 'Mistral AI', 'Supabase FTS'].map((b) => (
              <span key={b} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">{b}</span>
            ))}
          </div>
        </div>
      </header>}

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-14 pb-10 text-center px-5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-500 font-medium mb-5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: FR_RED }} />
          Démo — base de sources en cours d'indexation
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          Pose une question{' '}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${FR_BLUE} 0%, ${FR_RED} 100%)` }}>
            politique
          </span>
        </h2>
        <p className="max-w-xl mx-auto text-slate-500 text-base leading-relaxed">
          L'agent répond en s'appuyant <strong className="text-slate-700">exclusivement</strong> sur
          les discours et déclarations officielles d'Emmanuel Macron — chaque réponse est sourcée et vérifiable.
        </p>
      </section>

      {/* ── Chat ────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pb-12">
        <ChatInterface />
      </main>

      {/* ── Comment ça marche ───────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-white py-14 px-5">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-10">Comment ça fonctionne</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { step: '01', icon: '💬', title: 'Tu poses ta question', desc: 'En français, librement.' },
              { step: '02', icon: '🔍', title: "L'agent cherche", desc: 'Recherche plein texte Supabase (FTS) sur les discours officiels.' },
              { step: '03', icon: '🧠', title: 'Mistral synthétise', desc: 'Réponse fidèle aux sources, à la manière de Macron.' },
              { step: '04', icon: '📎', title: 'Sources citées', desc: 'Liens vers les déclarations originales.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: FR_BLUE }}>{item.step}</p>
                <p className="text-sm font-semibold text-slate-800 mb-1">{item.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sources indexées ────────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-slate-50 py-12 px-5">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Sources indexées</h3>
          <p className="text-center text-xs text-slate-400 mb-8">38 documents · discours, déclarations, tweets et posts officiels</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                site: 'elysee.fr',
                type: 'Officiel',
                color: FR_BLUE,
                detail: 'Discours, allocutions\net communiqués officiels',
                count: '18 sources',
                href: 'https://www.elysee.fr',
              },
              {
                site: 'x.com / Twitter',
                type: 'Réseau social',
                color: '#1a1a1a',
                detail: '@EmmanuelMacron\net @Elysee',
                count: '8 tweets',
                href: 'https://x.com/EmmanuelMacron',
              },
              {
                site: 'instagram.com',
                type: 'Réseau social',
                color: '#E1306C',
                detail: '@elysee\net @emmanuelmacron',
                count: '4 posts',
                href: 'https://www.instagram.com/elysee',
              },
              {
                site: 'Interviews & presse',
                type: 'Médias',
                color: '#6B21A8',
                detail: 'TF1, France 2\net autres médias',
                count: '8 interviews',
                href: null,
              },
            ].map((s) => (
              <div key={s.site} className="bg-white rounded-xl border border-slate-200 p-4 text-center flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white inline-block" style={{ background: s.color }}>
                  {s.type}
                </span>
                {s.href ? (
                  <a href={s.href} target="_blank" rel="noopener noreferrer"
                     className="text-xs font-semibold text-blue-700 hover:underline leading-tight">
                    {s.site}
                  </a>
                ) : (
                  <p className="text-xs font-semibold text-slate-700 leading-tight">{s.site}</p>
                )}
                <p className="text-[10px] text-slate-400 leading-tight whitespace-pre-line">{s.detail}</p>
                <p className="text-[10px] font-semibold text-slate-500">{s.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-6 px-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex h-4 w-4 rounded overflow-hidden">
            <div className="flex-1" style={{ background: FR_BLUE }} />
            <div className="flex-1 bg-white border-y border-slate-100" />
            <div className="flex-1" style={{ background: FR_RED }} />
          </div>
          <span className="text-xs text-slate-500">Discute avec ton Président</span>
        </div>
        <p className="text-xs text-slate-400">Mistral AI · Gemini (fallback) · Supabase FTS · RAG agentique</p>
        <p className="mt-3 text-[10px] text-slate-400 max-w-lg mx-auto">
          ⚠️ Démo éducative. Les réponses sont générées par IA à partir de déclarations publiques et ne représentent pas la position officielle de l'Élysée.
        </p>
      </footer>

    </div>
  )
}
