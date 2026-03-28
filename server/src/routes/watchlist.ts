import { Router } from 'express';
import db from '../models/db.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.getWatchlists());
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  res.json(db.createWatchlist(name));
});

router.delete('/:id', (req, res) => {
  db.deleteWatchlist(parseInt(req.params.id));
  res.json({ success: true });
});

router.put('/:id', (req, res) => {
  const { name } = req.body;
  db.updateWatchlist(parseInt(req.params.id), name);
  res.json({ success: true });
});

router.get('/:id/items', (req, res) => {
  res.json(db.getWatchlistItems(parseInt(req.params.id)));
});

router.post('/:id/items', (req, res) => {
  const { symbol, exchange = 'NSE' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });
  res.json(db.addWatchlistItem(parseInt(req.params.id), symbol, exchange));
});

router.delete('/:id/items/:itemId', (req, res) => {
  db.removeWatchlistItem(parseInt(req.params.id), parseInt(req.params.itemId));
  res.json({ success: true });
});

router.put('/:id/reorder', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Items array required' });
  db.reorderWatchlistItems(items);
  res.json({ success: true });
});

export default router;
