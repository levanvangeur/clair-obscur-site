/* ────────────────────────────────────────────────────────────
   Traduction à la volée — le français est la source unique.
   Les drapeaux traduisent la page en direct via un service de
   traduction, avec mise en cache (localStorage) et repli propre.
   ──────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const LANGS = [
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
    { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  ];
  const CACHE_KEY = 'booklet_tr_';   // + lang
  const STORE_LANG = 'booklet_lang';

  let nodes = [];        // { node, fr } — nœuds texte traduisibles
  let originals = [];    // textes FR d'origine (index aligné sur nodes)
  let current = 'fr';

  const note = document.getElementById('translateNote');
  function toast(msg, ms) {
    if (!note) return;
    note.textContent = msg; note.classList.add('show');
    clearTimeout(toast._t);
    if (ms) toast._t = setTimeout(() => note.classList.remove('show'), ms);
  }
  function hideToast() { if (note) note.classList.remove('show'); }

  // Faut-il traduire ce nœud ?
  function skip(node) {
    let p = node.parentElement;
    while (p) {
      const t = p.tagName;
      if (t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT') return true;
      if (p.hasAttribute('data-notranslate')) return true;
      p = p.parentElement;
    }
    return false;
  }

  function collect() {
    nodes = []; originals = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const v = n.nodeValue;
        if (!v || !v.trim()) return NodeFilter.FILTER_REJECT;
        if (!/[a-zA-Zà-üÀ-Ü]/.test(v)) return NodeFilter.FILTER_REJECT; // ignore chiffres/symboles seuls
        if (skip(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = walker.nextNode())) { nodes.push(n); originals.push(n.nodeValue); }
    // Éléments d'en-tête (nom appartement dans la nav) — on laisse tel quel (nom propre)
  }

  function restoreFR() {
    nodes.forEach((n, i) => { n.nodeValue = originals[i]; });
    document.documentElement.lang = 'fr';
  }

  function applyMap(lang, map) {
    nodes.forEach((n, i) => {
      const key = originals[i].trim();
      const tr = map[key];
      if (tr != null) {
        // conserve les espaces de bordure d'origine
        const lead = originals[i].match(/^\s*/)[0];
        const trail = originals[i].match(/\s*$/)[0];
        n.nodeValue = lead + tr + trail;
      }
    });
    document.documentElement.lang = lang;
  }

  function loadCache(lang) {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY + lang) || '{}'); } catch (e) { return {}; }
  }
  function saveCache(lang, map) {
    try { localStorage.setItem(CACHE_KEY + lang, JSON.stringify(map)); } catch (e) {}
  }

  // Traduit un lot de textes via l'endpoint public Google gtx (repli MyMemory).
  async function translateOne(text, lang) {
    // 1) Google gtx (rapide, gère les longues phrases)
    try {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl='
        + lang + '&dt=t&q=' + encodeURIComponent(text);
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j) && Array.isArray(j[0])) {
          return j[0].map((seg) => (seg && seg[0]) ? seg[0] : '').join('');
        }
      }
    } catch (e) {}
    // 2) MyMemory (repli)
    try {
      const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=fr|' + lang;
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        if (j && j.responseData && j.responseData.translatedText) return j.responseData.translatedText;
      }
    } catch (e) {}
    return null;
  }

  async function translateTo(lang) {
    const cache = loadCache(lang);
    // textes uniques à traduire (non déjà en cache)
    const uniq = [];
    const seen = new Set();
    originals.forEach((o) => {
      const k = o.trim();
      if (!seen.has(k)) { seen.add(k); if (cache[k] == null) uniq.push(k); }
    });

    if (uniq.length === 0) { applyMap(lang, cache); hideToast(); return true; }

    toast('Traduction en cours…', 0);
    let done = 0, failed = 0;
    const CONC = 6;
    let idx = 0;
    async function worker() {
      while (idx < uniq.length) {
        const my = idx++;
        const text = uniq[my];
        const tr = await translateOne(text, lang);
        if (tr != null) { cache[text] = tr; } else { failed++; }
        done++;
        if (done % 5 === 0) toast('Traduction en cours… ' + Math.round((done / uniq.length) * 100) + '%', 0);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONC, uniq.length) }, worker));
    saveCache(lang, cache);

    if (failed > uniq.length * 0.5) {
      toast('Traduction indisponible pour le moment — affichage en français.', 3500);
      restoreFR(); setActive('fr'); current = 'fr';
      try { localStorage.setItem(STORE_LANG, 'fr'); } catch (e) {}
      return false;
    }
    applyMap(lang, cache);
    toast(failed ? 'Traduit (certains passages en français).' : 'Traduit ✓', 2200);
    return true;
  }

  function setActive(lang) {
    document.querySelectorAll('.flag-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
  }

  async function switchTo(lang) {
    if (lang === current) return;
    current = lang;
    setActive(lang);
    try { localStorage.setItem(STORE_LANG, lang); } catch (e) {}
    if (lang === 'fr') { restoreFR(); hideToast(); return; }
    await translateTo(lang);
  }

  function buildFlags() {
    const wrap = document.getElementById('langFlags');
    if (!wrap) return;
    wrap.innerHTML = LANGS.map((l) =>
      `<button class="flag-btn" data-lang="${l.code}" title="${l.label}" aria-label="${l.label}">${l.flag}</button>`).join('');
    wrap.querySelectorAll('.flag-btn').forEach((b) => {
      b.addEventListener('click', () => switchTo(b.getAttribute('data-lang')));
    });
  }

  function init() {
    collect();
    buildFlags();
    let saved = 'fr';
    try { saved = localStorage.getItem(STORE_LANG) || 'fr'; } catch (e) {}
    setActive('fr');
    current = 'fr';
    if (saved !== 'fr') { switchTo(saved); } // retraduit automatiquement à la volée
  }

  window.I18N = { init };
})();
