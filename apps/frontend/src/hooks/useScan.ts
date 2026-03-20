import { useState, useCallback, useRef } from 'react';
import { startScan, getScanStatus } from '../services/api';
import { ScanResult } from '../types';

type ScanState =
  | { phase: 'idle' }
  | { phase: 'starting' }
  | { phase: 'running'; scanId: string; progress: number; message: string; pagesScanned?: number; pagesTotal?: number }
  | { phase: 'completed'; result: ScanResult }
  | { phase: 'error'; message: string };

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60; // 2 minuti massimo

export function useScan() {
  const [state, setState] = useState<ScanState>({ phase: 'idle' });
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const poll = useCallback(async (scanId: string) => {
    pollCountRef.current += 1;

    if (pollCountRef.current > MAX_POLLS) {
      stopPolling();
      setState({ phase: 'error', message: 'Timeout: la scansione ha superato il tempo massimo (2 minuti).' });
      return;
    }

    try {
      const data = await getScanStatus(scanId);

      if ('status' in data) {
        if (data.status === 'completed') {
          // I dati completi sono nella risposta
          stopPolling();
          setState({ phase: 'completed', result: data as ScanResult });
          return;
        }

        if (data.status === 'failed') {
          stopPolling();
          setState({
            phase: 'error',
            message: ('error' in data && typeof data.error === 'string')
              ? data.error
              : 'La scansione è fallita.',
          });
          return;
        }

        // Ancora in corso — aggiorna il progresso
        const multiProgress = 'progress' in data ? data.progress : null;
        let progress: number;
        if (multiProgress && multiProgress.pagesTotal > 0) {
          progress = Math.round((multiProgress.pagesScanned / multiProgress.pagesTotal) * 90);
        } else {
          progress = Math.min(90, pollCountRef.current * (90 / MAX_POLLS));
        }
        setState({
          phase: 'running',
          scanId,
          progress,
          message: ('message' in data && data.message) ? data.message : 'Analisi in corso...',
          pagesScanned: multiProgress?.pagesScanned,
          pagesTotal: multiProgress?.pagesTotal,
        });
      }

      // Schedula il prossimo poll
      pollTimerRef.current = setTimeout(() => poll(scanId), POLL_INTERVAL_MS);
    } catch (err) {
      stopPolling();
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Errore durante il polling.',
      });
    }
  }, []);

  const scan = useCallback(async (url: string, maxPages = 1) => {
    stopPolling();
    pollCountRef.current = 0;
    setState({ phase: 'starting' });

    try {
      const { scanId } = await startScan(url, maxPages);
      setState({
        phase: 'running',
        scanId,
        progress: 5,
        message: maxPages > 1 ? 'Scoperta pagine del sito...' : 'Caricamento pagina...',
        pagesTotal: maxPages > 1 ? maxPages : undefined,
        pagesScanned: 0,
      });
      pollTimerRef.current = setTimeout(() => poll(scanId), POLL_INTERVAL_MS);
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Impossibile avviare la scansione.',
      });
    }
  }, [poll]);

  const reset = useCallback(() => {
    stopPolling();
    pollCountRef.current = 0;
    setState({ phase: 'idle' });
  }, []);

  return { state, scan, reset };
}
