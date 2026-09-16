import { ChatInterface } from './components/ChatInterface'

const FR_BLUE = '#0055A4'
const FR_RED = '#EF4135'

const isEmbedded = new URLSearchParams(window.location.search).get('embed') === '1'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8F9FB' }}>

      {/* ── Header (masqué en mode embed) ───────────────────────────────── */}
      {!isEmbedded && <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-50">
        <div className="flex h-1">
          <div className="flex-1" style={{ background: FR_BLUE }} />
          <div className="flex-1 bg-white" />
          <div className="flex-1" style={{ background: FR_RED }} />
        </div>
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex h-8 w-8 rounded-lg overflow-hidden shadow-sm border border-slate-100">
            <div className="flex-1" style={{ background: FR_BLUE }} />
            <div className="flex-1 bg-white" />
            <div className="flex-1" style={{ background: FR_RED }} />
          </div>
          <h1 className="text-sm font-bold text-slate-900 leading-none">Discute avec ton Président</h1>
        </div>
      </header>}

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-12 text-center px-5 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
          style={{ backgroundImage: `radial-gradient(circle at 20% 20%, ${FR_BLUE} 0%, transparent 40%), radial-gradient(circle at 80% 30%, ${FR_RED} 0%, transparent 40%)` }}
        />
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-500 font-medium mb-5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: FR_RED }} />
          Sources mises à jour toutes les 10 minutes
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          Pose une question sur{' '}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${FR_BLUE} 0%, ${FR_RED} 100%)` }}>
            l'actualité de la France
          </span>
        </h2>
        <p className="max-w-xl mx-auto text-slate-500 text-base leading-relaxed">
          L'agent lit en continu la presse, le Parlement et les ministères, puis répond avec ses sources à l'appui.
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
              { step: '01', icon: '💬', title: 'Tu poses ta question', desc: 'En français, sans forme imposée.' },
              { step: '02', icon: '🔍', title: "L'agent cherche", desc: 'Recherche hybride dans Supabase et les flux RSS du jour.' },
              { step: '03', icon: '🧠', title: 'Mistral rédige', desc: 'La réponse reprend le ton de Macron et s\'appuie sur les sources trouvées.' },
              { step: '04', icon: '📎', title: 'Sources citées', desc: 'Chaque lien renvoie au texte ou à l\'article d\'origine.' },
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
          <p className="text-center text-xs text-slate-400 mb-8">Gouvernement, ministères, Parlement, presse et comptes officiels</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {[
              {
                site: 'elysee.fr',
                type: 'Présidence',
                color: FR_BLUE,
                detail: 'Discours, allocutions solennelles\net communiqués de l\'Élysée',
                count: 'Présidence',
                href: 'https://www.elysee.fr',
              },
              {
                site: 'info.gouv.fr',
                type: 'Gouvernement',
                color: '#0284C7',
                detail: 'Portail du Gouvernement,\nConseil des ministres & décrets',
                count: 'Gouvernement',
                href: 'https://www.info.gouv.fr',
              },
              {
                site: 'service-public.gouv.fr',
                type: 'Administration',
                color: '#2563EB',
                detail: 'Guide des droits, démarches\net actualités administratives',
                count: 'Service Public',
                href: 'https://www.service-public.gouv.fr',
              },
              {
                site: 'assemblee-nationale.fr',
                type: 'Parlement',
                color: '#0F766E',
                detail: 'Lois votées, amendements\net débats en séance publique',
                count: 'Assemblée',
                href: 'https://www.assemblee-nationale.fr',
              },
              {
                site: 'senat.fr & LCP',
                type: 'Parlement',
                color: '#0D9488',
                detail: 'Travaux du Sénat, commissions\net retransmissions LCP',
                count: 'Sénat & LCP',
                href: 'https://www.senat.fr',
              },
              {
                site: 'Ministères officiels',
                type: 'Ministères',
                color: '#4F46E5',
                detail: 'Défense, Économie, Intérieur,\nAffaires étrangères, Éducation, Santé...',
                count: '10+ Ministères',
                href: 'https://www.defense.gouv.fr',
              },
              {
                site: 'vie-publique.fr',
                type: 'Archives',
                color: '#1D4ED8',
                detail: 'Déclarations publiques,\ntextes de référence & fiches',
                count: 'Vie Publique',
                href: 'https://www.vie-publique.fr',
              },
              {
                site: 'Presse & Dépêches',
                type: 'Médias',
                color: '#6B21A8',
                detail: 'France Info, Le Monde, Le Figaro,\nBFMTV, France 24, Europe 1',
                count: 'Dépêches Live',
                href: 'https://www.francetvinfo.fr/politique.rss',
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

          <div className="mb-10">
            <h4 className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Comptes officiels suivis</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { site: '@EmmanuelMacron', detail: 'Présidence · X', href: 'https://x.com/EmmanuelMacron' },
                { site: '@Elysee', detail: 'Présidence · X & Instagram', href: 'https://x.com/Elysee' },
                { site: '@GouvernementFR', detail: 'Gouvernement · X', href: 'https://x.com/gouvernementFR' },
                { site: '@AssembleeNat', detail: 'Assemblée nationale · X', href: 'https://x.com/AssembleeNat' },
                { site: '@Senat', detail: 'Sénat · X', href: 'https://x.com/Senat' },
                { site: '@MinDefense', detail: 'Ministère des Armées · X', href: 'https://x.com/MinDefense' },
                { site: '@Interieur_Gouv', detail: 'Ministère de l\'Intérieur · X', href: 'https://x.com/Interieur_Gouv' },
                { site: '@francediplo', detail: 'Affaires étrangères · X', href: 'https://x.com/francediplo' },
              ].map((s) => (
                <a key={s.site} href={s.href} target="_blank" rel="noopener noreferrer"
                   className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex flex-col hover:border-blue-300 transition-colors">
                  <span className="text-xs font-semibold text-blue-700">{s.site}</span>
                  <span className="text-[10px] text-slate-400">{s.detail}</span>
                </a>
              ))}
            </div>
          </div>

          {/* ── Explication Architecture RAG & Mises à jour ─────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-left shadow-sm">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center pb-2 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
                  Comment fonctionne la recherche
                </h4>
                <p className="text-xs text-slate-500">
                  Ce que fait l'agent avant de répondre.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs mb-1">
                    01
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Recherche dans Supabase</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Chaque question déclenche une recherche vectorielle et plein texte dans la base de discours, lois et déclarations déjà indexée.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs mb-1">
                    02
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Lecture des flux RSS</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    En parallèle, un scraper interroge les flux du Gouvernement, du Parlement, des ministères et de la presse politique.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs mb-1">
                    03
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Rythme de mise à jour</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Les flux d'actualité sont relus toutes les 10 minutes. La base de discours et de textes officiels est réindexée chaque jour.
                  </p>
                </div>
              </div>
            </div>
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
        <p className="text-xs text-slate-400">Mistral AI · Gemini en secours · Supabase · veille RSS</p>
        <p className="mt-3 text-[10px] text-slate-400 max-w-lg mx-auto">
          Projet éducatif. Les réponses sont générées par IA à partir de sources publiques et ne représentent pas la position officielle de l'Élysée.
        </p>
      </footer>

    </div>
  )
}
