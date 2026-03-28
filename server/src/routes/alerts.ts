import { Router } from 'express';
import db from '../models/db.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.getAlerts());
});

router.post('/', (req, res) => {
  const { symbol, condition, targetPrice } = req.body;
  if (!symbol || !condition || !targetPrice) {
    return res.status(400).json({ error: 'symbol, condition, targetPrice required' });
  }
  const alert = db.addAlert(symbol, condition, targetPrice);
  res.json(alert);
});

router.delete('/:id', (req, res) => {
  db.deleteAlert(parseInt(req.params.id));
  res.json({ success: true });
});

export default router;
