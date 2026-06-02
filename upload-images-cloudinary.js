'use strict';
/**
 * upload-images-cloudinary.js
 * Uploade les images locales (uploads/) vers Cloudinary
 * puis met à jour les URLs dans Turso.
 *
 * Variables d'env requises :
 *   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

const fs      = require('fs');
const path    = require('path');
const { createClient } = require('@libsql/client');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const dst = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Cache pour éviter de re-uploader le même fichier si plusieurs entrées DB pointent dessus
const urlCache = {};

async function uploadFile(relPath) {
  if (urlCache[relPath]) return urlCache[relPath];

  const localPath = path.join(UPLOADS_DIR, relPath);
  if (!fs.existsSync(localPath)) {
    console.warn(`   ⚠  Fichier introuvable : ${localPath}`);
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder:          'appartements',
      resource_type:   'image',
      transformation:  [{ quality: 'auto', fetch_format: 'auto' }],
    });
    const url = result.secure_url;
    urlCache[relPath] = url;
    console.log(`   ✓ ${relPath} → ${url.substring(0, 70)}...`);
    return url;
  } catch (e) {
    console.error(`   ✗ ${relPath} : ${e.message}`);
    return null;
  }
}

function toRows(result) {
  return result.rows.map(row => {
    const obj = {};
    result.columns.forEach((col, i) => { obj[col] = row[i] ?? null; });
    return obj;
  });
}

async function run() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.CLOUDINARY_CLOUD_NAME) {
    console.error('❌  Variables d\'env manquantes');
    process.exit(1);
  }

  let updated = 0;

  // ── 1. properties.main_image
  console.log('\n📤  Upload properties.main_image...');
  const props = toRows(await dst.execute('SELECT id, main_image FROM properties'));
  for (const row of props) {
    const { id, main_image: filename } = row;
    if (!filename || /^https?:\/\//.test(filename)) continue;
    const url = await uploadFile(filename);
    if (url) {
      await dst.execute({ sql: 'UPDATE properties SET main_image = ? WHERE id = ?', args: [url, id] });
      updated++;
    }
  }

  // ── 2. property_hero_images.filename
  console.log('\n📤  Upload property_hero_images...');
  const heroes = toRows(await dst.execute('SELECT id, filename FROM property_hero_images'));
  for (const row of heroes) {
    const { id, filename } = row;
    if (!filename || /^https?:\/\//.test(filename)) continue;
    const url = await uploadFile(filename);
    if (url) {
      await dst.execute({ sql: 'UPDATE property_hero_images SET filename = ? WHERE id = ?', args: [url, id] });
      updated++;
    }
  }

  // ── 3. room_images.filename
  console.log('\n📤  Upload room_images...');
  const roomImgs = toRows(await dst.execute('SELECT id, filename FROM room_images'));
  for (const row of roomImgs) {
    const { id, filename } = row;
    if (!filename || /^https?:\/\//.test(filename)) continue;
    const url = await uploadFile(filename);
    if (url) {
      await dst.execute({ sql: 'UPDATE room_images SET filename = ? WHERE id = ?', args: [url, id] });
      updated++;
    }
  }

  // ── 4. property_gallery.filename
  console.log('\n📤  Upload property_gallery...');
  const gallery = toRows(await dst.execute('SELECT id, filename FROM property_gallery'));
  for (const row of gallery) {
    const { id, filename } = row;
    if (!filename || /^https?:\/\//.test(filename)) continue;
    const url = await uploadFile(filename);
    if (url) {
      await dst.execute({ sql: 'UPDATE property_gallery SET filename = ? WHERE id = ?', args: [url, id] });
      updated++;
    }
  }

  console.log(`\n✅  Terminé — ${updated} image(s) uploadée(s) et URL mises à jour dans Turso.`);
  process.exit(0);
}

run().catch(e => {
  console.error('❌  Erreur :', e.message);
  process.exit(1);
});
