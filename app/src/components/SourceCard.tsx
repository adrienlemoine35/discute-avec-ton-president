import { Source } from './types'

const SOURCE_TYPE_LABELS: Record<string, string> = {
  discours: 'Discours',
  interview: 'Interview',
  declaration: 'Déclaration',
  communique: 'Communiqué',
  debat: 'Débat',
  conference_presse: 'Conf. de presse',
  reponse_question: 'Q&A',
  autre: 'Source',
}

export function SourceCard({ source, index }: { source: Source; index: number }) {
  const label = SOURCE_TYPE_LABELS[source.type ?? ''] ?? 'Source'
  const dateFormatted = source.date
    ? new Date(source.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="flex gap-2">
      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            {label}
          </span>
          {dateFormatted && <span className="text-[10px] text-slate-400">{dateFormatted}</span>}
        </div>
        {source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs font-medium text-blue-700 hover:underline leading-tight truncate"
          >
            {source.title ?? 'Voir la source →'}
          </a>
        ) : (
          <p className="text-xs font-medium text-slate-700 leading-tight">{source.title ?? 'Source interne'}</p>
        )}
        {source.excerpt && (
          <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{source.excerpt}</p>
        )}
      </div>
    </div>
  )
}
