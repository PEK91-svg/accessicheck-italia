import { ScanForm } from './components/ScanForm';
import { ScanProgress } from './components/ScanProgress';
import { Dashboard } from './components/Dashboard';
import { useScan } from './hooks/useScan';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  const { state, scan, reset } = useScan();

  const isLoading = state.phase === 'starting' || state.phase === 'running';

  return (
    <>
      {/* Skip link per accessibilità */}
      <a href="#main-content" className="skip-link">
        Vai al contenuto principale
      </a>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                aria-hidden="true"
              >
                A
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold text-gray-900 leading-none">
                  AccessiCheck Italia
                </h1>
                <p className="text-xs text-gray-500">
                  Audit Accessibilità WCAG 2.1 AA · Legge Stanca · EAA
                </p>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Hero / Form scansione */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
            {state.phase === 'idle' || state.phase === 'starting' || state.phase === 'running' ? (
              <>
                <h2 className="text-2xl font-heading font-bold text-gray-900 mb-1">
                  Analizza l'accessibilità di un sito web
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Inserisci un URL per ottenere un report completo con mappatura normativa italiana
                  (Legge Stanca L. 4/2004, EAA D.Lgs. 82/2022, EN 301 549).
                </p>
                <ScanForm onScan={(url, maxPages) => scan(url, maxPages)} isLoading={isLoading} />
              </>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-heading font-bold text-gray-900">
                    Risultati della scansione
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {state.phase === 'completed' ? state.result.url : ''}
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >
                  ← Nuova scansione
                </button>
              </div>
            )}
          </div>

          {/* Loading */}
          {(state.phase === 'starting' || state.phase === 'running') && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <ScanProgress
                progress={state.phase === 'running' ? state.progress : 0}
                message={state.phase === 'running' ? state.message : 'Avvio scansione...'}
                pagesScanned={state.phase === 'running' ? state.pagesScanned : undefined}
                pagesTotal={state.phase === 'running' ? state.pagesTotal : undefined}
              />
            </div>
          )}

          {/* Errore */}
          {state.phase === 'error' && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3"
            >
              <AlertTriangle
                className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold text-red-800 mb-1">
                  Impossibile completare la scansione
                </h2>
                <p className="text-red-700 text-sm">{state.message}</p>
                <button
                  onClick={reset}
                  className="mt-3 text-sm text-red-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                >
                  Riprova
                </button>
              </div>
            </div>
          )}

          {/* Dashboard risultati */}
          {state.phase === 'completed' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <Dashboard result={state.result} onReset={reset} />
            </div>
          )}

          {/* Info normativa (mostrata solo in idle) */}
          {state.phase === 'idle' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {[
                {
                  title: 'Legge Stanca (L. 4/2004)',
                  body: 'Obbligo per PA e aziende >500M€. Dichiarazione accessibilità annuale entro il 23 settembre. Sanzioni fino al 5% del fatturato.',
                  color: 'border-blue-400',
                },
                {
                  title: 'EAA — D.Lgs. 82/2022',
                  body: 'In vigore dal 28 giugno 2025. Obbligatorio per PMI con >10 dipendenti o >2M€ fatturato. Sanzioni fino a €40.000.',
                  color: 'border-green-400',
                },
                {
                  title: 'Copertura Automatica',
                  body: 'Questo tool copre circa il 30-57% dei criteri WCAG 2.1 tramite axe-core. La parte restante richiede verifica manuale con tecnologie assistive.',
                  color: 'border-amber-400',
                },
              ].map(({ title, body, color }) => (
                <div
                  key={title}
                  className={`bg-white border-l-4 ${color} border border-gray-200 rounded-lg p-4 shadow-sm`}
                >
                  <h3 className="font-heading font-semibold text-sm text-gray-900 mb-2">
                    {title}
                  </h3>
                  <p className="text-xs text-gray-600">{body}</p>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 mt-12 py-6">
          <div className="max-w-5xl mx-auto px-4 text-center text-xs text-gray-400">
            AccessiCheck Italia — Tool di audit automatico WCAG 2.1 AA
            <span className="mx-2">·</span>
            Basato su axe-core (Deque) + Playwright
            <span className="mx-2">·</span>
            <span>Copertura: ~57% criteri WCAG</span>
          </div>
        </footer>
      </div>
    </>
  );
}
