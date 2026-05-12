const express = require('express');
const { getDb, run } = require('../database/db');
const { authenticateAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ── PUBLIC ────────────────────────────────────────────────

// GET /api/properties
router.get('/', (req, res) => {
  const db = getDb();
  const props = db.prepare('SELECT * FROM properties WHERE active = 1 ORDER BY id').all();
  res.json(props);
});

// GET /api/properties/:id  — données complètes pour la page voyageur
router.get('/:id', (req, res) => {
  const db = getDb();
  const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Logement introuvable' });

  const rooms = db.prepare('SELECT * FROM rooms WHERE property_id = ? ORDER BY order_index').all(prop.id);
  rooms.forEach(room => {
    room.images = db.prepare('SELECT * FROM room_images WHERE room_id = ? ORDER BY order_index').all(room.id);
    // Hotspots inclus dans chaque image (tous types : équipement, note, navigation)
    room.images.forEach(img => {
      const rows = db.prepare(`
        SELECT h.id, h.x_percent, h.y_percent, h.label, h.description,
               h.target_image_id, h.icon_override,
               e.id AS equipment_id, e.name, e.icon, e.instructions, e.tips
        FROM photo_hotspots h
        LEFT JOIN equipment e ON e.id = h.equipment_id
        WHERE h.room_image_id = ?
      `).all(img.id);
      img.hotspots = rows.map(h => ({
        id:              h.id,
        x_percent:       h.x_percent,
        y_percent:       h.y_percent,
        hotspot_type:    h.target_image_id ? 'navigation'
                       : h.equipment_id    ? 'equipment'
                       :                     'note',
        target_image_id: h.target_image_id || null,
        equipment_id:    h.equipment_id    || null,
        name:            h.name || h.label || '—',
        icon:            h.icon_override || h.icon || (h.target_image_id ? 'arrow-right' : 'info'),
        instructions:    h.instructions || h.description || '',
        tips:            h.tips || '',
      }));
    });
    room.equipment = db.prepare('SELECT * FROM equipment WHERE room_id = ?').all(room.id);
  });

  const rules    = db.prepare('SELECT * FROM rules WHERE property_id = ?').get(prop.id);
  const bookings = db.prepare('SELECT * FROM bookings WHERE property_id = ? AND is_active = 1 ORDER BY id ASC').all(prop.id);
  const faq      = db.prepare('SELECT * FROM faq WHERE property_id = ? ORDER BY order_index ASC, id ASC').all(prop.id);
  const settings = db.prepare('SELECT key, value FROM settings').all();
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

  res.json({ ...prop, rooms, rules, bookings, faq, settings: settingsMap });
});

// ── ADMIN ─────────────────────────────────────────────────

// GET /api/properties/admin/all
router.get('/admin/all', authenticateAdmin, (req, res) => {
  const db = getDb();
  const props = db.prepare('SELECT * FROM properties ORDER BY id').all();
  res.json(props);
});

// POST /api/properties
router.post('/', authenticateAdmin, (req, res) => {
  const { name, tagline, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });

  const db = getDb();
  const result = run(db, 'INSERT INTO properties (name, tagline, description) VALUES (?, ?, ?)',
    name, tagline || '', description || '');

  // Crée règles et réservation par défaut
  run(db, 'INSERT OR IGNORE INTO rules (property_id) VALUES (?)', result.lastInsertRowid);
  run(db, 'INSERT OR IGNORE INTO bookings (property_id) VALUES (?)', result.lastInsertRowid);

  res.status(201).json({ id: result.lastInsertRowid, name, tagline, description });
});

// PUT /api/properties/:id
router.put('/:id', authenticateAdmin, (req, res) => {
  const { name, tagline, description, active } = req.body;
  const db = getDb();
  run(db, 'UPDATE properties SET name = ?, tagline = ?, description = ?, active = ? WHERE id = ?',
    name, tagline, description, active ?? 1, req.params.id);
  res.json({ message: 'Logement mis à jour' });
});

// POST /api/properties/:id/image
router.post('/:id/image', authenticateAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

  // Déplace le fichier dans uploads/properties/
  const destDir = path.join(__dirname, '../../uploads/properties');
  fs.mkdirSync(destDir, { recursive: true });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = `main-${Date.now()}${ext}`;
  const destPath = path.join(destDir, filename);
  fs.renameSync(req.file.path, destPath);

  const db = getDb();
  run(db, 'UPDATE properties SET main_image = ? WHERE id = ?',
    `properties/${filename}`, req.params.id);

  res.json({ filename: `properties/${filename}` });
});

// DELETE /api/properties/:id
router.delete('/:id', authenticateAdmin, (req, res) => {
  const db = getDb();
  run(db, 'DELETE FROM properties WHERE id = ?', req.params.id);
  res.json({ message: 'Logement supprimé' });
});

module.exports = router;
