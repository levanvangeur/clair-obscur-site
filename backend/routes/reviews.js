const express = require('express');
const { all, run } = require('../database/db');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews/:propertyId — public, tous les avis (le plus récent d'abord)
router.get('/:propertyId', async (req, res) => {
  const items = await all(
    'SELECT * FROM reviews WHERE property_id = ? ORDER BY created_at DESC',
    [req.params.propertyId]
  );
  res.json(items);
});

// POST /api/reviews/:propertyId — public, un visiteur laisse un avis (nom + note + commentaire)
router.post('/:propertyId', async (req, res) => {
  const { author_name, rating, comment } = req.body;
  const name = (author_name || '').trim();
  const ratingNum = Number(rating);

  if (!name) return res.status(400).json({ error: 'Nom, prénom ou pseudo requis' });
  if (name.length > 80) return res.status(400).json({ error: 'Nom trop long (80 caractères max)' });
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Note requise (1 à 5 étoiles)' });
  }
  const text = (comment || '').trim().slice(0, 1000);

  const { lastInsertRowid } = await run(
    'INSERT INTO reviews (property_id, author_name, rating, comment) VALUES (?, ?, ?, ?)',
    [req.params.propertyId, name, ratingNum, text]
  );
  res.status(201).json({ id: lastInsertRowid, author_name: name, rating: ratingNum, comment: text });
});

// PUT /api/reviews/:id — admin, corriger un avis
router.put('/:id', authenticateAdmin, async (req, res) => {
  const { author_name, rating, comment } = req.body;
  const name = (author_name || '').trim();
  const ratingNum = Number(rating);
  if (!name) return res.status(400).json({ error: 'Nom, prénom ou pseudo requis' });
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Note invalide' });
  }
  await run(
    'UPDATE reviews SET author_name = ?, rating = ?, comment = ? WHERE id = ?',
    [name, ratingNum, (comment || '').trim().slice(0, 1000), req.params.id]
  );
  res.json({ message: 'Avis mis à jour' });
});

// DELETE /api/reviews/:id — admin, modération
router.delete('/:id', authenticateAdmin, async (req, res) => {
  await run('DELETE FROM reviews WHERE id = ?', [req.params.id]);
  res.json({ message: 'Avis supprimé' });
});

module.exports = router;
