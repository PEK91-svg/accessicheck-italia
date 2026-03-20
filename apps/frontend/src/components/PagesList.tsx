import { PageResult, ConformanceLevel } from '../types';

interface PagesListProps {
  pages: PageResult[];
  baseUrl: string;
}

const CONFORMANCE_STYLE: Record<ConformanceLevel, string> = {
  conforme: 'bg-green-100 text-green-700 border-green-300',
  parzialmente_conforme: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  non_conforme: 'bg-red-100 text-red-700 border-red-300',
};

const CONFORMANCE_LABEL: Record<ConformanceLevel, string> = {
  conforme: 'Conforme',
  parzialmente_conforme: 'Parziale',
  non_conforme: 'Non conforme',
};

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';
  return (
    <span className={`text-xl font-bold font-heading ${color}`} aria-label={`Score ${score}`}>
      {score}
    </span>
  );
}

function shortenUrl(url: string, base: string): string {
  try {
    const u = new URL(url);
    const b = new URL(base);
    if (u.hostname === b.hostname) {
      return u.pathname + u.search || '/';
    }
    return url;
  } catch {
    return url;
  }
}

export function PagesList({ pages, baseUrl }: PagesListProps) {
  // Ordina: prima per score crescente (peggiori prima)
  const sorted = [...pages].sort((a, b) => a.score.overall - b.score.overall);

  return (
    <section aria-label="Risultati per pagina">
      <div className="mb-3 text-sm text-gray-500">
        {pages.length} pagine analizzate — ordinate dalla più problematica
      </div>

      <div className="space-y-2">
        {sorted.map((page) => (
          <div
            key={page.url}
            className={`border rounded-lg p-4 ${page.error ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-gray-200 bg-white'}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              {/* URL + score */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-center min-w-[48px]">
                  {page.error ? (
                    <span className="text-gray-400 text-sm font-medium">—</span>
                  ) : (
                    <>
                      <ScoreCircle score={page.score.overall} />
                      <div className="text-xs text-gray-400">/100</div>
                    </>
                  )}
                </div>
                <div className="min-w-0">
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded truncate block max-w-xs sm:max-w-sm md:max-w-md"
                    title={page.url}
                  >
                    {shortenUrl(page.url, baseUrl)}
                  </a>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {page.error
                      ? `Errore: ${page.error}`
                      : `${page.summary.totalViolations} violazioni · ${(page.duration / 1000).toFixed(1)}s`}
                  </div>
                </div>
              </div>

              {/* Badge conformità + conteggi */}
              {!page.error && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded border font-medium ${CONFORMANCE_STYLE[page.conformanceLevel]}`}
                  >
                    {CONFORMANCE_LABEL[page.conformanceLevel]}
                  </span>

                  {page.summary.byCriticality.critical > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                      {page.summary.byCriticality.critical} critiche
                    </span>
                  )}
                  {page.summary.byCriticality.serious > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                      {page.summary.byCriticality.serious} serie
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Barra score principi */}
            {!page.error && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[
                  { key: 'perceivable' as const, label: 'Perc.', color: '#3B82F6' },
                  { key: 'operable' as const,    label: 'Oper.', color: '#10B981' },
                  { key: 'understandable' as const, label: 'Compr.', color: '#F59E0B' },
                  { key: 'robust' as const,      label: 'Rob.',  color: '#8B5CF6' },
                ].map(({ key, label, color }) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                      <span>{label}</span>
                      <span style={{ color }}>{page.score[key]}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${page.score[key]}%`, backgroundColor: color }}
                        role="progressbar"
                        aria-valuenow={page.score[key]}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Score ${label}: ${page.score[key]}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
