import { useState, FormEvent } from 'react';
import { Search, AlertCircle, FileStack } from 'lucide-react';

interface ScanFormProps {
  onScan: (url: string, maxPages: number) => void;
  isLoading: boolean;
}

const PAGE_OPTIONS = [
  { value: 1,  label: '1 pagina',   desc: 'Solo l\'URL inserita' },
  { value: 5,  label: '5 pagine',   desc: 'Homepage + 4 link interni' },
  { value: 10, label: '10 pagine',  desc: 'Consigliato per siti medi' },
  { value: 20, label: '20 pagine',  desc: 'Analisi approfondita' },
  { value: 50, label: '50 pagine',  desc: 'Sito completo (lento)' },
];

export function ScanForm({ onScan, isLoading }: ScanFormProps) {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(1);
  const [error, setError] = useState('');

  const validate = (value: string): string => {
    if (!value.trim()) return 'Inserire un URL';
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return 'L\'URL deve iniziare con http:// o https://';
      }
    } catch {
      return 'URL non valida. Esempio: https://www.esempio.it';
    }
    return '';
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onScan(url.trim(), maxPages);
  };

  return (
    <section aria-label="Avvia analisi accessibilità">
      <form onSubmit={handleSubmit} noValidate>
        {/* URL input */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label htmlFor="url-input" className="sr-only">
              URL del sito da analizzare
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5"
                aria-hidden="true"
              />
              <input
                id="url-input"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError('');
                }}
                placeholder="https://www.esempio.it"
                disabled={isLoading}
                aria-describedby={error ? 'url-error' : 'url-hint'}
                aria-invalid={error ? 'true' : 'false'}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors ${
                  error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                }`}
              />
            </div>
            {error && (
              <div
                id="url-error"
                role="alert"
                className="flex items-center gap-1 mt-1 text-sm text-red-600"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isLoading ? 'Analisi...' : 'Analizza'}
          </button>
        </div>

        {/* Selettore pagine */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileStack className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <label className="text-sm font-medium text-gray-700">
              Quante pagine analizzare?
            </label>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Numero di pagine da analizzare"
          >
            {PAGE_OPTIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMaxPages(value)}
                disabled={isLoading}
                aria-pressed={maxPages === value}
                title={desc}
                className={`px-3 py-1.5 text-sm rounded-full border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  maxPages === value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p id="url-hint" className="mt-1.5 text-xs text-gray-500">
            {PAGE_OPTIONS.find((o) => o.value === maxPages)?.desc}
            {maxPages > 1 && ' — il crawler seguirà i link interni automaticamente'}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
          <span>Livello: <strong>AA</strong></span>
          <span>Standard: <strong>WCAG 2.1</strong></span>
          <span>Normativa: <strong>Legge Stanca + EAA</strong></span>
        </div>
      </form>
    </section>
  );
}
