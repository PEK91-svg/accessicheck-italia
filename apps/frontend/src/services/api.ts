import axios, { AxiosError } from 'axios';
import { ScanResult, ScanPollingResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Extracts a user-friendly error message from an axios error.
 * Prefers the server's error message from the response body when available.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const serverMessage = err.response?.data?.error;
    if (typeof serverMessage === 'string' && serverMessage.length > 0) {
      return serverMessage;
    }
    if (err.code === 'ECONNABORTED') {
      return 'La richiesta ha impiegato troppo tempo. Riprova.';
    }
    if (!err.response) {
      return 'Impossibile contattare il server. Verificare la connessione e riprovare.';
    }
  }
  if (err instanceof Error && err.message.length > 0) {
    return err.message;
  }
  return fallback;
}

/**
 * Avvia una nuova scansione. Restituisce lo scanId.
 */
export async function startScan(url: string, maxPages = 1): Promise<{ scanId: string }> {
  const response = await api.post('/scan', {
    url,
    options: { level: 'AA', standard: 'wcag21', locale: 'it', includeScreenshot: false, maxPages },
  });
  return { scanId: response.data.scanId };
}

/**
 * Controlla lo stato di una scansione.
 */
export async function getScanStatus(scanId: string): Promise<ScanPollingResponse | ScanResult> {
  const response = await api.get(`/scan/${scanId}`);
  return response.data;
}

/**
 * Restituisce l'URL del PDF per una scansione completata.
 */
export function getPdfUrl(scanId: string): string {
  return `/api/scan/${scanId}/pdf`;
}
