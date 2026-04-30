const express = require('express');
const { getDb, run } = require('../database/db');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/hotspots/image/:imageId
router.get('/image/:imageId', (req, res) => {
  const db = getDb();
  const hotspots = db.prepare(`
    SELECT h.id, h.x_percent, h.y_percent, h.label, h.description,
           e.id   as equipment_id,
           e.name as equip_name,
           e.icon, e.instructions, e.tips
    FROM photo_hotspots h
    LEFT JOIN equipment e ON e.id = h.equipment_id
    WHERE h.room_image_id = ?
  `).all(req.params.imageId);

  // Normalise : un hotspot a toujours name + display fields
  const result = hotspots.map(h => ({
    id:           h.id,
    x_percent:    h.x_percent,
    y_percent:    h.y_percent,
    equipment_id: h.equipment_id,
    // Champs d'affichage — priorité à l'équipement, sinon note libre
    name:         h.equip_name  || h.label       || '—',
    icon:         h.icon        || 'map-pin',
    instructions: h.instructions|| h.description || '',
    tips:         h.tips        || '',
  }));

  res.json(result);
});

// POST /api/hotspots
router.post('/', authenticateAdmin, (req, res) => {
  const { room_image_id, equipment_id, label, description, x_percent, y_percent } = req.body;

  if (!room_image_id || x_percent == null || y_percent == null) {
    return res.status(400).json({ error: 'room_image_id, x_percent, y_percent requis' });
  }
  if (!equipment_id && !label) {
    return res.status(400).json({ error: 'Indiquez un équipement ou un label' });
  }

  const db = getDb();
  const result = run(db,
    'INSERT INTO photo_hotspots (room_image_id, equipment_id, label, description, x_percent, y_percent) VALUES (?, ?, ?, ?, ?, ?)',
    room_image_id,
    equipment_id || null,
    label        || null,
    description  || null,
    x_percent,
    y_percent
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

// DELETE /api/hotspots/:id
router.delete('/:id', authenticateAdmin, (req, res) => {
  const db = getDb();
  run(db, 'DELETE FROM photo_hotspots WHERE id = ?', req.params.id);
  res.json({ message: 'Hotspot supprimé' });
});

module.exports = router;
