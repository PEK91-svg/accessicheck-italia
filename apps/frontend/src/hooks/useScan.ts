import { useState, useCallback, useRef } from 'react';
import { startScan, getScanStatus } from '../services/api';
import { ScanResult } from '../types';

type ScanState =
  | { phase: 'idle' }
  | { phase: 'starting' }
  | { phase: 'running'; scanId: string; progress: number; message: string }
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

        // Ancora in corso — aggiorna il progresso (simulato)
        const progress = Math.min(90, pollCountRef.current * (90 / MAX_POLLS));
        setState({
          phase: 'running',
          scanId,
          progress: Math.round(progress),
          message: 'Analisi in corso...',
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

  const scan = useCallback(async (url: string) => {
    stopPolling();
    pollCountRef.current = 0;
    setState({ phase: 'starting' });

    try {
      const { scanId } = await startScan(url);
      setState({ phase: 'running', scanId, progress: 5, message: 'Caricamento pagina...' });
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
