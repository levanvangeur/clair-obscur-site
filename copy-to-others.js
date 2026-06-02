'use strict';
/**
 * copy-to-others.js
 * Copie les règles/instructions et contact/réservation de Clair-Obscur
 * vers les 3 autres appartements.
 *
 * Usage : node copy-to-others.js
 */

const { createClient } = require('@libsql/client');

// ── Sources & Destinations ────────────────────────────────────────
const SOURCE = {
  url:       'libsql://clair-obscur-levanvangeur.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzk5NjQ1MTMsImlkIjoiMDE5ZTZlMjYtN2QwMS03MTk0LThmMDEtNWNiNzIwMDg2MDY4IiwicmlkIjoiZGFmYTgzZDYtN2RmZC00NTU1LWFiZjctNWMwYTI0Yzk0Y2RlIn0.QGN1aESuAOhiD-gb0IHNs61Ly0wOjiGvnZqRCbLIpFiYqfUvpPzG1dt0M8lBmRdOw0h6MCFmnaXrG24N7r6cDA',
};

const DESTINATIONS = [
  { name: 'cosy-zen',        url: 'libsql://cosy-zen-levanvangeur.aws-eu-west-1.turso.io',        authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzk5NjQ2NDEsImlkIjoiMDE5ZTZlMjgtNzIwMS03NTM1LTk0MGMtOGNmYzc4YzM3ODE1IiwicmlkIjoiZDJiYjE0ZjgtZTU2NC00MWJmLTliYmMtNDc0MjljMDI3ZmI5In0.H27jCf75FJI4C1nL3W6_dMSOn-s1S8j-C63qQnCGGjO6MHWxtvqoxSFaRSZhjIj3zvrA7OtQQQL3f9fV9pGMAA' },
  { name: 'refuge-eclatant', url: 'libsql://refuge-eclatant-levanvangeur.aws-eu-west-1.turso.io', authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzk5NjQ3ODMsImlkIjoiMDE5ZTZlMmEtM2MwMS03M2NkLTlkY2ItMzdiZDY2OTZkOWViIiwicmlkIjoiZWRiZGI4MTItYTU2OS00NThhLThhMzAtYTQ5NWE3NmZlMzBmIn0.SqPJEwNOW2q3rqKTT19aSV3dfrl0JHb7ZUPzLYEt8785icTD0LnQnBE5Mb6jHR5C0gXUV3l6l-DmU-T4omlMCw' },
  { name: 'roche-velours',   url: 'libsql://roche-velours-levanvangeur.aws-eu-west-1.turso.io',   authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzk5NjQ4NzMsImlkIjoiMDE5ZTZlMmMtMjYwMS03NTliLWFmMjktOGJmNDliNTJiNzZkIiwicmlkIjoiZjY3ZjhkZjYtMjE0MS00ZGQ1LWJjNmQtM2JlZWRlZTZjM2NlIn0.x9rs1mfhXJsDsuCoaGb6fkejDoY6O9GGd7dToL7oN7FIMfwp0Y9k3sbK5VF3IIoadhGQEcuhO0LzhoqW8HVxDQ' },
];

function toRow(result) {
  const obj = {};
  result.columns.forEach((c, i) => { obj[c] = result.rows[0][i] ?? null; });
  return obj;
}

function toRows(result) {
  return result.rows.map(row => {
    const obj = {};
    result.columns.forEach((c, i) => { obj[c] = row[i] ?? null; });
    return obj;
  });
}

async function run() {
  const src = createClient(SOURCE);

  // ── 1. Lire les données source ───────────────────────────────
  const rulesRes  = await src.execute('SELECT * FROM rules WHERE property_id = 1');
  const srcRules  = toRow(rulesRes);

  const settingsRes = await src.execute('SELECT key, value FROM settings');
  const srcSettings = toRows(settingsRes);

  const bookingsRes = await src.execute('SELECT * FROM bookings WHERE property_id = 1 AND is_active = 1');
  const srcBookings = toRows(bookingsRes);

  console.log('\n--- Source (Clair-Obscur) ---');
  console.log('Rules: check_in_time=' + srcRules.check_in_time + ', wifi_name=' + srcRules.wifi_name);
  console.log('Settings:', srcSettings.map(s => s.key + '=' + s.value).join(', '));
  console.log('Bookings:', srcBookings.length, 'entrée(s)');

  // ── 2. Copier vers chaque destination ────────────────────────
  for (const dest of DESTINATIONS) {
    const db = createClient({ url: dest.url, authToken: dest.authToken });
    console.log(`\n📋  Copie vers ${dest.name}...`);

    // 2a. Règles — tout SAUF wifi_name et wifi_password (gardés spécifiques)
    await db.execute({
      sql: `UPDATE rules SET
        check_in_time          = ?,
        check_out_time         = ?,
        check_in_instructions  = ?,
        check_out_instructions = ?,
        trash_instructions     = ?,
        house_rules            = ?,
        parking_instructions   = ?,
        places_to_discover     = ?,
        key_box_code           = ?
      WHERE property_id = 1`,
      args: [
        srcRules.check_in_time,
        srcRules.check_out_time,
        srcRules.check_in_instructions,
        srcRules.check_out_instructions,
        srcRules.trash_instructions,
        srcRules.house_rules,
        srcRules.parking_instructions,
        srcRules.places_to_discover,
        srcRules.key_box_code,
      ],
    });
    console.log('   ✓ Règles copiées (Wi-Fi conservé)');

    // 2b. Settings — help_phone et help_email
    for (const s of srcSettings) {
      if (!['help_phone', 'help_email'].includes(s.key)) continue;
      await db.execute({
        sql:  'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: [s.key, s.value],
      });
    }
    console.log('   ✓ Contact copié (téléphone + email)');

    // 2c. Réservations — mettre à jour la première entrée existante
    const destBookings = toRows(await db.execute('SELECT id FROM bookings WHERE property_id = 1 LIMIT 1'));
    if (srcBookings.length > 0 && destBookings.length > 0) {
      const src1 = srcBookings[0];
      await db.execute({
        sql:  'UPDATE bookings SET label = ?, price_per_night = ?, currency = ?, booking_url = ?, is_active = ? WHERE id = ?',
        args: [src1.label, src1.price_per_night, src1.currency, src1.booking_url, src1.is_active, destBookings[0].id],
      });
      console.log('   ✓ Réservation copiée');
    }
  }

  console.log('\n✅  Copie terminée pour les 3 appartements.');
  process.exit(0);
}

run().catch(e => { console.error('❌  Erreur :', e.message); process.exit(1); });
