const express = require('express');
const { getDb, run } = require('../database/db');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/equipment/:roomId
router.get('/:roomId', (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM equipment WHERE room_id = ?').all(req.params.roomId);
  res.json(items);
});

// POST /api/equipment
router.post('/', authenticateAdmin, (req, res) => {
  const { room_id, name, icon, instructions, tips } = req.body;
  if (!room_id || !name) return res.status(400).json({ error: 'room_id et name requis' });

  const db = getDb();
  const result = run(db,
    'INSERT INTO equipment (room_id, name, icon, instructions, tips) VALUES (?, ?, ?, ?, ?)',
    room_id, name, icon || 'tool', instructions || '', tips || '');

  res.status(201).json({ id: result.lastInsertRowid, room_id, name, icon, instructions, tips });
});

// PUT /api/equipment/:id
router.put('/:id', authenticateAdmin, (req, res) => {
  const { name, icon, instructions, tips } = req.body;
  const db = getDb();
  run(db, 'UPDATE equipment SET name = ?, icon = ?, instructions = ?, tips = ? WHERE id = ?',
    name, icon || 'tool', instructions, tips, req.params.id);
  res.json({ message: 'Équipement mis à jour' });
});

// DELETE /api/equipment/:id
router.delete('/:id', authenticateAdmin, (req, res) => {
  const db = getDb();
  run(db, 'DELETE FROM equipment WHERE id = ?', req.params.id);
  res.json({ message: 'Équipement supprimé' });
});

module.exports = router;
