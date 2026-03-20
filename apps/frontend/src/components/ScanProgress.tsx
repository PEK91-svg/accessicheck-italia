interface ScanProgressProps {
  progress: number;
  message: string;
  pagesScanned?: number;
  pagesTotal?: number;
}

export function ScanProgress({ progress, message, pagesScanned, pagesTotal }: ScanProgressProps) {
  const isMultiPage = pagesTotal && pagesTotal > 1;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Analisi in corso: ${progress}%`}
      className="py-8 text-center"
    >
      {/* Messaggio pagina corrente */}
      <div className="text-gray-700 mb-1 font-medium">
        {isMultiPage ? (
          <span>
            Pagina <strong>{(pagesScanned ?? 0) + 1}</strong> di <strong>{pagesTotal}</strong>
          </span>
        ) : (
          'Analisi in corso...'
        )}
      </div>

      {message && (
        <div className="text-xs text-gray-500 mb-4 max-w-lg mx-auto truncate" title={message}>
          {message}
        </div>
      )}

      {/* Barra progresso */}
      <div className="relative max-w-md mx-auto">
        <div
          className="w-full bg-gray-200 rounded-full h-3"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-gray-400">
          <span>{progress}%</span>
          {isMultiPage && (
            <span>{pagesScanned} / {pagesTotal} pagine analizzate</span>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        {isMultiPage
          ? 'Il crawler segue i link interni automaticamente — max 30s per pagina'
          : 'Playwright + axe-core in esecuzione — max 30 secondi'}
      </p>
    </div>
  );
}
