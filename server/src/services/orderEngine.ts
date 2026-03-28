import db from '../models/db.js';
import { getQuote } from './yahooFinanceService.js';

interface OrderRequest {
  symbol: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'SL';
  quantity: number;
  price?: number;
  triggerPrice?: number;
}

interface OrderResult {
  success: boolean;
  orderId?: number;
  error?: string;
  executedPrice?: number;
}

export async function placeOrder(order: OrderRequest): Promise<OrderResult> {
  const { symbol, type, orderType, quantity, price, triggerPrice } = order;

  if (quantity <= 0) return { success: false, error: 'Quantity must be positive' };

  if (orderType === 'MARKET') {
    return executeMarketOrder(symbol, type, quantity);
  }

  const o = db.addOrder({
    symbol: symbol.toUpperCase(),
    exchange: 'NSE',
    type,
    order_type: orderType,
    quantity,
    price: price || null,
    trigger_price: triggerPrice || null,
    status: 'PENDING',
    placed_at: new Date().toISOString(),
    executed_at: null,
    executed_price: null,
  });

  return { success: true, orderId: o.id };
}

async function executeMarketOrder(
  symbol: string, type: 'BUY' | 'SELL', quantity: number
): Promise<OrderResult> {
  const quote = await getQuote(symbol);
  if (!quote) return { success: false, error: 'Could not fetch current price' };

  const executedPrice = quote.regularMarketPrice;
  const total = executedPrice * quantity;
  const balance = db.getBalance();

  if (type === 'BUY') {
    if (balance.balance < total) {
      return { success: false, error: `Insufficient balance. Need ₹${total.toFixed(2)}, have ₹${balance.balance.toFixed(2)}` };
    }

    db.updateBalance(-total);

    const existing = db.getHolding(symbol);
    if (existing) {
      const newQty = existing.quantity + quantity;
      const newAvg = ((existing.quantity * existing.avg_price) + total) / newQty;
      db.updateHolding(existing.id, { quantity: newQty, avg_price: newAvg });
    } else {
      db.addHolding(symbol, quantity, executedPrice);
    }

    db.addTransaction(symbol, 'BUY', quantity, executedPrice);
    db.addOrder({
      symbol: symbol.toUpperCase(), exchange: 'NSE', type: 'BUY', order_type: 'MARKET',
      quantity, price: null, trigger_price: null, status: 'EXECUTED',
      placed_at: new Date().toISOString(), executed_at: new Date().toISOString(), executed_price: executedPrice,
    });

    return { success: true, executedPrice };
  } else {
    const holding = db.getHolding(symbol);
    if (!holding || holding.quantity < quantity) {
      return { success: false, error: `Insufficient holdings. Have ${holding?.quantity || 0} shares` };
    }

    db.updateBalance(total);

    const newQty = holding.quantity - quantity;
    if (newQty === 0) {
      db.deleteHolding(holding.id);
    } else {
      db.updateHolding(holding.id, { quantity: newQty });
    }

    db.addTransaction(symbol, 'SELL', quantity, executedPrice);
    db.addOrder({
      symbol: symbol.toUpperCase(), exchange: 'NSE', type: 'SELL', order_type: 'MARKET',
      quantity, price: null, trigger_price: null, status: 'EXECUTED',
      placed_at: new Date().toISOString(), executed_at: new Date().toISOString(), executed_price: executedPrice,
    });

    return { success: true, executedPrice };
  }
}

export async function checkPendingOrders(): Promise<void> {
  const pending = db.getPendingOrders();

  for (const order of pending) {
    const quote = await getQuote(order.symbol);
    if (!quote) continue;

    const ltp = quote.regularMarketPrice;
    let shouldExecute = false;

    if (order.order_type === 'LIMIT') {
      if (order.type === 'BUY' && order.price && ltp <= order.price) shouldExecute = true;
      if (order.type === 'SELL' && order.price && ltp >= order.price) shouldExecute = true;
    } else if (order.order_type === 'SL') {
      if (order.type === 'BUY' && order.trigger_price && ltp >= order.trigger_price) shouldExecute = true;
      if (order.type === 'SELL' && order.trigger_price && ltp <= order.trigger_price) shouldExecute = true;
    }

    if (shouldExecute) {
      const result = await executeMarketOrder(order.symbol, order.type as 'BUY' | 'SELL', order.quantity);
      if (result.success) {
        db.updateOrder(order.id, {
          status: 'EXECUTED',
          executed_at: new Date().toISOString(),
          executed_price: result.executedPrice ?? null,
        });
      }
    }
  }
}
