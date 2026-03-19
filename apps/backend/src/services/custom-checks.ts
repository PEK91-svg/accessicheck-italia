import { Page } from 'playwright';
import { CustomCheckResult, ImpactLevel } from '../types';

/**
 * Check custom non coperti da axe-core.
 * Integrano l'analisi con verifiche programmatiche aggiuntive.
 */
export async function runCustomChecks(page: Page): Promise<CustomCheckResult[]> {
  const results: CustomCheckResult[] = [];

  await Promise.allSettled([
    checkHeadingHierarchy(page).then((r) => results.push(r)),
    checkSingleH1(page).then((r) => results.push(r)),
    checkLandmarks(page).then((r) => results.push(r)),
    checkMetaViewport(page).then((r) => results.push(r)),
    checkSkipLink(page).then((r) => results.push(r)),
    checkHtmlLang(page).then((r) => results.push(r)),
    checkFocusOutline(page).then((r) => results.push(r)),
  ]);

  return results;
}

// ─── Gerarchia Heading ─────────────────────────────────────────────────────

async function checkHeadingHierarchy(page: Page): Promise<CustomCheckResult> {
  try {
    const headings = await page.$$eval(
      'h1, h2, h3, h4, h5, h6',
      (els) =>
        els.map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim() ?? '',
          level: parseInt(el.tagName.charAt(1), 10),
        }))
    );

    let passed = true;
    let details = `Trovati ${headings.length} heading.`;

    if (headings.length === 0) {
      passed = false;
      details = 'Nessun heading trovato nella pagina.';
    } else {
      // Verifica che non ci siano salti di livello (es. H1 → H3)
      for (let i = 1; i < headings.length; i++) {
        const diff = headings[i].level - headings[i - 1].level;
        if (diff > 1) {
          passed = false;
          details = `Salto di livello heading: ${headings[i - 1].tag.toUpperCase()} → ${headings[i].tag.toUpperCase()} (manca un livello intermedio). Testo: "${headings[i].text}"`;
          break;
        }
      }

      if (passed) {
        details = `Gerarchia heading corretta. Livelli trovati: ${headings.map((h) => h.tag).join(' > ')}`;
      }
    }

    return {
      checkId: 'custom-heading-hierarchy',
      passed,
      impact: 'moderate' as ImpactLevel,
      wcagCriteria: ['2.4.6', '1.3.1'],
      description: 'Gerarchia heading sequenziale senza salti di livello',
      details,
      remediationIt:
        'Assicurarsi che i livelli heading seguano un ordine sequenziale (H1→H2→H3). Non saltare livelli come passare direttamente da H1 a H3.',
    };
  } catch (error) {
    return buildErrorCheck('custom-heading-hierarchy', ['2.4.6'], error);
  }
}

// ─── Singolo H1 ───────────────────────────────────────────────────────────

async function checkSingleH1(page: Page): Promise<CustomCheckResult> {
  try {
    const h1Count = await page.$$eval('h1', (els) => els.length);
    const passed = h1Count === 1;

    return {
      checkId: 'custom-single-h1',
      passed,
      impact: 'moderate' as ImpactLevel,
      wcagCriteria: ['2.4.6'],
      description: 'La pagina contiene esattamente un H1',
      details:
        h1Count === 0
          ? 'Nessun H1 trovato nella pagina.'
          : h1Count === 1
            ? 'Un solo H1 trovato — corretto.'
            : `Trovati ${h1Count} elementi H1. La pagina dovrebbe avere un solo H1.`,
      remediationIt:
        'Ogni pagina dovrebbe avere esattamente un elemento H1 che descrive il contenuto principale. Se ci sono più H1, riorganizzare la gerarchia.',
    };
  } catch (error) {
    return buildErrorCheck('custom-single-h1', ['2.4.6'], error);
  }
}

// ─── Landmark ARIA ────────────────────────────────────────────────────────

async function checkLandmarks(page: Page): Promise<CustomCheckResult> {
  try {
    const landmarks = await page.$$eval(
      'main, [role="main"], nav, [role="navigation"], header, [role="banner"], footer, [role="contentinfo"], aside, [role="complementary"]',
      (els) =>
        els.map((el) => ({
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') ?? el.tagName.toLowerCase(),
        }))
    );

    const hasMain =
      landmarks.some((l) => l.tag === 'main' || l.role === 'main');
    const hasNav =
      landmarks.some((l) => l.tag === 'nav' || l.role === 'navigation');
    const hasBanner =
      landmarks.some(
        (l) => (l.tag === 'header' && !l.role) || l.role === 'banner'
      );
    const hasContentinfo =
      landmarks.some(
        (l) => (l.tag === 'footer' && !l.role) || l.role === 'contentinfo'
      );

    const missing: string[] = [];
    if (!hasMain) missing.push('<main>');
    if (!hasNav) missing.push('<nav>');
    if (!hasBanner) missing.push('<header>');
    if (!hasContentinfo) missing.push('<footer>');

    const passed = missing.length === 0;

    return {
      checkId: 'custom-landmarks',
      passed,
      impact: 'moderate' as ImpactLevel,
      wcagCriteria: ['2.4.1', '1.3.1'],
      description: 'Presenza dei landmark HTML5 principali',
      details: passed
        ? 'Tutti i landmark principali presenti: main, nav, header, footer.'
        : `Landmark mancanti: ${missing.join(', ')}. Landmark trovati: ${landmarks.map((l) => l.tag).join(', ')}`,
      remediationIt:
        'Aggiungere i landmark HTML5 semantici mancanti: <main> per il contenuto principale, <nav> per la navigazione, <header> per la testata, <footer> per il piè di pagina.',
    };
  } catch (error) {
    return buildErrorCheck('custom-landmarks', ['2.4.1'], error);
  }
}

// ─── Meta Viewport ────────────────────────────────────────────────────────

async function checkMetaViewport(page: Page): Promise<CustomCheckResult> {
  try {
    const viewportContent = await page.$eval(
      'meta[name="viewport"]',
      (el) => el.getAttribute('content') ?? ''
    ).catch(() => null);

    if (!viewportContent) {
      return {
        checkId: 'custom-meta-viewport',
        passed: false,
        impact: 'serious' as ImpactLevel,
        wcagCriteria: ['1.4.4'],
        description: 'Meta viewport presente e configurato correttamente',
        details: 'Tag meta viewport non trovato. Potrebbe impedire il corretto zoom su mobile.',
        remediationIt:
          'Aggiungere <meta name="viewport" content="width=device-width, initial-scale=1"> al <head> della pagina.',
      };
    }

    // Verifica che non blocchi lo zoom dell'utente
    const blocksZoom =
      /user-scalable\s*=\s*(no|0)/i.test(viewportContent) ||
      /maximum-scale\s*=\s*[0-4](\.[0-9]*)?\s*[,;$]/i.test(viewportContent);

    return {
      checkId: 'custom-meta-viewport',
      passed: !blocksZoom,
      impact: 'serious' as ImpactLevel,
      wcagCriteria: ['1.4.4'],
      description: 'Meta viewport non blocca lo zoom utente',
      details: blocksZoom
        ? `Il meta viewport blocca lo zoom: "${viewportContent}". Questo viola il criterio 1.4.4.`
        : `Meta viewport corretto: "${viewportContent}"`,
      remediationIt:
        'Rimuovere user-scalable=no e impostare maximum-scale a 5 o superiore. Gli utenti ipovedenti necessitano di poter ingrandire la pagina.',
    };
  } catch (error) {
    return buildErrorCheck('custom-meta-viewport', ['1.4.4'], error);
  }
}

// ─── Skip Link ────────────────────────────────────────────────────────────

async function checkSkipLink(page: Page): Promise<CustomCheckResult> {
  try {
    // Cerca un link skip come primo elemento focusabile della pagina
    const skipLink = await page.$eval(
      'a[href^="#"]:first-of-type, a.skip-link, a.skip-nav, a.skiplink',
      (el) => ({
        href: el.getAttribute('href') ?? '',
        text: el.textContent?.trim() ?? '',
      })
    ).catch(() => null);

    if (!skipLink) {
      return {
        checkId: 'custom-skip-link',
        passed: false,
        impact: 'serious' as ImpactLevel,
        wcagCriteria: ['2.4.1'],
        description: 'Skip link per saltare la navigazione ripetitiva',
        details:
          'Nessun skip link trovato. Gli utenti da tastiera devono navigare tutti i link prima di arrivare al contenuto.',
        remediationIt:
          'Aggiungere uno skip link come primo elemento della pagina: <a href="#main-content" class="skip-link">Vai al contenuto principale</a>. Può essere visivamente nascosto e mostrato al focus.',
      };
    }

    return {
      checkId: 'custom-skip-link',
      passed: true,
      impact: 'serious' as ImpactLevel,
      wcagCriteria: ['2.4.1'],
      description: 'Skip link per saltare la navigazione ripetitiva',
      details: `Skip link trovato: "${skipLink.text}" → ${skipLink.href}`,
      remediationIt: '',
    };
  } catch (error) {
    return buildErrorCheck('custom-skip-link', ['2.4.1'], error);
  }
}

// ─── Attributo lang su html ───────────────────────────────────────────────

async function checkHtmlLang(page: Page): Promise<CustomCheckResult> {
  try {
    const lang = await page.$eval('html', (el) => el.getAttribute('lang') ?? '');

    const passed = lang.length >= 2;

    return {
      checkId: 'custom-html-lang',
      passed,
      impact: 'serious' as ImpactLevel,
      wcagCriteria: ['3.1.1'],
      description: 'Attributo lang presente e valido su elemento <html>',
      details: passed
        ? `Attributo lang correttamente impostato: "${lang}"`
        : lang.length === 0
          ? 'Attributo lang mancante sull\'elemento <html>.'
          : `Valore lang troppo corto o non valido: "${lang}"`,
      remediationIt:
        'Aggiungere lang="it" (o il codice BCP47 corretto) all\'elemento <html>: <html lang="it">. Questo consente agli screen reader di usare la corretta sintesi vocale.',
    };
  } catch (error) {
    return buildErrorCheck('custom-html-lang', ['3.1.1'], error);
  }
}

// ─── Focus outline ────────────────────────────────────────────────────────

async function checkFocusOutline(page: Page): Promise<CustomCheckResult> {
  try {
    // Cerca regole CSS che rimuovono outline globalmente.
    // page.evaluate gira nel contesto del browser, non nel backend Node.js.
    // Usiamo Function constructor per evitare che TypeScript analizzi il corpo
    // della callback come codice Node.js privo dei tipi DOM.
    const hasOutlineNone = await page.evaluate(
      new Function(`
        var sheets = Array.from(document.styleSheets);
        for (var i = 0; i < sheets.length; i++) {
          try {
            var rules = Array.from(sheets[i].cssRules || []);
            for (var j = 0; j < rules.length; j++) {
              var rule = rules[j];
              if (rule.selectorText !== undefined) {
                var sel = rule.selectorText || '';
                var out = (rule.style && rule.style.outline) || '';
                var ow  = (rule.style && rule.style.outlineWidth) || '';
                if (/(:focus|:focus-within)/.test(sel) &&
                    (out === 'none' || out === '0' || ow === '0')) {
                  return { found: true, selector: sel, outline: out };
                }
              }
            }
          } catch(e) {}
        }
        return { found: false, selector: '', outline: '' };
      `) as () => { found: boolean; selector: string; outline: string }
    );

    const passed = !hasOutlineNone.found;

    return {
      checkId: 'custom-focus-outline',
      passed,
      impact: 'serious' as ImpactLevel,
      wcagCriteria: ['2.4.7'],
      description: 'Indicatore focus non rimosso globalmente dal CSS',
      details: passed
        ? 'Nessuna regola CSS che rimuove globalmente l\'outline al focus trovata.'
        : `Regola CSS che rimuove l'outline trovata: selector="${hasOutlineNone.selector}", outline="${hasOutlineNone.outline}". Questo rende invisibile il focus da tastiera.`,
      remediationIt:
        'Non usare *:focus { outline: none } o :focus { outline: 0 } senza sostituire con un indicatore alternativo visibile. Usare :focus-visible per applicare stili solo alla navigazione da tastiera.',
    };
  } catch (error) {
    return buildErrorCheck('custom-focus-outline', ['2.4.7'], error);
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────

function buildErrorCheck(
  checkId: string,
  wcagCriteria: string[],
  error: unknown
): CustomCheckResult {
  console.warn(`[custom-checks] Errore nel check ${checkId}:`, error);
  return {
    checkId,
    passed: false,
    impact: 'minor',
    wcagCriteria,
    description: `Check ${checkId}`,
    details: `Errore durante l'esecuzione del check: ${error instanceof Error ? error.message : String(error)}`,
    remediationIt: '',
  };
}
