interface ScanProgressProps {
  progress: number;
  message: string;
}

export function ScanProgress({ progress, message }: ScanProgressProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Analisi in corso: ${progress}%`}
      className="py-8 text-center"
    >
      <div className="text-gray-600 mb-4 font-medium">{message}</div>

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
        <div className="mt-2 text-sm text-gray-500">{progress}%</div>
      </div>

      <p className="mt-4 text-sm text-gray-400">
        Scansione Playwright + axe-core in corso... (max 30 secondi)
      </p>
    </div>
  );
}
