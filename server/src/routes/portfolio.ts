import { Router } from 'express';
import db from '../models/db.js';

const router = Router();

router.get('/holdings', (_req, res) => {
  res.json(db.getHoldings());
});

router.get('/transactions', (_req, res) => {
  res.json(db.getTransactions());
});

router.get('/balance', (_req, res) => {
  res.json(db.getBalance());
});

router.post('/balance/set', (req, res) => {
  const { amount, currency = 'INR' } = req.body;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Valid positive amount required' });
  }
  db.setBalance(amount, currency);
  res.json(db.getBalance());
});

router.get('/summary', (_req, res) => {
  const balance = db.getBalance();
  const holdings = db.getHoldings();
  const totalInvested = holdings.reduce((sum, h) => sum + h.quantity * h.avg_price, 0);

  res.json({
    cashBalance: balance.balance,
    initialBalance: balance.initial_balance,
    totalInvested,
    holdingsCount: holdings.length,
    currency: balance.currency,
  });
});

export default router;
