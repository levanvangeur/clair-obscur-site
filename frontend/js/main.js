'use strict';

// ══════════════════════════════════════════════════════════
// ÉTAT GLOBAL
// ══════════════════════════════════════════════════════════
const PROPERTY_ID = new URLSearchParams(location.search).get('id') || 1;

// Voyageur
let currentImages = [];
let currentImageIndex = 0;
let helpOpen = false;
let propertyData = null;

// Admin
let adminToken = null; // jamais persisté — mot de passe requis à chaque visite
let adminDrawerOpen = false;
let adminRooms = [];
let activeDrawerTab = 'info';

// ══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  // token jamais persisté — toujours null au chargement

  try {
    propertyData = await apiFetch(`/api/properties/${PROPERTY_ID}`, false);
    renderAll(propertyData);
  } catch {
    showLoadError();
  }

  setupNavScroll();
  setupScrollReveal();
  setupHelpButton();
  setupLightbox();
  setupAdminLoginForm();
  setupDrawerDragClose();
});

// ══════════════════════════════════════════════════════════
// ── VOYAGEUR : RENDU ─────────────────────────────────────
// ══════════════════════════════════════════════════════════
function renderAll(data) {
  updateMeta(data);
  renderHero(data);
  renderQuickInfo(data);
  renderArrivee(data.rules);
  renderDepart(data.rules);
  renderWifi(data.rules);
  renderEquipements(data.rooms || []);
  renderStationnement(data.rules);
  renderReglement(data.rules);
  renderContact(data.settings);
  renderDecouvrir(data.rules);
  renderPLM();
  initMap();
  setTimeout(() => lucide.createIcons(), 60);
}

function renderQuickInfo(data) {
  const bar = document.getElementById('quickinfo-inner');
  if (!bar) return;
  const r = data.rules    || {};
  const s = data.settings || {};

  const fmtTime   = t => t ? t.replace(':', 'h') : null;
  const firstLine = txt => txt ? txt.split('\n').map(l => l.trim()).filter(Boolean)[0] || null : null;
  const scroll    = anchor => `event.preventDefault();document.querySelector('${anchor}')?.scrollIntoView({behavior:'smooth'})`;

  const checkin  = fmtTime(r.check_in_time);
  const checkout = fmtTime(r.check_out_time);

  const chips = [
    { icon: 'car',   label: 'Parking', value: firstLine(r.parking_instructions), anchor: '#stationnement' },
    { icon: 'wifi',  label: 'Wi-Fi',   value: r.wifi_name || null,   subvalue: r.wifi_password || null, anchor: '#wifi' },
    { icon: 'phone', label: 'Contact', value: s.help_phone || null,               anchor: '#contact'       },
  ].filter(c => c.value);

  if (!checkin && !checkout && !chips.length) { bar.innerHTML = ''; return; }

  let html = '';

  if (checkin || checkout) {
    const both = checkin && checkout;
    html += `<div class="qi-time-pair${both ? '' : ' qi-time-pair--single'}">`;
    if (checkin) html += `
      <a class="qi-time-cell" href="#arrivee-depart" onclick="${scroll('#arrivee-depart')}">
        <i data-lucide="log-in" class="qi-time-icon" style="width:17px;height:17px;"></i>
        <span class="qi-time-label">Arrivée</span>
        <span class="qi-time-value">${esc(checkin)}</span>
      </a>`;
    if (both) html += `<div class="qi-time-sep"></div>`;
    if (checkout) html += `
      <a class="qi-time-cell" href="#arrivee-depart" onclick="${scroll('#arrivee-depart')}">
        <i data-lucide="log-out" class="qi-time-icon" style="width:17px;height:17px;"></i>
        <span class="qi-time-label">Départ</span>
        <span class="qi-time-value">${esc(checkout)}</span>
      </a>`;
    html += `</div>`;
  }

  html += chips.map(c => `
    <a class="qi-chip" href="${c.anchor}" onclick="${scroll(c.anchor)}">
      <div class="qi-chip-icon">
        <i data-lucide="${c.icon}"></i>
      </div>
      <div class="qi-chip-content">
        <div class="qi-label">${c.label}</div>
        <div class="qi-value">${esc(c.value)}</div>
        ${c.subvalue ? `<div class="qi-subvalue">${esc(c.subvalue)}</div>` : ''}
      </div>
      <i data-lucide="chevron-right" class="qi-arrow" style="width:14px;height:14px;"></i>
    </a>`).join('');

  bar.innerHTML = html;
  setTimeout(() => lucide.createIcons({ nodes: bar.querySelectorAll('[data-lucide]') }), 30);
}

function updateMeta(data) {
  const title = `${data.name} — Location courte durée`;
  document.title = title;
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-desc').setAttribute('content', data.tagline || '');
}

let _heroTimer = null;

function renderHero(data) {
  const siteName = data.settings?.site_name || data.name;
  document.getElementById('nav-logo').textContent = siteName;
  document.getElementById('footer-name').textContent = siteName;
  document.getElementById('hero-eyebrow').textContent = 'Bienvenue au';
  document.getElementById('hero-title').textContent = data.name;
  document.getElementById('hero-tagline').textContent = data.tagline || '';

  // Priorité : hero_images (slideshow). Fallback : main_image seul.
  const heroImgs = data.hero_images && data.hero_images.length
    ? data.hero_images
    : data.main_image ? [{ filename: data.main_image }] : [];

  startHeroSlideshow(heroImgs);
}

function startHeroSlideshow(images) {
  if (_heroTimer) { clearInterval(_heroTimer); _heroTimer = null; }

  const hero = document.getElementById('hero');
  hero.querySelectorAll('.hero-slide').forEach(s => s.remove());

  if (!images.length) return;

  const overlay = document.getElementById('hero-overlay');

  // Créer un élément par photo, insérés AVANT l'overlay
  const slides = images.map((img, i) => {
    const div = document.createElement('div');
    div.className = 'hero-slide' + (i === 0 ? ' active' : '');
    div.style.backgroundImage = `url(${imgUrl(img.filename)})`;
    hero.insertBefore(div, overlay);
    return div;
  });

  // Précharger toutes les images en arrière-plan
  images.forEach(img => { const i = new Image(); i.src = imgUrl(img.filename); });

  if (slides.length < 2) return; // une seule photo → pas besoin du timer

  let current = 0;
  _heroTimer = setInterval(() => {
    const prev = current;
    current = (current + 1) % slides.length;

    slides[current].classList.add('active');   // nouvelle slide monte
    slides[prev].classList.add('leaving');      // ancienne reste visible dessous
    slides[prev].classList.remove('active');

    // Une fois la transition terminée, on masque l'ancienne slide
    setTimeout(() => slides[prev].classList.remove('leaving'), 2200);
  }, 3800); // délai entre chaque photo
}


function renderEquipements(rooms) {
  const all = rooms.flatMap(r => (r.equipment || []).map(e => ({ ...e, roomName: r.name })));
  renderAccordionSection(
    all.filter(e => !e.category || e.category === 'equipement'),
    'equip-container',
    0,
    'Aucun équipement configuré.'
  );
}

function renderConfort(rooms) {
  const all = rooms.flatMap(r => (r.equipment || []).map(e => ({ ...e, roomName: r.name })));
  renderAccordionSection(
    all.filter(e => e.category === 'confort'),
    'confort-container',
    500,
    'Aucun élément de confort configuré.'
  );
}

function renderAccordionSection(items, containerId, idOffset, emptyMsg) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!items.length) { container.innerHTML = `<p style="color:var(--text-muted);padding:2rem 0;">${emptyMsg}</p>`; return; }
  container.innerHTML = items.map((eq, i) => `
    <div class="accordion-item" id="acc-${idOffset + i}">
      <button class="accordion-trigger" onclick="toggleAccordion(${idOffset + i})" aria-expanded="false">
        <div class="accordion-trigger-left">
          <div class="accordion-icon-wrap">${iconSvg(eq.icon, 16)}</div>
          <div><div class="accordion-trigger-name">${esc(eq.name)}</div><div class="accordion-room-tag">${esc(eq.roomName)}</div></div>
        </div>
        <i data-lucide="chevron-down" class="accordion-chevron" style="width:18px;height:18px;"></i>
      </button>
      <div class="accordion-body">
        <div class="accordion-body-inner">
          ${eq.instructions ? `<p class="accordion-instructions">${esc(eq.instructions)}</p>` : '<p style="color:var(--text-dim);font-size:0.85rem;">Pas d\'instructions disponibles.</p>'}
          ${eq.tips ? `<div class="accordion-tips">💡 ${esc(eq.tips)}</div>` : ''}
        </div>
      </div>
    </div>`).join('');
  setTimeout(() => lucide.createIcons(), 60);
}

function renderArrivee(rules) {
  const c = document.getElementById('arrivee-container');
  if (!rules) { c.innerHTML = ''; return; }
  c.innerHTML = renderCheckinBlock(rules.check_in_time || '15:00', rules.check_in_instructions || '');
}

function renderDepart(rules) {
  const c = document.getElementById('depart-container');
  if (!rules) { c.innerHTML = ''; return; }
  c.innerHTML = renderCheckinBlock(rules.check_out_time || '11:00', rules.check_out_instructions || '');
}

function renderCheckinBlock(time, text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const timeHtml = `<div class="checkin-time">${esc(time)}</div>`;
  if (!lines.length) return timeHtml;
  const stepsHtml = lines.map(line => `
    <div class="checkin-step">
      <span class="checkin-dot"></span>
      <p class="checkin-step-text">${esc(line)}</p>
    </div>`).join('');
  return `${timeHtml}<div class="checkin-steps">${stepsHtml}</div>`;
}

function renderWifi(rules) {
  const c = document.getElementById('wifi-container');
  if (!rules || (!rules.wifi_name && !rules.wifi_password)) {
    c.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Informations Wi-Fi à configurer.</p>';
    return;
  }
  const makeCopiable = (val, label) => `
    <div class="wifi-field reveal">
      <p class="wifi-field-label">${label}</p>
      <div class="wifi-field-row">
        <span class="wifi-value" id="wifi-${label}">${esc(val)}</span>
        <button class="wifi-copy-btn" onclick="copyToClipboard('${esc(val)}', this)" title="Copier">
          <i data-lucide="copy" style="width:14px;height:14px;"></i>
        </button>
      </div>
    </div>`;
  const makeField = (label, value) => `
    <div class="wifi-field reveal">
      <p class="wifi-field-label">${label}</p>
      <div class="wifi-field-row">
        <span class="wifi-value">${value}</span>
      </div>
    </div>`;

  c.innerHTML = `
    <div class="wifi-card reveal">
      <div class="wifi-card-icon"><i data-lucide="wifi" style="width:28px;height:28px;color:var(--gold);"></i></div>
      ${rules.wifi_name     ? makeCopiable(rules.wifi_name,     'Réseau') : ''}
      ${rules.wifi_password ? makeCopiable(rules.wifi_password, 'Mot de passe') : ''}
    </div>
    <div class="section-header reveal" style="margin-top:5rem;">
      <p class="text-eyebrow">Literie</p>
      <span class="divider-line"></span>
      <h2 class="text-section-title">Linge de maison</h2>
    </div>
    <div class="wifi-card reveal">
      <div class="wifi-card-icon"><i data-lucide="bed-double" style="width:28px;height:28px;color:var(--gold);"></i></div>
      ${makeField('Linge de maison', 'Draps &amp; serviettes fournis')}
      ${makeField('Fin de séjour', 'Merci de déposer le linge dans les panières')}
    </div>`;
  setTimeout(() => { lucide.createIcons(); setupScrollReveal(); }, 60);
}

window.copyToClipboard = function(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const icon = btn.querySelector('i');
    if (icon) { icon.setAttribute('data-lucide', 'check'); lucide.createIcons({ nodes: [icon] }); }
    setTimeout(() => { if (icon) { icon.setAttribute('data-lucide', 'copy'); lucide.createIcons({ nodes: [icon] }); } }, 2000);
  });
};

function renderStationnement(rules) {
  const c = document.getElementById('stationnement-container');
  if (!rules || !rules.parking_instructions) {
    c.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Informations de stationnement à configurer.</p>';
    return;
  }
  c.innerHTML = `
    <div class="info-card reveal">
      <p class="info-card-text">${esc(rules.parking_instructions).replace(/\n/g,'<br>')}</p>
    </div>`;
  setTimeout(() => setupScrollReveal(), 60);
}

function renderReglement(rules) {
  const c = document.getElementById('reglement-container');
  if (!rules) { c.innerHTML = ''; return; }
  let html = '';
  if (rules.house_rules) {
    html += `<div class="info-card reveal"><p class="info-card-text">${esc(rules.house_rules).replace(/\n/g,'<br>')}</p></div>`;
  }
  if (!html) html = '<p style="color:var(--text-muted);font-size:0.9rem;">Règlement à configurer.</p>';
  c.innerHTML = html;
  setTimeout(() => { lucide.createIcons(); setupScrollReveal(); }, 60);
}

function renderContact(settings) {
  const c = document.getElementById('contact-container');
  if (!settings) { c.innerHTML = ''; return; }
  const phone = settings.help_phone || '';
  const email = settings.help_email || '';

  // Bouton flottant
  if (phone) { document.getElementById('help-phone-num').textContent = phone; document.getElementById('help-phone-link').href = `tel:${phone.replace(/\s/g, '')}`; }
  if (email) {
    document.getElementById('help-email-addr').textContent = email;
    document.getElementById('help-email-link').href = `mailto:${email}`;
    const invoiceLink = document.getElementById('help-invoice-link');
    const subject = encodeURIComponent('Demande de facture');
    const body = encodeURIComponent('Bonjour,\n\nJe souhaite recevoir une facture pour mon séjour.\n\nMerci.');
    invoiceLink.href = `mailto:${email}?subject=${subject}&body=${body}`;
    invoiceLink.style.display = '';
  }

  c.innerHTML = `
    <div class="contact-grid reveal">
      ${phone ? `<a href="tel:${esc(phone.replace(/\s/g,''))}" class="contact-card">
        <div class="contact-card-icon"><i data-lucide="phone" style="width:24px;height:24px;"></i></div>
        <p class="contact-card-label">Appeler</p>
        <p class="contact-card-value">${esc(phone)}</p>
      </a>` : ''}
      ${email ? `<a href="mailto:${esc(email)}" class="contact-card">
        <div class="contact-card-icon"><i data-lucide="mail" style="width:24px;height:24px;"></i></div>
        <p class="contact-card-label">Email</p>
        <p class="contact-card-value">${esc(email)}</p>
      </a>` : ''}
    </div>`;
  if (!phone && !email) c.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Contact à configurer dans Paramètres.</p>';
  setTimeout(() => { lucide.createIcons(); setupScrollReveal(); }, 60);
}

function renderPLM() {
  const c = document.getElementById('plm-container');
  if (!c) return;

  // Données : [nom arrêt, minutes depuis 07h00 (1er départ 07:02)]
  // Source : Fiche horaires PLM 2024-2025 — Le Grand Charolais / Transarc
  const arrets = [
    ['Collège Cassin',              [2,  2,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0]],
    ['Quai de l\'Industrie',        [null,null,1,  1,  1,  1,  1,  1,  1,  1,  1,  1]],
    ['Anatole France',              [5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5]],
    ['Hector Berlioz',              [6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6,  6]],
    ['Saint-Germain',               [7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7]],
    ['Solnin',                      [8,  8,  8,  8,  8,  8,  8,  8,  8,  8,  8,  8]],
    ['Solnin / Saint-Yan',          [9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9,  9]],
    ['Prairies / Ferreull',         [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]],
    ['École Bellevue',              [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11]],
    ['Paul Cambon',                 [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]],
    ['Le Colombier / La Croix',     [13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13]],
    ['Résistance / Rte de Poisson', [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]],
    ['Comblette',                   [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16]],
    ['Eaux Mortes',                 [17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17]],
    ['Gare SNCF',                   [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]],
    ['Théâtre',                     [23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23]],
    ['La Poste',                    [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25]],
    ['Villeneuve',                  [26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26]],
    ['Pré des Angles',              [28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28]],
    ['Rond-point de Bourgogne',     [29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29]],
    ['Stades',                      [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]],
    ['Cinéma Empire',               [31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31]],
    ['Pôle Sanitaire',              [32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32]],
    ['Champ Bossu',                 [33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33]],
    ['Les Miquets',                 [38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38]],
    ['Grand Boyère',                [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40]],
    ['Les Sables / FJT',            [42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42]],
    ['Lycée Astier',                [45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45]],
    ['École des Crèches',           [46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46]],
    ['Résidence Notre-Dame',        [49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49]],
    ['Cimetière',                   [51, 51, 51, 51, 51, 51, 51, 51, 51, 51, 51, 51]],
    ['Greseul',                     [53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53]],
    ['Pasteur',                     [55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55]],
    ['Bibliothèque',                [56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56]],
    ['Collège Cassin ⟳',           [58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58]],
  ];

  // Heures de départ du 1er arrêt : 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18
  const departs = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  function fmt(h, min) {
    if (min === null) return '—';
    const total = h * 60 + min;
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }

  let selectedHour = null;
  let tableOpen = false;

  function buildTable() {
    const cols = selectedHour !== null ? [departs.indexOf(selectedHour)] : departs.map((_,i) => i);
    const heures = cols.map(i => departs[i]);
    return `
      <div class="plm-panel" id="plm-panel">
        <div style="margin-bottom:1.25rem;">
          <p style="font-size:0.7rem;color:var(--text-dim);margin-bottom:0.6rem;letter-spacing:0.08em;text-transform:uppercase;">Filtrer par heure de départ</p>
          <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
            <button onclick="plmFilter(null)" class="plm-btn${selectedHour===null?' plm-btn-active':''}">Tout</button>
            ${departs.map(h => `<button onclick="plmFilter(${h})" class="plm-btn${selectedHour===h?' plm-btn-active':''}">${String(h).padStart(2,'0')}h</button>`).join('')}
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="plm-table">
            <thead><tr>
              <th>Arrêt</th>
              ${heures.map(h => `<th>${String(h).padStart(2,'0')}h</th>`).join('')}
            </tr></thead>
            <tbody>
              ${arrets.map(([nom, mins]) => `
                <tr><td>${nom}</td>${cols.map(i => `<td>${fmt(departs[i], mins[i])}</td>`).join('')}</tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p style="margin-top:1rem;font-size:0.75rem;color:var(--text-dim);">
          ⓘ Ne circule pas les dimanches et jours fériés.
          <a href="https://www.legrandcharolais.fr/transports-urbains.html" target="_blank" rel="noopener" style="color:var(--gold);margin-left:0.5rem;">Infos officielles ↗</a>
        </p>
        <button onclick="plmToggle()" style="margin-top:1.25rem;display:flex;align-items:center;gap:0.4rem;font-size:0.75rem;color:var(--text-dim);cursor:pointer;background:none;border:none;padding:0;">
          <i data-lucide="chevron-up" style="width:14px;height:14px;"></i> Masquer les horaires
        </button>
      </div>`;
  }

  function render() {
    c.innerHTML = `
      <div class="plm-summary">
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:0.6rem;">
            <i data-lucide="bus" style="width:20px;height:20px;color:var(--gold);"></i>
            <div>
              <p style="font-size:0.85rem;color:var(--text);font-weight:500;">Navette PLM</p>
              <p style="font-size:0.75rem;color:var(--text-muted);">Circuit urbain · Lun–Sam · 07h–19h · 1 départ / heure · 35 arrêts</p>
            </div>
          </div>
          <button onclick="plmToggle()" class="plm-btn plm-btn-open" style="margin-left:auto;">
            <i data-lucide="clock" style="width:13px;height:13px;"></i>
            ${tableOpen ? 'Masquer les horaires' : 'Afficher les horaires'}
          </button>
        </div>
      </div>
      ${tableOpen ? buildTable() : ''}`;
    setTimeout(() => lucide.createIcons(), 30);
  }

  window.plmToggle = function() { tableOpen = !tableOpen; selectedHour = null; render(); };
  window.plmFilter = function(h) { selectedHour = h; render(); };

  render();
}

function initMap() {
  if (!document.getElementById('map')) return;
  if (window._mapInstance) { window._mapInstance.remove(); window._mapInstance = null; }

  const lat = 46.4463341;
  const lng = 4.1166550;

  const map = L.map('map', { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 16);
  window._mapInstance = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  // ── Parc du Moulin Liron — polygone vert ──────────────────
  const parcCoords = [[46.445276,4.1218369],[46.4455945,4.1221852],[46.445694,4.1221947],[46.4457543,4.1221909],[46.4458014,4.1221397],[46.445865,4.1220784],[46.4459305,4.1220224],[46.4459887,4.1219914],[46.4460326,4.121986],[46.4461144,4.1220047],[46.4461637,4.1220278],[46.4462284,4.1220638],[46.4462506,4.1221036],[46.446274,4.1221538],[46.4462975,4.1221857],[46.4463768,4.1223396],[46.4464465,4.1224523],[46.4465252,4.1224948],[46.446673,4.1224143],[46.4470537,4.1212234],[46.4472053,4.120988],[46.4481557,4.1202964],[46.4482698,4.1202632],[46.448316,4.1204241],[46.4484269,4.1207433],[46.448669,4.1211322],[46.4479057,4.1222105],[46.4475406,4.1227561],[46.4474677,4.1228649],[46.4473829,4.1230567],[46.4473552,4.1231399],[46.4473071,4.1234349],[46.4472665,4.1238077],[46.4472387,4.124253],[46.4472369,4.1243925],[46.4472794,4.1245722],[46.4474661,4.1250201],[46.447516,4.1251783],[46.4475474,4.1253634],[46.4475344,4.12546],[46.4474864,4.125586],[46.4473792,4.1257497],[46.44715,4.1260367],[46.4470706,4.1261654],[46.4469948,4.1262298],[46.4468469,4.1263049],[46.4467804,4.1263853],[46.4466381,4.1265248],[46.4464607,4.1266133],[46.4462241,4.1267528],[46.446089,4.1268856],[46.4458582,4.127131],[46.4457898,4.1272329],[46.4457231,4.1273657],[46.445627,4.1274703],[46.4455494,4.127532],[46.4453812,4.1275293],[46.4452001,4.1274891],[46.4450487,4.1274368],[46.4448935,4.1275467],[46.4447826,4.1277238],[46.4446754,4.1279249],[46.4446308,4.1280926],[46.4446142,4.1282696],[46.4445791,4.1283876],[46.4444811,4.1285083],[46.4443333,4.1286236],[46.444193,4.1286813],[46.444071,4.1286599],[46.4439527,4.1286277],[46.4438307,4.1286116],[46.4436125,4.1287014],[46.443497,4.128727],[46.443466,4.128762],[46.443356,4.128938],[46.4432153,4.1287081],[46.4432659,4.1284337],[46.4435756,4.1271473],[46.4439091,4.1261017],[46.4445363,4.1241539],[46.445276,4.1218369]];
  L.polygon(parcCoords, {
    color: '#2d7a3a',
    weight: 1.5,
    fillColor: '#4a9e5c',
    fillOpacity: 0.45,
    interactive: false,
  }).addTo(map);

  // ── Voie ferrée — ligne blanche semi-transparente par-dessus ──
  const voieFerree = [
    // Tronçon près de l'appartement
    [[46.4470783,4.1135719],[46.4468567,4.1141029],[46.4466767,4.1145452],[46.4465478,4.1148677],[46.4464132,4.1152053],[46.4462916,4.1154982],[46.4460820,4.1160297],[46.4458929,4.1165072],[46.4457527,4.1168593],[46.4456302,4.1171437]],
    // Tronçon vers l'est
    [[46.4450129,4.1186631],[46.4449753,4.1187588],[46.4449077,4.1189131],[46.4447152,4.1193866],[46.4446633,4.1195119],[46.4444050,4.1201453],[46.4440171,4.1210516],[46.4437993,4.1215543],[46.4435763,4.1220895],[46.4434686,4.1223770],[46.4426986,4.1242775],[46.4425674,4.1246196]],
  ];
  voieFerree.forEach(coords => {
    L.polyline(coords, {
      color: '#d4cfc8',
      weight: 8,
      opacity: 0.55,
      interactive: false,
    }).addTo(map);
  });

  // ── Marqueur appartement ──────────────────────────────────
  const icon = L.divIcon({
    html: `<div style="
      background:#c9a96e;
      width:16px;height:16px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    "></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -20],
  });

  const apptMarker = L.marker([lat, lng], { icon })
    .addTo(map)
    .bindPopup(`
      <div style="font-family:Inter,sans-serif;font-size:0.85rem;line-height:1.5;min-width:160px;">
        <strong style="font-size:0.95rem;">Clair-Obscur</strong><br>
        14 Rue Denis Papin<br>
        71600 Paray-le-Monial
      </div>
    `, { maxWidth: 220 })
    .openPopup();

  // ── Parkings gratuits à proximité ────────────────────────
  const parkingIcon = L.divIcon({
    html: `<div style="
      background:#3a7bd5;
      color:#fff;
      width:22px;height:22px;
      border-radius:4px;
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.45);
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;font-family:Inter,sans-serif;
      line-height:1;
    ">P</div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });

  const parkings = [
    { lat: 46.4470209, lng: 4.1170056, dist: '~80 m',  label: 'Parking gratuit' },
    { lat: 46.4455727, lng: 4.1153375, dist: '~130 m', label: 'Parking gratuit' },
    { lat: 46.4473939, lng: 4.1138781, dist: '~245 m', label: 'Parking gratuit' },
    { lat: 46.4475897, lng: 4.1204659, dist: '~325 m', label: 'Parking gratuit' },
  ];

  parkings.forEach(p => {
    L.marker([p.lat, p.lng], { icon: parkingIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:Inter,sans-serif;font-size:0.85rem;line-height:1.5;">
          <strong style="color:#3a7bd5;">P</strong> ${p.label}<br>
          <span style="font-size:0.78rem;color:#888;">Gratuit · ${p.dist} à pied</span>
        </div>
      `, { maxWidth: 200 });
  });

  // Ajuste le zoom pour englober l'appartement + les parkings
  const allPoints = [[lat, lng], ...parkings.map(p => [p.lat, p.lng])];
  map.fitBounds(allPoints, { padding: [45, 45], maxZoom: 17 });
}

function renderDecouvrir(rules) {
  const c = document.getElementById('decouvrir-container');
  if (!rules || !rules.places_to_discover) {
    c.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Suggestions à configurer.</p>';
    return;
  }
  c.innerHTML = `
    <div class="info-card reveal">
      <p class="info-card-text">${esc(rules.places_to_discover).replace(/\n/g,'<br>')}</p>
    </div>`;
  setTimeout(() => setupScrollReveal(), 60);
}


function renderBooking(property, bookings) {
  const container = document.getElementById('booking-container');
  const list = Array.isArray(bookings) ? bookings : (bookings ? [bookings] : []);
  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:3rem;border:1px solid var(--border);color:var(--text-muted);">Lien de réservation à configurer dans le panneau admin.</div>`;
    return;
  }
  const imgSrc = property.main_image ? imgUrl(property.main_image) : null;
  const imgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${esc(property.name)}" loading="lazy">`
    : `<div style="width:100%;height:100%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;"><i data-lucide="home" style="width:48px;height:48px;color:var(--border-light);"></i></div>`;

  container.innerHTML = list.map(b => {
    const symbol = b.currency === 'USD' ? '$' : b.currency === 'GBP' ? '£' : '€';
    return `
    <div class="booking-card reveal">
      <div class="booking-card-image">${imgHtml}</div>
      <div class="booking-card-body">
        <div>
          <div class="saving-badge"><i data-lucide="tag" style="width:12px;height:12px;"></i> ${esc(b.label || 'Réservation directe')}</div>
          <h3 style="font-family:var(--font-display);font-size:1.8rem;font-weight:300;margin-bottom:0.5rem;">${esc(property.name)}</h3>
          <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:2rem;">${esc(property.tagline || '')}</p>
          ${b.price_per_night > 0 ? `
            <p class="booking-price">${b.price_per_night}${symbol} <small>/ nuit</small></p>
            <p style="font-size:0.78rem;color:var(--text-dim);margin-top:0.25rem;">Frais de ménage non inclus</p>` : ''}
        </div>
        <div style="margin-top:2rem;">
          <a href="${esc(b.booking_url)}" target="_blank" rel="noopener" class="btn-primary" style="display:inline-flex;">
            <i data-lucide="calendar-check" style="width:16px;height:16px;"></i> Réserver maintenant
          </a>
        </div>
      </div>
    </div>`;
  }).join('');
  setTimeout(() => { lucide.createIcons(); setupScrollReveal(); }, 60);
}

function showLoadError() {
  document.getElementById('booking-container').innerHTML =
    `<div style="text-align:center;padding:4rem 2rem;color:var(--text-muted);">Impossible de charger les données.<br>Vérifiez que le serveur est lancé (<code>npm start</code>).</div>`;
}

// ══════════════════════════════════════════════════════════
// ── CAROUSEL ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════
const carouselImages = {}; // roomId → [url, ...]

window.carSlide = function(roomId, dir) {
  const car = document.getElementById(`car-${roomId}`);
  if (!car) return;
  car.scrollBy({ left: dir * car.clientWidth, behavior: 'smooth' });
};

window.carGoTo = function(roomId, idx) {
  const car = document.getElementById(`car-${roomId}`);
  if (!car) return;
  car.scrollTo({ left: idx * car.clientWidth, behavior: 'smooth' });
};

window.openLightboxFromRoom = function(roomId, idx) {
  currentImages = carouselImages[roomId] || [];
  currentImageIndex = idx;
  if (currentImages[idx]) openLightbox(currentImages[idx]);
};

// ══════════════════════════════════════════════════════════
// ── HOTSPOTS VOYAGEUR ────────────────────────────────────
// ══════════════════════════════════════════════════════════

// Calcule la position réelle d'un hotspot en tenant compte du crop object-fit:cover
function positionHotspot(hotspotEl, img) {
  const xPct = parseFloat(hotspotEl.dataset.x);
  const yPct = parseFloat(hotspotEl.dataset.y);
  if (isNaN(xPct) || isNaN(yPct)) return;
  if (!img.naturalWidth || !img.clientWidth) return;

  const natW = img.naturalWidth,  natH = img.naturalHeight;
  const cW   = img.clientWidth,   cH   = img.clientHeight;
  const natR = natW / natH,       cR   = cW / cH;

  let scale, ox, oy;
  if (natR > cR) {
    // image plus large → ajustée sur la hauteur, bords latéraux coupés
    scale = cH / natH; ox = (cW - natW * scale) / 2; oy = 0;
  } else {
    // image plus haute → ajustée sur la largeur, haut/bas coupés
    scale = cW / natW; ox = 0; oy = (cH - natH * scale) / 2;
  }

  hotspotEl.style.left = ((xPct / 100 * natW * scale + ox) / cW * 100) + '%';
  hotspotEl.style.top  = ((yPct / 100 * natH * scale + oy) / cH * 100) + '%';
}

function setupHotspotPositions() {
  const slides = document.querySelectorAll('.carousel-slide');
  if (!slides.length) return;

  // ResizeObserver pour recalculer quand le conteneur change de taille
  const ro = new ResizeObserver(() => {
    slides.forEach(slide => {
      const img = slide.querySelector('img');
      if (!img) return;
      slide.querySelectorAll('.hotspot').forEach(h => positionHotspot(h, img));
    });
  });

  slides.forEach(slide => {
    const img = slide.querySelector('img');
    if (!img) return;
    const update = () => slide.querySelectorAll('.hotspot').forEach(h => positionHotspot(h, img));
    if (img.complete && img.naturalWidth) update();
    else img.addEventListener('load', update);
    ro.observe(slide);
  });
}

window.toggleHotspotPopup = function(e, dotEl) {
  e.stopPropagation();
  const popup = dotEl.querySelector('.hotspot-popup');
  const isOpen = popup.classList.contains('visible');

  closeAllHotspotPopups();
  if (isOpen) return;

  // Positionnement viewport-aware pour éviter les débordements
  popup.style.cssText = '';
  const dotRect = dotEl.getBoundingClientRect();
  const popupW  = Math.min(220, Math.floor(window.innerWidth * 0.70));
  popup.style.width = popupW + 'px';

  // Horizontal : droite si assez de place, sinon gauche
  if (window.innerWidth - dotRect.right > popupW + 16) {
    popup.style.left = '110%';
  } else {
    popup.style.right = '110%'; popup.style.left = 'auto';
  }
  // Vertical : bas si assez de place, sinon haut
  if (window.innerHeight - dotRect.bottom > 160) {
    popup.style.top = '0';
  } else {
    popup.style.bottom = '0'; popup.style.top = 'auto';
  }

  popup.classList.add('visible');
};

function closeAllHotspotPopups() {
  document.querySelectorAll('.hotspot-popup.visible').forEach(p => p.classList.remove('visible'));
}

// ══════════════════════════════════════════════════════════
// ── VOYAGEUR : INTERACTIONS ───────────────────────────────
// ══════════════════════════════════════════════════════════
function setupNavScroll() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

function setupScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
}

function setupLightbox() {
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', () => navigateLightbox(-1));
  document.getElementById('lightbox-next').addEventListener('click', () => navigateLightbox(1));
  document.getElementById('lightbox').addEventListener('click', e => { if (e.target === document.getElementById('lightbox')) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (!document.getElementById('lightbox').classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}
function navigateLightbox(dir) {
  if (!currentImages.length) return;
  currentImageIndex = (currentImageIndex + dir + currentImages.length) % currentImages.length;
  document.getElementById('lightbox-img').src = currentImages[currentImageIndex];
}

window.toggleAccordion = function(i) {
  const item = document.getElementById(`acc-${i}`);
  const body = item.querySelector('.accordion-body');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.accordion-item.open').forEach(el => {
    el.classList.remove('open');
    el.querySelector('.accordion-body').style.maxHeight = '0';
    el.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
  });
  if (!isOpen) {
    item.classList.add('open');
    body.style.maxHeight = item.querySelector('.accordion-body-inner').scrollHeight + 'px';
    item.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'true');
  }
};

function setupHelpButton() {
  document.getElementById('help-btn').addEventListener('click', () => {
    helpOpen = !helpOpen;
    document.getElementById('help-modal').classList.toggle('active', helpOpen);
  });
  document.addEventListener('click', e => {
    if (helpOpen && !e.target.closest('#help-btn') && !e.target.closest('#help-modal')) {
      helpOpen = false;
      document.getElementById('help-modal').classList.remove('active');
    }
  });
}
window.closeHelp = () => { helpOpen = false; document.getElementById('help-modal').classList.remove('active'); };

// ══════════════════════════════════════════════════════════
// ── ADMIN : AUTHENTIFICATION ──────────────────────────────
// ══════════════════════════════════════════════════════════
window.handleAdminTrigger = function() {
  // Auth temporairement désactivée — ouvre le drawer directement
  applyAdminActiveState();
  openAdminDrawer();
};

window.closeAdminLogin = function() {
  document.getElementById('admin-login-modal').style.display = 'none';
  document.getElementById('adm-login-error').style.display = 'none';
};

function setupAdminLoginForm() {
  document.getElementById('admin-login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('adm-username').value.trim();
    const password = document.getElementById('adm-password').value;
    const errEl = document.getElementById('adm-login-error');
    try {
      const res = await apiFetch('/api/auth/login', false, 'POST', { username, password });
      adminToken = res.token;
      // token en mémoire uniquement, pas de localStorage
      errEl.style.display = 'none';
      document.getElementById('admin-login-form').reset();
      closeAdminLogin();
      applyAdminActiveState();
      openAdminDrawer();
    } catch (err) {
      errEl.textContent = err.message || 'Identifiants incorrects';
      errEl.style.display = 'block';
    }
  });

  // Ferme login modal sur clic backdrop
  document.getElementById('admin-login-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('admin-login-modal')) closeAdminLogin();
  });
}

function applyAdminActiveState() {
  const btn = document.getElementById('admin-nav-btn');
  btn.classList.add('admin-active');
  btn.title = 'Ouvrir le panneau d\'édition';
}

window.adminLogout = function() {
  adminToken = null;
  // rien à supprimer du localStorage
  closeAdminDrawer();
  document.getElementById('admin-nav-btn').classList.remove('admin-active');
  toast('Déconnecté', 'info');
};

// ══════════════════════════════════════════════════════════
// ── ADMIN : DRAWER ────────────────────────────────────────
// ══════════════════════════════════════════════════════════
async function openAdminDrawer() {
  adminDrawerOpen = true;
  document.getElementById('admin-drawer').classList.add('open');
  document.getElementById('drawer-backdrop').classList.add('active');
  document.body.style.overflow = 'hidden';
  await adminLoadDrawerData();
  switchDrawerTab(activeDrawerTab);
  setTimeout(() => lucide.createIcons(), 60);
}

window.closeAdminDrawer = function() {
  adminDrawerOpen = false;
  document.getElementById('admin-drawer').classList.remove('open');
  document.getElementById('drawer-backdrop').classList.remove('active');
  document.body.style.overflow = '';
};

// Swipe-to-close sur mobile
function setupDrawerDragClose() {
  const drawer = document.getElementById('admin-drawer');
  let startX = 0;
  drawer.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  drawer.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientX - startX > 80) closeAdminDrawer();
  }, { passive: true });
}

window.switchDrawerTab = function(tab) {
  activeDrawerTab = tab;
  document.querySelectorAll('.drw-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.drw-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`drw-${tab}`)?.classList.add('active');

  const loaders = {
    info: adminLoadInfo, equip: adminLoadEquip,
    rules: adminLoadRules, booking: adminLoadBooking, settings: adminLoadSettings,
  };
  if (loaders[tab]) loaders[tab]();
};

async function adminLoadDrawerData() {
  try {
    propertyData = await apiFetch(`/api/properties/${PROPERTY_ID}`, false);
    adminRooms = propertyData.rooms || [];
    const nameEl = document.getElementById('drawer-prop-name');
    if (nameEl) nameEl.textContent = propertyData.name;
    populateRoomSelects();
  } catch(err) {
    console.error('Erreur chargement drawer:', err);
  }
}

function populateRoomSelects() {
  // Rooms masquées de l'UI
}

// ── Info logement ──
async function adminLoadInfo() {
  if (!propertyData) return;
  document.getElementById('dp-name').value       = propertyData.name || '';
  document.getElementById('dp-tagline').value    = propertyData.tagline || '';
  document.getElementById('dp-desc').value       = propertyData.description || '';
  document.getElementById('dp-address').value    = propertyData.address || '';
  document.getElementById('dp-max-guests').value = propertyData.max_guests || '';
  document.getElementById('dp-active').value     = String(propertyData.active ?? 1);
  adminLoadHeroGrid();
}

async function adminLoadHeroGrid() {
  const grid = document.getElementById('dp-hero-grid');
  if (!grid) return;
  try {
    const data = await apiFetch(`/api/properties/${PROPERTY_ID}`, false);
    const imgs = data.hero_images || [];
    grid.innerHTML = imgs.length
      ? imgs.map(img => `
          <div style="position:relative;aspect-ratio:16/9;overflow:hidden;border:1px solid var(--adm-border);border-radius:3px;">
            <img src="${imgUrl(img.filename)}" style="width:100%;height:100%;object-fit:cover;">
            <button onclick="adminDeleteHeroImage(${img.id})"
              style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,0.75);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>`).join('')
      : '<p style="font-size:0.75rem;color:var(--adm-text-muted);grid-column:1/-1;">Aucune photo d\'accueil.</p>';
  } catch {}
}


window.adminSaveProp = async function(e) {
  e.preventDefault();
  try {
    await apiFetch(`/api/properties/${PROPERTY_ID}`, true, 'PUT', {
      name:        document.getElementById('dp-name').value.trim(),
      tagline:     document.getElementById('dp-tagline').value.trim(),
      description: document.getElementById('dp-desc').value.trim(),
      address:     document.getElementById('dp-address').value.trim(),
      max_guests:  document.getElementById('dp-max-guests').value.trim(),
      active:      document.getElementById('dp-active').value,
    });
    toast('Logement mis à jour');
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

window.adminUploadHeroImages = async function(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  toast(`Upload de ${files.length} photo(s)…`, 'info');
  try {
    for (const file of files) {
      const fd = new FormData();
      fd.append('image', file);
      await apiFetchForm(`/api/properties/${PROPERTY_ID}/hero`, fd);
    }
    toast(files.length > 1 ? `${files.length} photos ajoutées` : 'Photo ajoutée');
    await adminLoadHeroGrid();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
  input.value = '';
};

window.adminDeleteHeroImage = async function(imgId) {
  if (!confirm('Supprimer cette photo d\'accueil ?')) return;
  try {
    await apiFetch(`/api/properties/${PROPERTY_ID}/hero/${imgId}`, true, 'DELETE');
    toast('Photo supprimée');
    await adminLoadHeroGrid();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

// ── Équipements ──
let currentEquipList = [];

window.adminLoadEquip = async function() {
  try {
    let items = [];
    for (const room of adminRooms) {
      const raw = await apiFetch(`/api/equipment/${room.id}`, false).catch(() => []);
      items.push(...raw);
    }
    // Tri global par order_index (les items viennent de plusieurs rooms
    // différentes — la concat room par room ne respecte pas l'ordre voulu)
    items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0) || a.id - b.id);
    currentEquipList = items;
    const eq = items.filter(e => !e.category || e.category === 'equipement');
    const co = items.filter(e => e.category === 'confort');
    renderEquipAdminList(eq, 'drw-equip-list',   'equipement');
    renderEquipAdminList(co, 'drw-confort-list', 'confort');
    setTimeout(() => lucide.createIcons(), 60);
  } catch (err) {
    document.getElementById('drw-equip-list').innerHTML = `<p style="color:#e05555;">${err.message}</p>`;
  }
};

function renderEquipAdminList(items, containerId, category) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<p style="font-size:0.78rem;color:var(--adm-text-dim,#55555a);">Aucun élément.</p>';
    return;
  }
  el.innerHTML = items.map((e, i) => `
    <div class="equip-row" data-id="${e.id}" data-category="${e.category||'equipement'}">
      <div class="equip-row-order">
        <button class="equip-order-btn" onclick="moveEquip(${e.id},'${category}',-1)" ${i === 0 ? 'disabled' : ''}>▲</button>
        <span class="equip-order-num">${i + 1}</span>
        <button class="equip-order-btn" onclick="moveEquip(${e.id},'${category}',1)" ${i === items.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
      <span style="color:var(--gold);flex-shrink:0;">${iconSvg(e.icon, 14)}</span>
      <p class="equip-row-name">${esc(e.name)}</p>
      <div style="display:flex;gap:0.3rem;flex-shrink:0;">
        <button class="adm-btn adm-btn-ghost adm-btn-xs" onclick="adminEditEquip(${e.id})"><i data-lucide="pencil" style="width:11px;height:11px;"></i></button>
        <button class="adm-btn adm-btn-danger-xs" onclick="adminDeleteEquip(${e.id},'${esc(e.name)}')"><i data-lucide="trash-2" style="width:11px;height:11px;"></i></button>
      </div>
    </div>`).join('');
}

window.moveEquip = async function(id, category, dir) {
  const list = currentEquipList.filter(i => (i.category || 'equipement') === category);
  const idx  = list.findIndex(i => i.id === id);
  const to   = idx + dir;
  if (to < 0 || to >= list.length) return;

  // Échanger les deux items
  [list[idx], list[to]] = [list[to], list[idx]];

  try {
    for (let i = 0; i < list.length; i++) {
      await apiFetch(`/api/equipment/${list[i].id}/order`, true, 'PUT', { order_index: i + 1 });
    }
    await adminLoadEquip();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

window.openEquipForm = function(category) {
  const cat = category || 'equipement';
  document.getElementById('ef-id').value = '';
  document.getElementById('ef-name').value = '';
  document.getElementById('ef-icon').value = 'wrench';
  document.getElementById('ef-category').value = cat;
  document.getElementById('ef-instructions').value = '';
  document.getElementById('ef-tips').value = '';
  document.getElementById('equip-form-title').textContent = cat === 'confort' ? 'Nouvel élément de confort' : 'Nouvel équipement';
  document.getElementById('equip-form-block').style.display = 'block';
};
window.closeEquipForm = function() { document.getElementById('equip-form-block').style.display = 'none'; };

window.adminEditEquip = function(id) {
  const found = currentEquipList.find(e => e.id === id);
  if (!found) return;
  const cat = found.category || 'equipement';
  document.getElementById('ef-id').value = found.id;
  document.getElementById('ef-name').value = found.name;
  document.getElementById('ef-icon').value = found.icon || 'wrench';
  document.getElementById('ef-category').value = cat;
  document.getElementById('ef-instructions').value = found.instructions || '';
  document.getElementById('ef-tips').value = found.tips || '';
  document.getElementById('equip-form-title').textContent = cat === 'confort' ? 'Modifier confort' : 'Modifier équipement';
  document.getElementById('equip-form-block').style.display = 'block';
  document.getElementById('equip-form-block').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.adminSaveEquip = async function() {
  const id = document.getElementById('ef-id').value;
  const roomId = adminRooms[0]?.id;
  if (!roomId) return toast('Aucune pièce disponible', 'error');
  const body = {
    room_id: roomId,
    name: document.getElementById('ef-name').value.trim(),
    icon: document.getElementById('ef-icon').value,
    category: document.getElementById('ef-category').value,
    instructions: document.getElementById('ef-instructions').value.trim(),
    tips: document.getElementById('ef-tips').value.trim(),
  };
  if (!body.name) return toast('Nom requis', 'error');
  try {
    if (id) { await apiFetch(`/api/equipment/${id}`, true, 'PUT', body); toast('Mis à jour'); }
    else     { await apiFetch('/api/equipment', true, 'POST', body); toast('Créé'); }
    closeEquipForm();
    await adminLoadEquip();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

window.adminDeleteEquip = async function(id, name) {
  if (!confirm(`Supprimer "${name}" ?`)) return;
  try {
    await apiFetch(`/api/equipment/${id}`, true, 'DELETE');
    toast('Équipement supprimé');
    await adminLoadEquip();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

// ── Règles ──
async function adminLoadRules() {
  try {
    const r = await apiFetch(`/api/rules/${PROPERTY_ID}`, false);
    document.getElementById('dr-checkin-time').value  = r.check_in_time  || '15:00';
    document.getElementById('dr-checkout-time').value = r.check_out_time || '11:00';
    document.getElementById('dr-key-box').value       = r.key_box_code || '';
    document.getElementById('dr-checkin-inst').value  = r.check_in_instructions  || '';
    document.getElementById('dr-checkout-inst').value = r.check_out_instructions || '';
    document.getElementById('dr-wifi-name').value     = r.wifi_name || '';
    document.getElementById('dr-wifi-pass').value     = r.wifi_password || '';
    document.getElementById('dr-trash').value         = r.trash_instructions || '';
    document.getElementById('dr-house-rules').value   = r.house_rules || '';
    document.getElementById('dr-parking').value       = r.parking_instructions || '';
    document.getElementById('dr-places').value        = r.places_to_discover || '';
  } catch {}
}

window.adminSaveRules = async function() {
  try {
    await apiFetch(`/api/rules/${PROPERTY_ID}`, true, 'PUT', {
      check_in_time:          document.getElementById('dr-checkin-time').value,
      check_out_time:         document.getElementById('dr-checkout-time').value,
      key_box_code:           document.getElementById('dr-key-box').value,
      check_in_instructions:  document.getElementById('dr-checkin-inst').value,
      check_out_instructions: document.getElementById('dr-checkout-inst').value,
      wifi_name:              document.getElementById('dr-wifi-name').value,
      wifi_password:          document.getElementById('dr-wifi-pass').value,
      trash_instructions:     document.getElementById('dr-trash').value,
      house_rules:            document.getElementById('dr-house-rules').value,
      parking_instructions:   document.getElementById('dr-parking').value,
      places_to_discover:     document.getElementById('dr-places').value,
    });
    toast('Contenu enregistré');
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

// ── Réservation ──
async function adminLoadBooking() {
  try {
    const list = await apiFetch(`/api/rules/booking/${PROPERTY_ID}`, false);
    renderAdminBookingList(Array.isArray(list) ? list : []);
  } catch {}
}

function renderAdminBookingList(list) {
  const el = document.getElementById('booking-list');
  if (!list.length) {
    el.innerHTML = `<p style="font-size:0.8rem;color:var(--adm-text-muted);">Aucun lien pour l'instant.</p>`;
    return;
  }
  el.innerHTML = list.map(b => `
    <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.6rem;background:var(--adm-surface-2,#1a1a22);border:1px solid var(--adm-border);border-radius:4px;">
      <div style="flex:1;min-width:0;">
        <p style="font-size:0.8rem;font-weight:600;color:var(--adm-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(b.label || 'Sans nom')}</p>
        <p style="font-size:0.7rem;color:var(--adm-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(b.booking_url)}</p>
        ${b.price_per_night > 0 ? `<p style="font-size:0.7rem;color:var(--gold);">${b.price_per_night} ${b.currency}/nuit</p>` : ''}
      </div>
      <button class="adm-btn adm-btn-ghost adm-btn-xs" onclick="adminDeleteBooking(${b.id})" title="Supprimer">
        <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
      </button>
    </div>
  `).join('');
  lucide.createIcons();
}

window.adminAddBooking = async function(e) {
  e.preventDefault();
  try {
    await apiFetch(`/api/rules/booking/${PROPERTY_ID}`, true, 'POST', {
      label:           document.getElementById('db-label').value.trim(),
      price_per_night: Number(document.getElementById('db-price').value) || 0,
      currency:        document.getElementById('db-currency').value,
      booking_url:     document.getElementById('db-url').value.trim(),
      is_active:       1,
    });
    // Vide le formulaire
    document.getElementById('db-label').value = '';
    document.getElementById('db-url').value   = '';
    document.getElementById('db-price').value = '';
    toast('Lien ajouté ✓');
    await adminLoadBooking();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

window.adminDeleteBooking = async function(id) {
  try {
    await apiFetch(`/api/rules/booking/item/${id}`, true, 'DELETE');
    toast('Lien supprimé');
    await adminLoadBooking();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

// ── Paramètres ──
async function adminLoadSettings() {
  try {
    const s = await apiFetch('/api/rules/settings/all', false);
    document.getElementById('ds-sitename').value = s.site_name || '';
    document.getElementById('ds-phone').value    = s.help_phone || '';
    document.getElementById('ds-email').value    = s.help_email || '';
  } catch {}
}

window.adminSaveSettings = async function(e) {
  e.preventDefault();
  try {
    await Promise.all([
      apiFetch('/api/rules/settings/site_name',  true, 'PUT', { value: document.getElementById('ds-sitename').value.trim() }),
      apiFetch('/api/rules/settings/help_phone', true, 'PUT', { value: document.getElementById('ds-phone').value.trim() }),
      apiFetch('/api/rules/settings/help_email', true, 'PUT', { value: document.getElementById('ds-email').value.trim() }),
    ]);
    toast('Paramètres enregistrés');
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

window.adminChangePassword = async function(e) {
  e.preventDefault();
  const cur  = document.getElementById('ds-cur-pass').value;
  const nw   = document.getElementById('ds-new-pass').value;
  const conf = document.getElementById('ds-confirm-pass').value;
  if (nw !== conf) return toast('Les mots de passe ne correspondent pas', 'error');
  if (nw.length < 8) return toast('Minimum 8 caractères', 'error');
  try {
    await apiFetch('/api/auth/change-password', true, 'POST', { currentPassword: cur, newPassword: nw });
    toast('Mot de passe changé — reconnexion dans 2s');
    ['ds-cur-pass','ds-new-pass','ds-confirm-pass'].forEach(id => document.getElementById(id).value = '');
    setTimeout(adminLogout, 2000);
  } catch (err) { toast(err.message, 'error'); }
};

// ══════════════════════════════════════════════════════════
// ── UTILITAIRES ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════

// Rafraîchit la page voyageur sans rechargement complet
async function refreshPage() {
  try {
    propertyData = await apiFetch(`/api/properties/${PROPERTY_ID}`, false);
    adminRooms = propertyData.rooms || [];
    renderAll(propertyData);
    document.getElementById('drawer-prop-name').textContent = propertyData.name;
    populateRoomSelects();
  } catch {}
}

// Fetch avec ou sans JWT
async function apiFetch(url, needAuth = false, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (needAuth && adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) { adminToken = null; localStorage.removeItem('av_token'); }
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return data;
}

async function apiFetchForm(url, formData) {
  const headers = {};
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  const res = await fetch(url, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

// Toast notifications
window.toast = function(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  const icons = { success: 'check-circle', error: 'x-circle', info: 'info' };
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i data-lucide="${icons[type]||'info'}" style="width:14px;height:14px;flex-shrink:0;"></i> ${esc(msg)}`;
  container.appendChild(el);
  lucide.createIcons({ nodes: [el] });
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateY(10px)'; el.style.transition='all 0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
};

// ══════════════════════════════════════════════════════════
// ── ADMIN : MODAL HOTSPOT ────────────────────────────────
// ══════════════════════════════════════════════════════════
let hmImageId = null;
let hmPending = null;
let hmMode = 'existing'; // 'existing' | 'free'

function hmSetMode(mode) {
  hmMode = mode;
  document.getElementById('hm-mode-existing').classList.toggle('active', mode === 'existing');
  document.getElementById('hm-mode-free').classList.toggle('active', mode === 'free');
  document.getElementById('hm-block-existing').style.display = mode === 'existing' ? 'block' : 'none';
  document.getElementById('hm-block-free').style.display     = mode === 'free'     ? 'block' : 'none';
}

function hmCancel() {
  hmPending = null;
  document.getElementById('hotspot-place-form').classList.remove('open');
  const p = document.querySelector('#hotspot-modal-img-wrap .hm-dot-pending');
  if (p) p.remove();
}

async function hmConfirm() {
  if (!hmPending || !hmImageId) return;
  try {
    if (hmMode === 'existing') {
      const equipId = document.getElementById('hm-equip-select').value;
      if (!equipId) { toast('Sélectionnez un équipement', 'error'); return; }
      await apiFetch('/api/hotspots', true, 'POST', {
        room_image_id: hmImageId,
        equipment_id:  Number(equipId),
        x_percent: hmPending.x,
        y_percent: hmPending.y,
      });
    } else if (hmMode === 'free') {
      const label       = document.getElementById('hm-free-label').value.trim();
      const description = document.getElementById('hm-free-desc').value.trim();
      if (!label) { toast('Le titre est requis', 'error'); return; }
      await apiFetch('/api/hotspots', true, 'POST', {
        room_image_id: hmImageId,
        label, description,
        x_percent: hmPending.x,
        y_percent: hmPending.y,
      });
    }
    toast('Point ajouté ✓');
    hmCancel();
    await renderHmDots();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
}

// Câblage des boutons du formulaire (une seule fois au chargement)
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('hm-mode-existing').addEventListener('click', function(e) { e.stopPropagation(); hmSetMode('existing'); });
  document.getElementById('hm-mode-free').addEventListener('click',     function(e) { e.stopPropagation(); hmSetMode('free'); });
  document.getElementById('hm-confirm-btn').addEventListener('click',   function(e) { e.stopPropagation(); hmConfirm(); });
  document.getElementById('hm-cancel-btn').addEventListener('click',    function(e) { e.stopPropagation(); hmCancel(); });
});

window.openHotspotModal = async function(imageId, filename, roomName) {
  hmImageId = imageId;
  hmPending = null;

  document.getElementById('hm-room-name').textContent = roomName;
  document.getElementById('hm-photo').src = imgUrl(filename);
  document.getElementById('hotspot-modal').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Équipements disponibles
  const sel = document.getElementById('hm-equip-select');
  sel.innerHTML = adminRooms.flatMap(r =>
    (r.equipment || []).map(e => `<option value="${e.id}">${esc(r.name)} — ${esc(e.name)}</option>`)
  ).join('');

  hmSetMode('existing');
  await renderHmDots();
  hmCancel();
};

window.closeHotspotModal = function() {
  document.getElementById('hotspot-modal').classList.remove('open');
  document.body.style.overflow = '';
  hmImageId = null; hmPending = null;
};

window.handleHotspotPhotoClick = function(e) {
  if (e.target.closest('#hotspot-place-form') || e.target.closest('.hm-dot')) return;

  const wrap    = document.getElementById('hotspot-modal-img-wrap');
  const imgRect = document.getElementById('hm-photo').getBoundingClientRect();

  const x = ((e.clientX - imgRect.left) / imgRect.width)  * 100;
  const y = ((e.clientY - imgRect.top)  / imgRect.height) * 100;
  if (x < 0 || x > 100 || y < 0 || y > 100) return;

  hmPending = { x, y };

  let dot = wrap.querySelector('.hm-dot-pending');
  if (!dot) { dot = document.createElement('div'); dot.className = 'hm-dot hm-dot-pending'; wrap.appendChild(dot); }
  dot.style.left = `${x}%`;
  dot.style.top  = `${y}%`;

  const form = document.getElementById('hotspot-place-form');
  form.style.left   = x > 60 ? 'auto' : `${x}%`;
  form.style.right  = x > 60 ? `${100 - x}%` : 'auto';
  form.style.top    = y > 70 ? 'auto' : `${y + 5}%`;
  form.style.bottom = y > 70 ? `${100 - y + 5}%` : 'auto';
  form.classList.add('open');

  // Vide les champs note libre
  document.getElementById('hm-free-label').value = '';
  document.getElementById('hm-free-desc').value  = '';
};

async function renderHmDots() {
  if (!hmImageId) return;
  // Supprime les anciens dots (sauf pending)
  document.querySelectorAll('#hotspot-modal-img-wrap .hm-dot:not(.hm-dot-pending)').forEach(d => d.remove());
  document.getElementById('hm-hotspots-list').innerHTML = '';

  try {
    const hotspots = await apiFetch(`/api/hotspots/image/${hmImageId}`, false);
    const wrap = document.getElementById('hotspot-modal-img-wrap');
    const img  = document.getElementById('hm-photo');

    hotspots.forEach((h, i) => {
      // Couleur selon le type
      const typeColor = h.hotspot_type === 'navigation' ? '#6ec6ff'
                      : h.hotspot_type === 'note'       ? '#a78bfa'
                      :                                   'var(--gold)';
      const typeIcon  = h.hotspot_type === 'navigation' ? '↗'
                      : h.hotspot_type === 'note'       ? '📝'
                      :                                   '⚙';

      // Dot sur la photo
      const dot = document.createElement('div');
      dot.className = 'hm-dot';
      dot.textContent = i + 1;
      dot.style.left = `${h.x_percent}%`;
      dot.style.top  = `${h.y_percent}%`;
      dot.style.background = typeColor;
      dot.title = `Supprimer : ${h.name}`;
      dot.onclick = (e) => { e.stopPropagation(); deleteHotspot(h.id); };
      wrap.appendChild(dot);

      // Liste sous la photo
      const tag = document.createElement('div');
      tag.style.cssText = 'display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.6rem;background:var(--adm-surface-2);border:1px solid var(--adm-border);font-size:0.75rem;color:var(--adm-text-muted);';
      tag.innerHTML = `
        <span style="width:16px;height:16px;border-radius:50%;background:${typeColor};color:#060608;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;flex-shrink:0;">${i+1}</span>
        <span style="font-size:0.7rem;opacity:0.6;">${typeIcon}</span>
        ${esc(h.name)}
        <button onclick="deleteHotspot(${h.id})" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#e05555;font-size:0.75rem;" title="Supprimer">✕</button>`;
      document.getElementById('hm-hotspots-list').appendChild(tag);
    });
  } catch {}
}


async function deleteHotspot(id) {
  if (!confirm('Supprimer ce point ?')) return;
  try {
    await apiFetch(`/api/hotspots/${id}`, true, 'DELETE');
    toast('Point supprimé');
    await renderHmDots();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
}

// Icône Lucide inline
function iconSvg(name, size = 14) {
  const map = { tv:'tv-2', wifi:'wifi', wind:'wind', flame:'flame', square:'square', droplets:'droplets', coffee:'coffee', moon:'moon', sun:'sun', droplet:'droplet', tool:'wrench', zap:'zap', thermometer:'thermometer' };
  return `<i data-lucide="${map[name]||name||'wrench'}" style="width:${size}px;height:${size}px;display:inline-block;vertical-align:middle;"></i>`;
}


function imgUrl(filename) {
  if (!filename) return '';
  return /^https?:\/\//.test(filename) ? filename : '/uploads/' + filename;
}
// Échappe HTML (protection XSS)
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
