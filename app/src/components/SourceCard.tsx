import { Source } from './types'

const SOURCE_TYPE_LABELS: Record<string, string> = {
  discours: 'Discours',
  interview: 'Interview',
  declaration: 'Déclaration',
  communique: 'Communiqué',
  debat: 'Débat',
  conference_presse: 'Conf. de presse',
  reponse_question: 'Q&A',
  actualite: 'Actualité',
  parlement: 'Parlement',
  autre: 'Source',
}

function getFreshnessBadge(dateStr: string | null) {
  if (!dateStr) return null
  const srcDate = new Date(dateStr)
  if (isNaN(srcDate.getTime())) return null

  const now = new Date()
  const diffTime = now.getTime() - srcDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return (
      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Aujourd'hui
      </span>
    )
  }
  if (diffDays <= 2) {
    return (
      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
        Récent ({diffDays === 1 ? 'hier' : `il y a ${diffDays}j`})
      </span>
    )
  }
  if (diffDays <= 7) {
    return (
      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
        Cette semaine
      </span>
    )
  }
  return null
}

export function SourceCard({ source, index }: { source: Source; index: number }) {
  const label = SOURCE_TYPE_LABELS[source.type ?? ''] ?? 'Source'
  const dateFormatted = source.date
    ? new Date(source.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const freshness = getFreshnessBadge(source.date)

  return (
    <div className="flex gap-2 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors">
      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
            {label}
          </span>
          {freshness}
          {dateFormatted && <span className="text-[10px] text-slate-400">{dateFormatted}</span>}
        </div>
        {source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs font-semibold text-blue-700 hover:underline leading-snug line-clamp-1"
          >
            {source.title ?? 'Voir la source →'}
          </a>
        ) : (
          <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-1">{source.title ?? 'Source interne'}</p>
        )}
        {source.excerpt && (
          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{source.excerpt}</p>
        )}
      </div>
    </div>
  )
}
