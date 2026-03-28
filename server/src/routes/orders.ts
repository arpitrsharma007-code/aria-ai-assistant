import { Router } from 'express';
import db from '../models/db.js';
import { placeOrder } from '../services/orderEngine.js';

const router = Router();

router.post('/', async (req, res) => {
  const { symbol, type, orderType, quantity, price, triggerPrice } = req.body;

  if (!symbol || !type || !orderType || !quantity) {
    return res.status(400).json({ error: 'symbol, type, orderType, quantity required' });
  }

  const result = await placeOrder({ symbol, type, orderType, quantity, price, triggerPrice });
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result);
});

router.get('/', (req, res) => {
  const status = req.query.status as string;
  res.json(db.getOrders(status?.toUpperCase()));
});

router.delete('/:id', (req, res) => {
  const order = db.getOrder(parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'PENDING') return res.status(400).json({ error: 'Can only cancel pending orders' });

  db.updateOrder(order.id, { status: 'CANCELLED' });
  res.json({ success: true });
});

export default router;
