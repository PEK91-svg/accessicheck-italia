import { useState } from 'react';
import { Download, RotateCcw, Copy, Check } from 'lucide-react';
import { ScanResult } from '../types';
import { ScoreCard } from './ScoreCard';
import { ViolationsList } from './ViolationsList';
import { ManualChecklist } from './ManualChecklist';
import { PagesList } from './PagesList';
import { getPdfUrl } from '../services/api';

interface DashboardProps {
  result: ScanResult;
  onReset: () => void;
}

type Tab = 'violations' | 'pages' | 'manual' | 'passes';

export function Dashboard({ result, onReset }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('violations');
  const [copied, setCopied] = useState(false);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — crea un blob e scarica
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accessicheck-${result.id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const isMultiPage = result.pages && result.pages.length > 1;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'violations', label: 'Violazioni', count: result.violations.length },
    ...(isMultiPage ? [{ key: 'pages' as Tab, label: 'Pagine', count: result.pages!.length }] : []),
    { key: 'manual', label: 'Verifica Manuale', count: result.manualCheckRequired.length },
    { key: 'passes', label: 'Superati', count: result.passes.length },
  ];

  const formattedDate = new Date(result.timestamp).toLocaleString('it-IT');
  const durationSec = (result.duration / 1000).toFixed(1);

  return (
    <div>
      {/* Info scansione */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-sm text-gray-500">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="font-medium text-gray-700 break-all">{result.url}</span>
          <span>·</span>
          <time dateTime={result.timestamp}>{formattedDate}</time>
          <span>·</span>
          <span>{durationSec}s</span>
          {isMultiPage && (
            <>
              <span>·</span>
              <span className="font-medium text-blue-600">{result.pages!.length} pagine analizzate</span>
            </>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="mb-6">
        <ScoreCard result={result} />
      </div>

      {/* Azioni */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href={getPdfUrl(result.id)}
          download={`accessicheck-report-${result.id.slice(0, 8)}.pdf`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Scarica Report PDF
        </a>

        <button
          onClick={handleCopyJson}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? 'Copiato!' : 'Copia JSON'}
        </button>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Nuova scansione
        </button>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-0" role="tablist" aria-label="Sezioni report">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              aria-controls={`tab-panel-${key}`}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
              {count !== undefined && (
                <span
                  className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab panels */}
      <div
        id={`tab-panel-violations`}
        role="tabpanel"
        aria-labelledby="tab-violations"
        hidden={activeTab !== 'violations'}
      >
        <ViolationsList violations={result.violations} />
      </div>

      {isMultiPage && (
        <div
          id="tab-panel-pages"
          role="tabpanel"
          aria-labelledby="tab-pages"
          hidden={activeTab !== 'pages'}
        >
          <PagesList pages={result.pages!} baseUrl={result.url} />
        </div>
      )}

      <div
        id={`tab-panel-manual`}
        role="tabpanel"
        aria-labelledby="tab-manual"
        hidden={activeTab !== 'manual'}
      >
        <ManualChecklist criteria={result.manualCheckRequired} />
      </div>

      <div
        id={`tab-panel-passes`}
        role="tabpanel"
        aria-labelledby="tab-passes"
        hidden={activeTab !== 'passes'}
      >
        {result.passes.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">Nessun criterio superato rilevato.</p>
        ) : (
          <div className="space-y-1">
            {result.passes.map((p) => (
              <div key={p.ruleId} className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded text-sm">
                <span className="text-green-600 font-bold" aria-hidden="true">✓</span>
                <span className="font-medium text-gray-700">{p.ruleId}</span>
                {p.wcagCriteria.length > 0 && (
                  <span className="text-gray-500 text-xs">WCAG {p.wcagCriteria.join(', ')}</span>
                )}
                <span className="text-gray-600 text-xs ml-auto">{p.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div
        role="note"
        className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500"
      >
        <strong>⚠ Disclaimer:</strong> Questo audit automatico copre circa il 30-57% dei criteri WCAG testabili.
        Un audit completo richiede verifica manuale con tecnologie assistive. Il report non costituisce
        certificazione di conformità alla Legge Stanca o all'EAA.
      </div>
    </div>
  );
}
