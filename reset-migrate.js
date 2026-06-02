'use strict';
/**
 * reset-migrate.js — Vide la base Turso et réinsère toutes les données depuis SQLite local
 * Usage : node reset-migrate.js database.sqlite
 *
 * Variables d'env requises :
 *   TURSO_DATABASE_URL
 *   TURSO_AUTH_TOKEN
 */

const path = require('path');
const { createClient } = require('@libsql/client');

const srcPath = process.argv[2] || 'database.sqlite';

// Connexion à la base SQLite locale (lecture)
const src = createClient({
  url: 'file:' + path.resolve(srcPath),
});

// Connexion à Turso (écriture)
const dst = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Ordre FK-safe pour DELETE (enfants avant parents)
const DELETE_ORDER = [
  'photo_hotspots',
  'room_images',
  'equipment',
  'rooms',
  'property_hero_images',
  'property_gallery',
  'bookings',
  'checkin_items',
  'faq',
  'rules',
  'settings',
  'users',
  'properties',
];

// Ordre FK-safe pour INSERT (parents avant enfants)
const INSERT_ORDER = [
  'users',
  'properties',
  'rules',
  'settings',
  'rooms',
  'room_images',
  'equipment',
  'photo_hotspots',
  'property_hero_images',
  'property_gallery',
  'bookings',
  'checkin_items',
  'faq',
];

function toPlain(result) {
  return result.rows.map(row => {
    const obj = {};
    result.columns.forEach((col, i) => { obj[col] = row[i] ?? null; });
    return obj;
  });
}

async function run() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error('❌  TURSO_DATABASE_URL manquant');
    process.exit(1);
  }

  // ── 1. Supprimer les données Turso dans l'ordre FK-safe
  console.log('\n🗑  Suppression des données Turso existantes...');
  for (const table of DELETE_ORDER) {
    try {
      const r = await dst.execute(`DELETE FROM ${table}`);
      console.log(`   ${table}: ${r.rowsAffected} ligne(s) supprimée(s)`);
    } catch (e) {
      console.log(`   ${table}: ignoré (${e.message.substring(0, 60)})`);
    }
  }

  // ── 2. Réinsérer depuis SQLite local
  console.log('\n📥  Réinsertion depuis SQLite local...');
  for (const table of INSERT_ORDER) {
    let result;
    try {
      result = await src.execute(`SELECT * FROM ${table}`);
    } catch (e) {
      console.log(`   ${table}: table absente côté source, ignoré`);
      continue;
    }

    const rows = toPlain(result);
    if (!rows.length) {
      console.log(`   ${table}: vide, ignoré`);
      continue;
    }

    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

    let ok = 0;
    for (const row of rows) {
      try {
        await dst.execute({ sql, args: cols.map(c => row[c] ?? null) });
        ok++;
      } catch (e) {
        console.warn(`   ⚠  ${table} id=${row.id}: ${e.message.substring(0, 80)}`);
      }
    }
    console.log(`   ${table}: ${ok}/${rows.length} ligne(s) insérée(s)`);
  }

  console.log('\n✅  Migration terminée !');
  process.exit(0);
}

run().catch(e => {
  console.error('❌  Erreur :', e.message);
  process.exit(1);
});
