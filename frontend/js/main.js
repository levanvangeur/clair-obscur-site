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
  renderRooms(data.rooms || []);
  renderGuide(data.rooms || []);
  renderRules(data.rules, data.settings);
  renderBooking(data, data.bookings);
  renderHelpContact(data.settings);
  setTimeout(() => lucide.createIcons(), 60);
}

function updateMeta(data) {
  const title = `${data.name} — Location courte durée`;
  document.title = title;
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-desc').setAttribute('content', data.tagline || '');
}

function renderHero(data) {
  const siteName = data.settings?.site_name || data.name;
  document.getElementById('nav-logo').textContent = siteName;
  document.getElementById('footer-name').textContent = siteName;
  document.getElementById('hero-title').innerHTML = data.name.replace(' ', '<br>');
  document.getElementById('hero-tagline').textContent = data.tagline || '';
  if (data.main_image) {
    const bg = document.getElementById('hero-bg');
    const img = new Image();
    img.onload = () => { bg.style.backgroundImage = `url(/uploads/${data.main_image})`; bg.classList.add('loaded'); };
    img.src = `/uploads/${data.main_image}`;
  }
}

function renderRooms(rooms) {
  const container = document.getElementById('rooms-container');

  // Aplatit toutes les photos de toutes les pièces dans un seul tableau
  const allSlides = [];
  rooms.forEach(room => {
    (room.images || []).forEach(img => allSlides.push({ img, room }));
  });

  if (!allSlides.length) {
    container.innerHTML = '<div class="section" style="color:var(--text-muted);text-align:center;padding:4rem 2rem;">Aucune photo configurée — ajoutez-en via le panneau admin.</div>';
    return;
  }

  const total = allSlides.length;

  container.innerHTML = `
    <div class="carousel-wrap" id="cwrap-global">
      <div class="carousel" id="car-global">
        ${allSlides.map(({ img, room }, idx) => `
          <div class="carousel-slide" data-idx="${idx}">
            <img src="/uploads/${esc(img.filename)}"
                 alt="${esc(img.alt_text || room.name)}"
                 loading="${idx === 0 ? 'eager' : 'lazy'}"
                 onclick="openLightboxGlobal(${idx})">
            <div class="slide-room-tag">${esc(room.name)}</div>
            ${(img.hotspots || []).map(h => `
              <div class="hotspot" data-x="${h.x_percent}" data-y="${h.y_percent}" onclick="toggleHotspotPopup(event,this)">
                <div class="hotspot-pulse"></div>
                <div class="hotspot-ring">${iconSvg(h.icon, 11)}</div>
                <div class="hotspot-popup">
                  <div class="hotspot-popup-inner">
                    <div class="hotspot-popup-icon">${iconSvg(h.icon, 14)}</div>
                    <p class="hotspot-popup-name">${esc(h.name)}</p>
                    ${h.instructions ? `<p class="hotspot-popup-instructions">${esc(h.instructions)}</p>` : ''}
                    ${h.tips ? `<div class="hotspot-popup-tips">💡 ${esc(h.tips)}</div>` : ''}
                  </div>
                </div>
              </div>`).join('')}
          </div>`).join('')}
      </div>

      ${total > 1 ? `
        <button class="carousel-btn carousel-btn-prev" onclick="carSlide('global',-1)" aria-label="Précédent">
          <i data-lucide="chevron-left" style="width:20px;height:20px;"></i>
        </button>
        <button class="carousel-btn carousel-btn-next" onclick="carSlide('global',1)" aria-label="Suivant">
          <i data-lucide="chevron-right" style="width:20px;height:20px;"></i>
        </button>
        <div class="carousel-counter" id="ccount-global">1 / ${total}</div>
        <div class="carousel-dots" id="cdots-global">
          ${allSlides.map((_,i) => `<div class="carousel-dot ${i===0?'active':''}" onclick="carGoTo('global',${i})"></div>`).join('')}
        </div>` : ''}
    </div>`;

  // Sync scroll → compteur + dots
  const car = document.getElementById('car-global');
  if (car && total > 1) {
    car.addEventListener('scroll', () => {
      const idx = Math.round(car.scrollLeft / car.clientWidth);
      const count = document.getElementById('ccount-global');
      const dots  = document.querySelectorAll('#cdots-global .carousel-dot');
      if (count) count.textContent = `${idx + 1} / ${total}`;
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }, { passive: true });
  }

  // Lightbox globale
  currentImages = allSlides.map(s => `/uploads/${s.img.filename}`);

  // Ferme les popups hotspot si on clique ailleurs
  document.addEventListener('click', e => {
    if (!e.target.closest('.hotspot')) closeAllHotspotPopups();
  }, { capture: true });

  setTimeout(() => { lucide.createIcons(); setupScrollReveal(); setupHotspotPositions(); }, 100);
}

window.openLightboxGlobal = function(idx) {
  currentImageIndex = idx;
  if (currentImages[idx]) openLightbox(currentImages[idx]);
};

function renderGuide(rooms) {
  const container = document.getElementById('guide-container');
  const all = rooms.flatMap(r => (r.equipment || []).map(e => ({ ...e, roomName: r.name })));
  if (!all.length) { container.innerHTML = '<p style="color:var(--text-muted);padding:2rem 0;">Aucun équipement configuré.</p>'; return; }

  container.innerHTML = all.map((eq, i) => `
    <div class="accordion-item" id="acc-${i}">
      <button class="accordion-trigger" onclick="toggleAccordion(${i})" aria-expanded="false">
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

function renderRules(rules, settings) {
  const container = document.getElementById('rules-container');
  if (!rules) { container.innerHTML = '<p style="color:var(--text-muted);">Règles non configurées.</p>'; return; }

  container.innerHTML = [
    { icon: 'log-in',  eyebrow: 'Arrivée — Check-in',  time: rules.check_in_time,  text: rules.check_in_instructions },
    { icon: 'log-out', eyebrow: 'Départ — Check-out',   time: rules.check_out_time, text: rules.check_out_instructions },
    { icon: 'trash-2', eyebrow: 'Poubelles',             time: null,                 text: rules.trash_instructions },
  ].map(c => `
    <div class="rule-card reveal">
      <div class="rule-card-icon"><i data-lucide="${c.icon}" style="width:18px;height:18px;"></i></div>
      <p class="text-eyebrow" style="margin-bottom:0.5rem;">${esc(c.eyebrow)}</p>
      ${c.time ? `<p class="rule-card-time">${esc(c.time)}</p>` : ''}
      ${c.text ? `<p style="margin-top:0.75rem;font-size:0.85rem;color:var(--text-muted);line-height:1.8;">${esc(c.text)}</p>` : ''}
    </div>`).join('');

  if (rules.wifi_name || rules.wifi_password) {
    container.innerHTML += `
      <div class="rule-card wifi-card reveal">
        <div class="rule-card-icon"><i data-lucide="wifi" style="width:18px;height:18px;"></i></div>
        <p class="text-eyebrow" style="margin-bottom:0.5rem;">WiFi</p>
        <p style="font-size:0.78rem;color:var(--text-muted);">Réseau</p>
        <p class="wifi-password">${esc(rules.wifi_name || '')}</p>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-top:0.75rem;">Mot de passe</p>
        <p class="wifi-password">${esc(rules.wifi_password || '')}</p>
      </div>`;
  }

  if (rules.house_rules) {
    const block = document.getElementById('house-rules-block');
    block.style.display = 'block';
    document.getElementById('house-rules-text').textContent = rules.house_rules;
  }
  setTimeout(() => { lucide.createIcons(); setupScrollReveal(); }, 60);
}

function renderBooking(property, bookings) {
  const container = document.getElementById('booking-container');
  const list = Array.isArray(bookings) ? bookings : (bookings ? [bookings] : []);
  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:3rem;border:1px solid var(--border);color:var(--text-muted);">Lien de réservation à configurer dans le panneau admin.</div>`;
    return;
  }
  const imgSrc = property.main_image ? `/uploads/${property.main_image}` : null;
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

function renderHelpContact(settings) {
  if (!settings) return;
  const phone = settings.help_phone || '';
  const email = settings.help_email || '';
  if (phone) { document.getElementById('help-phone-num').textContent = phone; document.getElementById('help-phone-link').href = `tel:${phone.replace(/\s/g, '')}`; }
  if (email) { document.getElementById('help-email-addr').textContent = email; document.getElementById('help-email-link').href = `mailto:${email}`; }
}

function showLoadError() {
  document.getElementById('rooms-container').innerHTML =
    `<div class="section" style="text-align:center;padding:4rem 2rem;color:var(--text-muted);">Impossible de charger les données.<br>Vérifiez que le serveur est lancé (<code>npm start</code>).</div>`;
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
  if (adminToken) {
    openAdminDrawer();
  } else {
    document.getElementById('admin-login-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('adm-username').focus(), 50);
  }
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
  document.getElementById(`drw-${tab}`).classList.add('active');

  // Charge les données du tab
  const loaders = {
    info: adminLoadInfo, rooms: adminLoadRooms, equip: adminLoadEquip,
    rules: adminLoadRules, booking: adminLoadBooking, settings: adminLoadSettings,
  };
  if (loaders[tab]) loaders[tab]();
};

async function adminLoadDrawerData() {
  try {
    propertyData = await apiFetch(`/api/properties/${PROPERTY_ID}`, false);
    adminRooms = propertyData.rooms || [];
    document.getElementById('drawer-prop-name').textContent = propertyData.name;
    populateRoomSelects();
  } catch {}
}

function populateRoomSelects() {
  ['drw-equip-room-filter', 'ef-room-id'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isFilter = id === 'drw-equip-room-filter';
    el.innerHTML = (isFilter ? '<option value="">Toutes les pièces</option>' : '') +
      adminRooms.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  });
}

// ── Info logement ──
async function adminLoadInfo() {
  if (!propertyData) return;
  document.getElementById('dp-name').value    = propertyData.name || '';
  document.getElementById('dp-tagline').value = propertyData.tagline || '';
  document.getElementById('dp-desc').value    = propertyData.description || '';
  document.getElementById('dp-active').value  = String(propertyData.active ?? 1);
  if (propertyData.main_image) {
    document.getElementById('dp-img-preview').innerHTML =
      `<img src="/uploads/${propertyData.main_image}?t=${Date.now()}" style="max-height:140px;border:1px solid var(--adm-border);">`;
  }
}

window.adminSaveProp = async function(e) {
  e.preventDefault();
  try {
    await apiFetch(`/api/properties/${PROPERTY_ID}`, true, 'PUT', {
      name:        document.getElementById('dp-name').value.trim(),
      tagline:     document.getElementById('dp-tagline').value.trim(),
      description: document.getElementById('dp-desc').value.trim(),
      active:      document.getElementById('dp-active').value,
    });
    toast('Logement mis à jour');
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

window.adminUploadPropImage = async function(input) {
  if (!input.files[0]) return;
  const fd = new FormData();
  fd.append('image', input.files[0]);
  try {
    toast('Upload en cours…', 'info');
    const res = await apiFetchForm(`/api/properties/${PROPERTY_ID}/image`, fd);
    document.getElementById('dp-img-preview').innerHTML =
      `<img src="/uploads/${res.filename}?t=${Date.now()}" style="max-height:140px;border:1px solid var(--adm-border);">`;
    toast('Image mise à jour');
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

// ── Pièces ──
async function adminLoadRooms() {
  const list = document.getElementById('drw-rooms-list');
  try {
    const rooms = await apiFetch(`/api/rooms/${PROPERTY_ID}`, false);
    adminRooms = rooms;
    populateRoomSelects();
    if (!rooms.length) {
      list.innerHTML = '<p style="color:var(--adm-text-muted);font-size:0.82rem;">Aucune pièce. Cliquez sur "Ajouter".</p>';
      return;
    }
    list.innerHTML = rooms.map(room => `
      <div style="border:1px solid var(--adm-border);margin-bottom:0.75rem;">
        <div style="padding:0.75rem;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <p style="font-size:0.88rem;font-weight:500;">${esc(room.name)}</p>
            <p style="font-size:0.75rem;color:var(--adm-text-muted);">${(room.images||[]).length} photo(s) · ${(room.equipment||[]).length} équipement(s)</p>
          </div>
          <div style="display:flex;gap:0.4rem;">
            <button class="adm-btn adm-btn-ghost adm-btn-xs" onclick="adminEditRoom(${room.id})" title="Modifier">
              <i data-lucide="pencil" style="width:12px;height:12px;"></i>
            </button>
            <button class="adm-btn adm-btn-ghost adm-btn-xs" onclick="toggleRoomPhotos(${room.id})" title="Photos">
              <i data-lucide="image" style="width:12px;height:12px;"></i>
            </button>
            <button class="adm-btn adm-btn-danger-xs" onclick="adminDeleteRoom(${room.id}, '${esc(room.name)}')" title="Supprimer">
              <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
            </button>
          </div>
        </div>
        <!-- Zone photos (masquée par défaut) -->
        <div id="photos-${room.id}" style="display:none;padding:0.75rem;border-top:1px solid var(--adm-border);background:var(--adm-surface-2);">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.4rem;margin-bottom:0.5rem;" id="imgs-${room.id}">
            ${(room.images||[]).map(img => `
              <div style="position:relative;aspect-ratio:4/3;overflow:hidden;border:1px solid var(--adm-border);">
                <img src="/uploads/${esc(img.filename)}" style="width:100%;height:100%;object-fit:cover;">
                <button onclick="adminDeleteRoomImage(${room.id},${img.id})" style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,0.7);border:none;color:white;width:20px;height:20px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;">✕</button>
              </div>`).join('')}
          </div>
          <label style="display:flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.5rem;border:1px dashed var(--adm-border);cursor:pointer;font-size:0.75rem;color:var(--adm-text-muted);">
            <i data-lucide="image-plus" style="width:14px;height:14px;"></i> Ajouter une photo
            <input type="file" accept="image/*" style="display:none;" onchange="adminUploadRoomImg(${room.id},this)">
          </label>

          ${(room.images||[]).length ? `
            <p style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--adm-text-dim);margin-top:0.75rem;margin-bottom:0.4rem;">Points interactifs par photo</p>
            ${(room.images||[]).map(img => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--adm-border);">
                <span style="font-size:0.73rem;color:var(--adm-text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">${esc(img.filename.split('/').pop())}</span>
                <button class="adm-btn adm-btn-ghost adm-btn-xs" onclick="openHotspotModal(${img.id},'${esc(img.filename)}','${esc(room.name)}')">
                  <i data-lucide="map-pin" style="width:11px;height:11px;color:var(--gold);"></i>
                  ${(img.hotspots||[]).length ? `${img.hotspots.length} point(s)` : 'Placer des points'}
                </button>
              </div>`).join('')}` : ''}
        </div>
      </div>`).join('');
    setTimeout(() => lucide.createIcons(), 60);
  } catch (err) {
    list.innerHTML = `<p style="color:#e05555;font-size:0.82rem;">${err.message}</p>`;
  }
}

window.toggleRoomPhotos = function(roomId) {
  const zone = document.getElementById(`photos-${roomId}`);
  if (zone) { zone.style.display = zone.style.display === 'none' ? 'block' : 'none'; lucide.createIcons(); }
};

window.openRoomForm = function() {
  document.getElementById('rf-id').value = '';
  document.getElementById('rf-name').value = '';
  document.getElementById('rf-desc').value = '';
  document.getElementById('rf-order').value = adminRooms.length;
  document.getElementById('room-form-title').textContent = 'Nouvelle pièce';
  document.getElementById('room-form-block').style.display = 'block';
};
window.closeRoomForm = function() { document.getElementById('room-form-block').style.display = 'none'; };

window.adminEditRoom = function(id) {
  const room = adminRooms.find(r => r.id === id);
  if (!room) return;
  document.getElementById('rf-id').value    = room.id;
  document.getElementById('rf-name').value  = room.name;
  document.getElementById('rf-desc').value  = room.description || '';
  document.getElementById('rf-order').value = room.order_index ?? 0;
  document.getElementById('room-form-title').textContent = 'Modifier la pièce';
  document.getElementById('room-form-block').style.display = 'block';
  document.getElementById('room-form-block').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.adminSaveRoom = async function() {
  const id = document.getElementById('rf-id').value;
  const body = { property_id: PROPERTY_ID, name: document.getElementById('rf-name').value.trim(), description: document.getElementById('rf-desc').value.trim(), order_index: Number(document.getElementById('rf-order').value) };
  if (!body.name) return toast('Nom requis', 'error');
  try {
    if (id) { await apiFetch(`/api/rooms/${id}`, true, 'PUT', body); toast('Pièce mise à jour'); }
    else     { await apiFetch('/api/rooms', true, 'POST', body); toast('Pièce créée'); }
    closeRoomForm();
    await adminLoadRooms();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

window.adminDeleteRoom = async function(id, name) {
  if (!confirm(`Supprimer la pièce "${name}" ?`)) return;
  try {
    await apiFetch(`/api/rooms/${id}`, true, 'DELETE');
    toast('Pièce supprimée');
    await adminLoadRooms();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

window.adminUploadRoomImg = async function(roomId, input) {
  if (!input.files[0]) return;
  const fd = new FormData();
  fd.append('image', input.files[0]);
  try {
    toast('Upload…', 'info');
    await apiFetchForm(`/api/rooms/${roomId}/images`, fd);
    toast('Photo ajoutée');
    await adminLoadRooms();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

window.adminDeleteRoomImage = async function(roomId, imgId) {
  if (!confirm('Supprimer cette photo ?')) return;
  try {
    await apiFetch(`/api/rooms/${roomId}/images/${imgId}`, true, 'DELETE');
    toast('Photo supprimée');
    await adminLoadRooms();
    await refreshPage();
  } catch (err) { toast(err.message, 'error'); }
};

// ── Équipements ──
window.adminLoadEquip = async function() {
  const list = document.getElementById('drw-equip-list');
  const filterRoomId = document.getElementById('drw-equip-room-filter').value;
  try {
    let items = [];
    if (filterRoomId) {
      const raw = await apiFetch(`/api/equipment/${filterRoomId}`, false);
      items = raw.map(e => ({ ...e, roomName: adminRooms.find(r => r.id === e.room_id)?.name || '—' }));
    } else {
      for (const room of adminRooms) {
        const raw = await apiFetch(`/api/equipment/${room.id}`, false).catch(() => []);
        items.push(...raw.map(e => ({ ...e, roomName: room.name })));
      }
    }
    if (!items.length) { list.innerHTML = '<p style="color:var(--adm-text-muted);font-size:0.82rem;">Aucun équipement.</p>'; return; }
    list.innerHTML = items.map(e => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.625rem 0;border-bottom:1px solid var(--adm-border);">
        <div style="display:flex;align-items:center;gap:0.6rem;min-width:0;">
          <span style="color:var(--gold);flex-shrink:0;">${iconSvg(e.icon, 14)}</span>
          <div style="min-width:0;">
            <p style="font-size:0.83rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(e.name)}</p>
            <p style="font-size:0.72rem;color:var(--adm-text-muted);">${esc(e.roomName)}</p>
          </div>
        </div>
        <div style="display:flex;gap:0.3rem;flex-shrink:0;margin-left:0.5rem;">
          <button class="adm-btn adm-btn-ghost adm-btn-xs" onclick="adminEditEquip(${e.id})"><i data-lucide="pencil" style="width:11px;height:11px;"></i></button>
          <button class="adm-btn adm-btn-danger-xs" onclick="adminDeleteEquip(${e.id},'${esc(e.name)}')"><i data-lucide="trash-2" style="width:11px;height:11px;"></i></button>
        </div>
      </div>`).join('');
    setTimeout(() => lucide.createIcons(), 60);
  } catch (err) { list.innerHTML = `<p style="color:#e05555;font-size:0.82rem;">${err.message}</p>`; }
};

window.openEquipForm = function() {
  document.getElementById('ef-id').value = '';
  document.getElementById('ef-name').value = '';
  document.getElementById('ef-icon').value = 'wrench';
  document.getElementById('ef-instructions').value = '';
  document.getElementById('ef-tips').value = '';
  document.getElementById('equip-form-title').textContent = 'Nouvel équipement';
  document.getElementById('equip-form-block').style.display = 'block';
};
window.closeEquipForm = function() { document.getElementById('equip-form-block').style.display = 'none'; };

window.adminEditEquip = async function(id) {
  let found = null;
  for (const room of adminRooms) {
    const items = await apiFetch(`/api/equipment/${room.id}`, false).catch(() => []);
    found = items.find(e => e.id === id);
    if (found) break;
  }
  if (!found) return;
  document.getElementById('ef-id').value = found.id;
  document.getElementById('ef-room-id').value = found.room_id;
  document.getElementById('ef-name').value = found.name;
  document.getElementById('ef-icon').value = found.icon || 'wrench';
  document.getElementById('ef-instructions').value = found.instructions || '';
  document.getElementById('ef-tips').value = found.tips || '';
  document.getElementById('equip-form-title').textContent = 'Modifier l\'équipement';
  document.getElementById('equip-form-block').style.display = 'block';
  document.getElementById('equip-form-block').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.adminSaveEquip = async function() {
  const id = document.getElementById('ef-id').value;
  const body = { room_id: document.getElementById('ef-room-id').value, name: document.getElementById('ef-name').value.trim(), icon: document.getElementById('ef-icon').value, instructions: document.getElementById('ef-instructions').value.trim(), tips: document.getElementById('ef-tips').value.trim() };
  if (!body.name) return toast('Nom requis', 'error');
  try {
    if (id) { await apiFetch(`/api/equipment/${id}`, true, 'PUT', body); toast('Équipement mis à jour'); }
    else     { await apiFetch('/api/equipment', true, 'POST', body); toast('Équipement créé'); }
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
    document.getElementById('dr-checkin-time').value  = r.check_in_time || '15:00';
    document.getElementById('dr-checkout-time').value = r.check_out_time || '11:00';
    document.getElementById('dr-checkin-inst').value  = r.check_in_instructions || '';
    document.getElementById('dr-checkout-inst').value = r.check_out_instructions || '';
    document.getElementById('dr-wifi-name').value     = r.wifi_name || '';
    document.getElementById('dr-wifi-pass').value     = r.wifi_password || '';
    document.getElementById('dr-trash').value         = r.trash_instructions || '';
    document.getElementById('dr-house-rules').value   = r.house_rules || '';
  } catch {}
}

window.adminSaveRules = async function(e) {
  e.preventDefault();
  try {
    await apiFetch(`/api/rules/${PROPERTY_ID}`, true, 'PUT', {
      check_in_time:          document.getElementById('dr-checkin-time').value,
      check_out_time:         document.getElementById('dr-checkout-time').value,
      check_in_instructions:  document.getElementById('dr-checkin-inst').value,
      check_out_instructions: document.getElementById('dr-checkout-inst').value,
      wifi_name:              document.getElementById('dr-wifi-name').value,
      wifi_password:          document.getElementById('dr-wifi-pass').value,
      trash_instructions:     document.getElementById('dr-trash').value,
      house_rules:            document.getElementById('dr-house-rules').value,
    });
    toast('Règles enregistrées');
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
    } else {
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
  document.getElementById('hm-photo').src = `/uploads/${filename}`;
  document.getElementById('hotspot-modal').classList.add('open');
  document.body.style.overflow = 'hidden';

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
      // Dot sur la photo
      const dot = document.createElement('div');
      dot.className = 'hm-dot';
      dot.textContent = i + 1;
      dot.style.left = `${h.x_percent}%`;
      dot.style.top  = `${h.y_percent}%`;
      dot.title = `Supprimer : ${h.name}`;
      dot.onclick = (e) => { e.stopPropagation(); deleteHotspot(h.id); };
      wrap.appendChild(dot);

      // Liste sous la photo
      const tag = document.createElement('div');
      tag.style.cssText = 'display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.6rem;background:var(--adm-surface-2);border:1px solid var(--adm-border);font-size:0.75rem;color:var(--adm-text-muted);';
      tag.innerHTML = `<span style="width:16px;height:16px;border-radius:50%;background:var(--gold);color:#060608;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;flex-shrink:0;">${i+1}</span>
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

// Échappe HTML (protection XSS)
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
