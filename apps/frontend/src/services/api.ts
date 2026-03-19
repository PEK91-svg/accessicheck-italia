import axios from 'axios';
import { ScanResult, ScanPollingResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Avvia una nuova scansione. Restituisce lo scanId.
 */
export async function startScan(url: string): Promise<{ scanId: string }> {
  const response = await api.post('/scan', {
    url,
    options: { level: 'AA', standard: 'wcag21', locale: 'it', includeScreenshot: false },
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
