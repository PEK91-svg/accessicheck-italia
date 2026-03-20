import { Page } from 'playwright';

/**
 * Scopre i link interni di un sito a partire da una pagina già caricata.
 * Restituisce una lista di URL unici dello stesso dominio, escludendo
 * file statici, ancore, e l'URL di partenza stesso.
 */
export async function crawlInternalLinks(
  page: Page,
  baseUrl: string,
  maxLinks: number
): Promise<string[]> {
  const { hostname: baseHostname, origin: baseOrigin } = new URL(baseUrl);

  // Estrae tutti gli href dalla pagina nel contesto del browser
  const rawLinks: string[] = await page.$$eval(
    'a[href]',
    (anchors: Element[], origin: string) =>
      anchors
        .map((a) => (a as unknown as { href: string }).href)
        .filter((href) => href.startsWith(origin)),
    baseOrigin
  );

  const normalized = new Set<string>();

  for (const raw of rawLinks) {
    try {
      const u = new URL(raw);

      // Solo stesso dominio
      if (u.hostname !== baseHostname) continue;

      // Esclude estensioni non-HTML
      if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|xml|zip|gz|mp4|mp3|woff2?)$/i.test(u.pathname)) continue;

      // Rimuove frammenti (#section) e parametri di tracciamento comuni
      u.hash = '';
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid', 'gclid'].forEach(
        (p) => u.searchParams.delete(p)
      );

      const clean = u.toString().replace(/\/$/, ''); // Rimuove slash finale
      const base = baseUrl.replace(/\/$/, '');

      // Non riscansionare la pagina di partenza
      if (clean === base) continue;

      normalized.add(clean);
      if (normalized.size >= maxLinks) break;
    } catch {
      // URL malformata — ignora
    }
  }

  return Array.from(normalized);
}
