'use strict';

// ═══════════════════════════════════════════════════════════════
//  TRADUCTIONS — 5 langues
//  Utilisé par t(key) dans main.js
// ═══════════════════════════════════════════════════════════════
const I18N = {

  fr: {
    welcome: 'Bienvenue au',
    book: 'Réserver votre prochain séjour',

    qi_arrival: 'Arrivée', qi_departure: 'Départ', qi_parking: 'Parking', qi_contact: 'Contact',

    s_checkin_eyebrow: 'Check-in',      s_arrival: 'Arrivée',
    s_checkout_eyebrow: 'Check-out',    s_departure: 'Départ',
    s_wifi_eyebrow: 'Connexion internet', s_wifi: 'Wi-Fi',
    s_equip_eyebrow: 'Guide interactif', s_equip: 'Équipements et confort',
    s_equip_hint: 'Cliquez sur un équipement pour les instructions.',
    s_parking_eyebrow: 'Se garer',      s_parking: 'Stationnement',
    s_rules_eyebrow: 'À respecter',     s_rules: 'Règlement intérieur',
    s_contact_eyebrow: 'On est là pour vous', s_contact: 'Contact<br><em>&amp; Assistance</em>',
    s_discover_eyebrow: 'Autour de vous', s_discover: 'À découvrir',
    s_transport_eyebrow: 'Se déplacer', s_transport: 'Bus PLM',
    s_transport_desc: 'Navette urbaine · Lundi – Samedi · 7h–19h · 1 départ / heure',
    s_location_eyebrow: 'Nous trouver', s_location: 'Localisation',

    btn_early: 'Demander une arrivée anticipée',
    btn_late:  'Demander un départ tardif',

    wifi_network: 'Réseau', wifi_pass: 'Mot de passe',
    wifi_linen_eyebrow: 'Literie',   wifi_linen: 'Linge de maison',
    wifi_linen_provided: 'Draps &amp; serviettes fournis',
    wifi_linen_end: 'Fin de séjour', wifi_linen_end_text: 'Merci de déposer le linge dans les panières',

    modal_early_eyebrow: 'Check-in',  modal_late_eyebrow: 'Check-out',
    modal_early_title: 'Arrivée anticipée', modal_late_title: 'Départ tardif',
    modal_early_desc: "L'heure d'arrivée standard est {time}. Choisissez l'heure à laquelle vous souhaitez arriver.",
    modal_late_desc:  "L'heure de départ standard est {time}. Choisissez l'heure à laquelle vous souhaitez partir.",
    modal_name_label: 'Votre nom', modal_name_ph: 'Jean Dupont',
    modal_time_label: 'Heure souhaitée',
    modal_send: 'Envoyer la demande',
    modal_no_slots: 'Aucun créneau disponible',
    modal_no_email: "Aucun email de contact configuré. Veuillez contacter l'hôte directement.",

    mail_early_subject: "Demande d'arrivée anticipée — {prop}",
    mail_late_subject:  'Demande de départ tardif — {prop}',
    mail_early_body: "Bonjour,\n\n{nameLine}Je souhaite arriver plus tôt que l'heure habituelle.\n\nHeure souhaitée : {time}\n\nMerci de me confirmer si cela est possible.\n\nCordialement",
    mail_late_body:  "Bonjour,\n\n{nameLine}Je souhaite partir plus tard que l'heure habituelle.\n\nHeure souhaitée : {time}\n\nMerci de me confirmer si cela est possible.\n\nCordialement",
    mail_name_line: 'Nom : {name}\n',
    invoice_subject: 'Demande de facture',
    invoice_body: 'Bonjour,\n\nJe souhaite recevoir une facture pour mon séjour.\n\nMerci.',

    contact_call: 'Appeler', contact_email: 'Email',
    help_eyebrow: 'Assistance', help_title: 'Comment puis-je vous aider ?',
    help_btn: "Besoin d'aide ?",
    help_call_label: 'Appeler', help_email_label: 'Email',
    help_invoice_label: 'Facture', help_invoice_text: 'Demander ma facture',

    footer_rights: 'Tous droits réservés',

    no_equip: 'Aucun équipement configuré.',
    no_instructions: "Pas d'instructions disponibles.",
    no_wifi: 'Informations Wi-Fi à configurer.',
    no_parking: 'Informations de stationnement à configurer.',
    no_rules: 'Règlement à configurer.',
    no_contact: 'Contact à configurer dans Paramètres.',
    no_discover: 'Suggestions à configurer.',

    plm_title: 'Navette PLM',
    plm_info: 'Circuit urbain · Lun–Sam · 07h–19h · 1 départ / heure · 35 arrêts',
    plm_show: 'Afficher les horaires', plm_hide: 'Masquer les horaires',
    plm_filter: 'Filtrer par heure de départ', plm_all: 'Tout', plm_stop: 'Arrêt',
    plm_no_sunday: 'Ne circule pas les dimanches et jours fériés.',
    plm_official: 'Infos officielles ↗',
  },

  en: {
    welcome: 'Welcome to',
    book: 'Book your next stay',

    qi_arrival: 'Arrival', qi_departure: 'Departure', qi_parking: 'Parking', qi_contact: 'Contact',

    s_checkin_eyebrow: 'Check-in',      s_arrival: 'Arrival',
    s_checkout_eyebrow: 'Check-out',    s_departure: 'Departure',
    s_wifi_eyebrow: 'Internet connection', s_wifi: 'Wi-Fi',
    s_equip_eyebrow: 'Interactive guide', s_equip: 'Amenities & comfort',
    s_equip_hint: 'Click on an item to see instructions.',
    s_parking_eyebrow: 'Parking',       s_parking: 'Parking',
    s_rules_eyebrow: 'House rules',     s_rules: 'House rules',
    s_contact_eyebrow: "We're here for you", s_contact: 'Contact<br><em>&amp; Support</em>',
    s_discover_eyebrow: 'Around you',   s_discover: 'Things to do',
    s_transport_eyebrow: 'Getting around', s_transport: 'PLM Bus',
    s_transport_desc: 'Urban shuttle · Mon – Sat · 7am–7pm · 1 departure / hour',
    s_location_eyebrow: 'Find us',      s_location: 'Location',

    btn_early: 'Request early check-in',
    btn_late:  'Request late check-out',

    wifi_network: 'Network', wifi_pass: 'Password',
    wifi_linen_eyebrow: 'Bedding',      wifi_linen: 'Linen & towels',
    wifi_linen_provided: 'Sheets &amp; towels provided',
    wifi_linen_end: 'End of stay',      wifi_linen_end_text: 'Please place linen in the baskets',

    modal_early_eyebrow: 'Check-in',   modal_late_eyebrow: 'Check-out',
    modal_early_title: 'Early check-in', modal_late_title: 'Late check-out',
    modal_early_desc: 'Standard check-in time is {time}. Choose your preferred arrival time.',
    modal_late_desc:  'Standard check-out time is {time}. Choose your preferred departure time.',
    modal_name_label: 'Your name', modal_name_ph: 'John Smith',
    modal_time_label: 'Preferred time',
    modal_send: 'Send request',
    modal_no_slots: 'No time slots available',
    modal_no_email: 'No contact email configured. Please contact the host directly.',

    mail_early_subject: 'Early check-in request — {prop}',
    mail_late_subject:  'Late check-out request — {prop}',
    mail_early_body: 'Hello,\n\n{nameLine}I would like to arrive earlier than the standard time.\n\nPreferred time: {time}\n\nPlease let me know if this is possible.\n\nBest regards',
    mail_late_body:  'Hello,\n\n{nameLine}I would like to depart later than the standard time.\n\nPreferred time: {time}\n\nPlease let me know if this is possible.\n\nBest regards',
    mail_name_line: 'Name: {name}\n',
    invoice_subject: 'Invoice request',
    invoice_body: 'Hello,\n\nI would like to receive an invoice for my stay.\n\nThank you.',

    contact_call: 'Call', contact_email: 'Email',
    help_eyebrow: 'Support', help_title: 'How can we help you?',
    help_btn: 'Need help?',
    help_call_label: 'Call', help_email_label: 'Email',
    help_invoice_label: 'Invoice', help_invoice_text: 'Request my invoice',

    footer_rights: 'All rights reserved',

    no_equip: 'No amenities configured.',
    no_instructions: 'No instructions available.',
    no_wifi: 'Wi-Fi information not yet configured.',
    no_parking: 'Parking information not yet configured.',
    no_rules: 'House rules not yet configured.',
    no_contact: 'Contact not yet configured.',
    no_discover: 'Suggestions not yet configured.',

    plm_title: 'PLM Shuttle',
    plm_info: 'Urban circuit · Mon–Sat · 7am–7pm · 1 departure / hour · 35 stops',
    plm_show: 'Show schedule', plm_hide: 'Hide schedule',
    plm_filter: 'Filter by departure time', plm_all: 'All', plm_stop: 'Stop',
    plm_no_sunday: 'Does not operate on Sundays and public holidays.',
    plm_official: 'Official info ↗',
  },

  de: {
    welcome: 'Willkommen im',
    book: 'Ihren nächsten Aufenthalt buchen',

    qi_arrival: 'Ankunft', qi_departure: 'Abreise', qi_parking: 'Parkplatz', qi_contact: 'Kontakt',

    s_checkin_eyebrow: 'Check-in',       s_arrival: 'Ankunft',
    s_checkout_eyebrow: 'Check-out',     s_departure: 'Abreise',
    s_wifi_eyebrow: 'Internetverbindung', s_wifi: 'Wi-Fi',
    s_equip_eyebrow: 'Interaktiver Leitfaden', s_equip: 'Ausstattung & Komfort',
    s_equip_hint: 'Klicken Sie auf ein Gerät für Anleitungen.',
    s_parking_eyebrow: 'Parken',         s_parking: 'Parkplatz',
    s_rules_eyebrow: 'Hausordnung',      s_rules: 'Hausordnung',
    s_contact_eyebrow: 'Wir sind für Sie da', s_contact: 'Kontakt<br><em>&amp; Hilfe</em>',
    s_discover_eyebrow: 'In Ihrer Umgebung', s_discover: 'Entdecken',
    s_transport_eyebrow: 'Unterwegs',    s_transport: 'PLM Bus',
    s_transport_desc: 'Stadtbus · Mo – Sa · 7–19 Uhr · 1 Abfahrt / Stunde',
    s_location_eyebrow: 'So finden Sie uns', s_location: 'Lage',

    btn_early: 'Frühen Check-in anfragen',
    btn_late:  'Späten Check-out anfragen',

    wifi_network: 'Netzwerk', wifi_pass: 'Passwort',
    wifi_linen_eyebrow: 'Bettwäsche',    wifi_linen: 'Wäsche & Handtücher',
    wifi_linen_provided: 'Bettwäsche &amp; Handtücher inklusive',
    wifi_linen_end: 'Abreise',           wifi_linen_end_text: 'Bitte Wäsche in die Körbe legen',

    modal_early_eyebrow: 'Check-in',    modal_late_eyebrow: 'Check-out',
    modal_early_title: 'Früher Check-in', modal_late_title: 'Später Check-out',
    modal_early_desc: 'Die reguläre Check-in-Zeit ist {time}. Wählen Sie die gewünschte Ankunftszeit.',
    modal_late_desc:  'Die reguläre Check-out-Zeit ist {time}. Wählen Sie die gewünschte Abreisezeit.',
    modal_name_label: 'Ihr Name', modal_name_ph: 'Max Mustermann',
    modal_time_label: 'Gewünschte Zeit',
    modal_send: 'Anfrage senden',
    modal_no_slots: 'Keine Zeitfenster verfügbar',
    modal_no_email: 'Keine Kontakt-E-Mail konfiguriert. Bitte kontaktieren Sie den Gastgeber direkt.',

    mail_early_subject: 'Anfrage früher Check-in — {prop}',
    mail_late_subject:  'Anfrage später Check-out — {prop}',
    mail_early_body: 'Guten Tag,\n\n{nameLine}Ich möchte früher als zur regulären Zeit ankommen.\n\nGewünschte Zeit: {time}\n\nBitte teilen Sie mir mit, ob dies möglich ist.\n\nMit freundlichen Grüßen',
    mail_late_body:  'Guten Tag,\n\n{nameLine}Ich möchte später als zur regulären Zeit abreisen.\n\nGewünschte Zeit: {time}\n\nBitte teilen Sie mir mit, ob dies möglich ist.\n\nMit freundlichen Grüßen',
    mail_name_line: 'Name: {name}\n',
    invoice_subject: 'Rechnungsanforderung',
    invoice_body: 'Guten Tag,\n\nIch möchte eine Rechnung für meinen Aufenthalt erhalten.\n\nVielen Dank.',

    contact_call: 'Anrufen', contact_email: 'E-Mail',
    help_eyebrow: 'Hilfe', help_title: 'Wie können wir Ihnen helfen?',
    help_btn: 'Hilfe benötigt?',
    help_call_label: 'Anrufen', help_email_label: 'E-Mail',
    help_invoice_label: 'Rechnung', help_invoice_text: 'Rechnung anfordern',

    footer_rights: 'Alle Rechte vorbehalten',

    no_equip: 'Keine Ausstattung konfiguriert.',
    no_instructions: 'Keine Anleitung verfügbar.',
    no_wifi: 'WLAN-Informationen noch nicht konfiguriert.',
    no_parking: 'Parkinformationen noch nicht konfiguriert.',
    no_rules: 'Hausordnung noch nicht konfiguriert.',
    no_contact: 'Kontakt noch nicht konfiguriert.',
    no_discover: 'Vorschläge noch nicht konfiguriert.',

    plm_title: 'PLM Shuttle',
    plm_info: 'Stadtbus · Mo–Sa · 07–19 Uhr · 1 Abfahrt / Stunde · 35 Haltestellen',
    plm_show: 'Fahrplan anzeigen', plm_hide: 'Fahrplan ausblenden',
    plm_filter: 'Nach Abfahrtszeit filtern', plm_all: 'Alle', plm_stop: 'Haltestelle',
    plm_no_sunday: 'Fährt nicht an Sonntagen und Feiertagen.',
    plm_official: 'Offizielle Infos ↗',
  },

  es: {
    welcome: 'Bienvenido al',
    book: 'Reservar su próxima estancia',

    qi_arrival: 'Llegada', qi_departure: 'Salida', qi_parking: 'Aparcamiento', qi_contact: 'Contacto',

    s_checkin_eyebrow: 'Check-in',       s_arrival: 'Llegada',
    s_checkout_eyebrow: 'Check-out',     s_departure: 'Salida',
    s_wifi_eyebrow: 'Conexión a internet', s_wifi: 'Wi-Fi',
    s_equip_eyebrow: 'Guía interactiva', s_equip: 'Equipamiento y comodidades',
    s_equip_hint: 'Haga clic en un equipo para ver las instrucciones.',
    s_parking_eyebrow: 'Aparcar',        s_parking: 'Aparcamiento',
    s_rules_eyebrow: 'Normas de la casa', s_rules: 'Normas de la casa',
    s_contact_eyebrow: 'Estamos aquí para usted', s_contact: 'Contacto<br><em>y asistencia</em>',
    s_discover_eyebrow: 'A su alrededor', s_discover: 'Qué visitar',
    s_transport_eyebrow: 'Moverse',      s_transport: 'Autobús PLM',
    s_transport_desc: 'Autobús urbano · Lun – Sáb · 7h–19h · 1 salida / hora',
    s_location_eyebrow: 'Cómo llegar',  s_location: 'Localización',

    btn_early: 'Solicitar llegada anticipada',
    btn_late:  'Solicitar salida tardía',

    wifi_network: 'Red', wifi_pass: 'Contraseña',
    wifi_linen_eyebrow: 'Ropa de cama',  wifi_linen: 'Ropa de cama y toallas',
    wifi_linen_provided: 'Sábanas &amp; toallas incluidas',
    wifi_linen_end: 'Al salir',          wifi_linen_end_text: 'Por favor, deposite la ropa en las cestas',

    modal_early_eyebrow: 'Check-in',    modal_late_eyebrow: 'Check-out',
    modal_early_title: 'Llegada anticipada', modal_late_title: 'Salida tardía',
    modal_early_desc: 'La hora estándar de llegada es {time}. Elija la hora a la que desea llegar.',
    modal_late_desc:  'La hora estándar de salida es {time}. Elija la hora a la que desea salir.',
    modal_name_label: 'Su nombre', modal_name_ph: 'Juan García',
    modal_time_label: 'Hora deseada',
    modal_send: 'Enviar solicitud',
    modal_no_slots: 'No hay franjas disponibles',
    modal_no_email: 'No hay email de contacto configurado. Por favor contacte directamente con el anfitrión.',

    mail_early_subject: 'Solicitud de llegada anticipada — {prop}',
    mail_late_subject:  'Solicitud de salida tardía — {prop}',
    mail_early_body: 'Hola,\n\n{nameLine}Me gustaría llegar antes de la hora habitual.\n\nHora deseada: {time}\n\nPor favor, confirme si es posible.\n\nAtentamente',
    mail_late_body:  'Hola,\n\n{nameLine}Me gustaría salir más tarde de la hora habitual.\n\nHora deseada: {time}\n\nPor favor, confirme si es posible.\n\nAtentamente',
    mail_name_line: 'Nombre: {name}\n',
    invoice_subject: 'Solicitud de factura',
    invoice_body: 'Hola,\n\nMe gustaría recibir una factura por mi estancia.\n\nGracias.',

    contact_call: 'Llamar', contact_email: 'Email',
    help_eyebrow: 'Asistencia', help_title: '¿Cómo podemos ayudarle?',
    help_btn: '¿Necesita ayuda?',
    help_call_label: 'Llamar', help_email_label: 'Email',
    help_invoice_label: 'Factura', help_invoice_text: 'Solicitar mi factura',

    footer_rights: 'Todos los derechos reservados',

    no_equip: 'Sin equipamiento configurado.',
    no_instructions: 'No hay instrucciones disponibles.',
    no_wifi: 'Información Wi-Fi aún no configurada.',
    no_parking: 'Información de aparcamiento aún no configurada.',
    no_rules: 'Normas aún no configuradas.',
    no_contact: 'Contacto aún no configurado.',
    no_discover: 'Sugerencias aún no configuradas.',

    plm_title: 'Lanzadera PLM',
    plm_info: 'Circuito urbano · Lun–Sáb · 07h–19h · 1 salida / hora · 35 paradas',
    plm_show: 'Ver horarios', plm_hide: 'Ocultar horarios',
    plm_filter: 'Filtrar por hora de salida', plm_all: 'Todos', plm_stop: 'Parada',
    plm_no_sunday: 'No circula los domingos y días festivos.',
    plm_official: 'Info oficial ↗',
  },

  it: {
    welcome: 'Benvenuto al',
    book: 'Prenotate il vostro prossimo soggiorno',

    qi_arrival: 'Arrivo', qi_departure: 'Partenza', qi_parking: 'Parcheggio', qi_contact: 'Contatto',

    s_checkin_eyebrow: 'Check-in',       s_arrival: 'Arrivo',
    s_checkout_eyebrow: 'Check-out',     s_departure: 'Partenza',
    s_wifi_eyebrow: 'Connessione internet', s_wifi: 'Wi-Fi',
    s_equip_eyebrow: 'Guida interattiva', s_equip: 'Attrezzature e comfort',
    s_equip_hint: "Clicca su un'attrezzatura per le istruzioni.",
    s_parking_eyebrow: 'Parcheggiare',   s_parking: 'Parcheggio',
    s_rules_eyebrow: 'Regole della casa', s_rules: 'Regolamento interno',
    s_contact_eyebrow: 'Siamo qui per voi', s_contact: 'Contatto<br><em>e assistenza</em>',
    s_discover_eyebrow: 'Intorno a voi', s_discover: 'Da scoprire',
    s_transport_eyebrow: 'Spostarsi',    s_transport: 'Bus PLM',
    s_transport_desc: 'Navetta urbana · Lun – Sab · 7–19h · 1 partenza / ora',
    s_location_eyebrow: 'Come trovarci', s_location: 'Posizione',

    btn_early: 'Richiedere un check-in anticipato',
    btn_late:  'Richiedere un check-out posticipato',

    wifi_network: 'Rete', wifi_pass: 'Password',
    wifi_linen_eyebrow: 'Biancheria',    wifi_linen: 'Biancheria da letto',
    wifi_linen_provided: 'Lenzuola &amp; asciugamani inclusi',
    wifi_linen_end: 'Fine del soggiorno', wifi_linen_end_text: 'Si prega di depositare la biancheria nei cestini',

    modal_early_eyebrow: 'Check-in',    modal_late_eyebrow: 'Check-out',
    modal_early_title: 'Check-in anticipato', modal_late_title: 'Check-out posticipato',
    modal_early_desc: "L'orario standard di arrivo è {time}. Scegli l'orario in cui desideri arrivare.",
    modal_late_desc:  "L'orario standard di partenza è {time}. Scegli l'orario in cui desideri partire.",
    modal_name_label: 'Il vostro nome', modal_name_ph: 'Mario Rossi',
    modal_time_label: 'Orario desiderato',
    modal_send: 'Invia richiesta',
    modal_no_slots: 'Nessuna fascia oraria disponibile',
    modal_no_email: "Nessuna email di contatto configurata. Contattare direttamente l'host.",

    mail_early_subject: 'Richiesta check-in anticipato — {prop}',
    mail_late_subject:  'Richiesta check-out posticipato — {prop}',
    mail_early_body: "Salve,\n\n{nameLine}Vorrei arrivare prima dell'orario standard.\n\nOrario desiderato: {time}\n\nLa prego di confermare se è possibile.\n\nCordiali saluti",
    mail_late_body:  "Salve,\n\n{nameLine}Vorrei partire più tardi dell'orario standard.\n\nOrario desiderato: {time}\n\nLa prego di confermare se è possibile.\n\nCordiali saluti",
    mail_name_line: 'Nome: {name}\n',
    invoice_subject: 'Richiesta fattura',
    invoice_body: 'Salve,\n\nVorrei ricevere una fattura per il mio soggiorno.\n\nGrazie.',

    contact_call: 'Chiamare', contact_email: 'Email',
    help_eyebrow: 'Assistenza', help_title: 'Come possiamo aiutarvi?',
    help_btn: 'Avete bisogno di aiuto?',
    help_call_label: 'Chiamare', help_email_label: 'Email',
    help_invoice_label: 'Fattura', help_invoice_text: 'Richiedere la mia fattura',

    footer_rights: 'Tutti i diritti riservati',

    no_equip: 'Nessuna attrezzatura configurata.',
    no_instructions: 'Nessuna istruzione disponibile.',
    no_wifi: 'Informazioni Wi-Fi non ancora configurate.',
    no_parking: 'Informazioni parcheggio non ancora configurate.',
    no_rules: 'Regolamento non ancora configurato.',
    no_contact: 'Contatto non ancora configurato.',
    no_discover: 'Suggerimenti non ancora configurati.',

    plm_title: 'Navetta PLM',
    plm_info: 'Circuito urbano · Lun–Sab · 07–19h · 1 partenza / ora · 35 fermate',
    plm_show: 'Mostra orari', plm_hide: 'Nascondi orari',
    plm_filter: 'Filtra per orario di partenza', plm_all: 'Tutti', plm_stop: 'Fermata',
    plm_no_sunday: 'Non circola la domenica e nei giorni festivi.',
    plm_official: 'Info ufficiali ↗',
  },
};

// ── Langue active ──────────────────────────────────────────────
let currentLang = localStorage.getItem('lang') || 'fr';

function t(key) {
  return I18N[currentLang]?.[key] ?? I18N.fr[key] ?? key;
}

// ── Appliquer les traductions aux éléments data-i18n ──────────
function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else {
      el.innerHTML = val;
    }
  });
  // Mettre à jour le sélecteur visuel
  const flags = { fr: '🇫🇷', en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', it: '🇮🇹' };
  const flagEl = document.getElementById('lang-flag');
  const codeEl = document.getElementById('lang-code');
  if (flagEl) flagEl.textContent = flags[currentLang] || '';
  if (codeEl) codeEl.textContent = currentLang.toUpperCase();
  document.querySelectorAll('.lang-opt').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === currentLang)
  );
}

// ── Changer de langue ──────────────────────────────────────────
function changeLang(code) {
  if (!I18N[code]) return;
  currentLang = code;
  localStorage.setItem('lang', code);
  closeLangMenu();
  applyStaticTranslations();
  // Re-rendu des sections dynamiques
  if (typeof propertyData !== 'undefined' && propertyData) {
    renderHero(propertyData);
    renderQuickInfo(propertyData);
    renderArrivee(propertyData.rules);
    renderDepart(propertyData.rules);
    renderWifi(propertyData.rules);
    renderEquipements(propertyData.rooms || []);
    renderStationnement(propertyData.rules);
    renderReglement(propertyData.rules);
    renderContact(propertyData.settings);
    renderDecouvrir(propertyData.rules);
    renderPLM();
    setTimeout(() => lucide.createIcons(), 80);
  }
}

// ── Ouvrir / fermer le menu ────────────────────────────────────
function toggleLangMenu() {
  document.getElementById('lang-menu').classList.toggle('open');
}
function closeLangMenu() {
  const m = document.getElementById('lang-menu');
  if (m) m.classList.remove('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('#lang-picker')) closeLangMenu();
});
