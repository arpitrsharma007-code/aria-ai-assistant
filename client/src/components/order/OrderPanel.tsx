import { useState } from 'react';
import { placeOrder, getOrders, cancelOrder } from '../../services/portfolioApi';
import { useMarketStore } from '../../stores/marketStore';
import { formatNumber, formatINR, formatDateTime, cn } from '../../utils/formatters';
import type { Order, OrderRequest } from '../../types/order';
import { useEffect } from 'react';

export function OrderPanel() {
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const price = useMarketStore((s) => s.prices[selectedSymbol]);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'SL'>('MARKET');
  const [quantity, setQuantity] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [tab, setTab] = useState<'place' | 'book'>('place');

  const loadOrders = () => getOrders().then(setOrders).catch(console.error);
  useEffect(() => { loadOrders(); }, []);

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { setMessage({ text: 'Invalid quantity', type: 'error' }); return; }

    const order: OrderRequest = {
      symbol: selectedSymbol,
      type: side,
      orderType,
      quantity: qty,
      price: orderType === 'LIMIT' ? parseFloat(limitPrice) : undefined,
      triggerPrice: orderType === 'SL' ? parseFloat(triggerPrice) : undefined,
    };

    try {
      const result = await placeOrder(order);
      if (result.success) {
        setMessage({
          text: result.executedPrice
            ? `${side} ${qty} ${selectedSymbol} @ ${formatNumber(result.executedPrice)}`
            : `Order placed (ID: ${result.orderId})`,
          type: 'success'
        });
        loadOrders();
      } else {
        setMessage({ text: result.error || 'Order failed', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Order failed', type: 'error' });
    }

    setTimeout(() => setMessage(null), 5000);
  };

  const handleCancel = async (id: number) => {
    await cancelOrder(id);
    loadOrders();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-terminal-border">
        {(['place', 'book'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 px-3 py-2 text-xs font-medium',
              tab === t ? 'text-terminal-blue border-b-2 border-terminal-blue' : 'text-gray-400 hover:text-white'
            )}
          >
            {t === 'place' ? 'Place Order' : 'Order Book'}
          </button>
        ))}
      </div>

      {tab === 'place' ? (
        <div className="p-4 space-y-3">
          <div className="text-center">
            <span className="text-lg font-bold text-white">{selectedSymbol}</span>
            {price && (
              <span className="ml-2 text-sm text-gray-400">{formatNumber(price.ltp)}</span>
            )}
          </div>

          {/* Buy/Sell Toggle */}
          <div className="grid grid-cols-2 gap-1 bg-terminal-bg rounded p-0.5">
            <button
              onClick={() => setSide('BUY')}
              className={cn(
                'py-2 text-xs font-bold rounded transition-colors',
                side === 'BUY' ? 'bg-terminal-green text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              BUY
            </button>
            <button
              onClick={() => setSide('SELL')}
              className={cn(
                'py-2 text-xs font-bold rounded transition-colors',
                side === 'SELL' ? 'bg-terminal-red text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              SELL
            </button>
          </div>

          {/* Order Type */}
          <div className="flex gap-1">
            {(['MARKET', 'LIMIT', 'SL'] as const).map((ot) => (
              <button
                key={ot}
                onClick={() => setOrderType(ot)}
                className={cn(
                  'flex-1 py-1.5 text-[11px] rounded border',
                  orderType === ot
                    ? 'border-terminal-blue text-terminal-blue bg-terminal-blue/10'
                    : 'border-terminal-border text-gray-400 hover:text-white'
                )}
              >
                {ot}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white outline-none focus:border-terminal-blue"
              min="1"
            />
          </div>

          {/* Limit Price */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Limit Price</label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white outline-none focus:border-terminal-blue"
                step="0.05"
              />
            </div>
          )}

          {/* Trigger Price */}
          {orderType === 'SL' && (
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Trigger Price</label>
              <input
                type="number"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white outline-none focus:border-terminal-blue"
                step="0.05"
              />
            </div>
          )}

          {/* Estimated */}
          {price && quantity && (
            <div className="text-center text-[11px] text-gray-400">
              Est. Total: <span className="text-white font-medium">{formatINR(price.ltp * parseInt(quantity || '0'))}</span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className={cn(
              'w-full py-2.5 text-sm font-bold rounded transition-colors',
              side === 'BUY'
                ? 'bg-terminal-green hover:bg-green-600 text-white'
                : 'bg-terminal-red hover:bg-red-600 text-white'
            )}
          >
            {side} {selectedSymbol}
          </button>

          {/* Message */}
          {message && (
            <div className={cn(
              'text-xs text-center py-2 rounded',
              message.type === 'success' ? 'bg-green-900/20 text-terminal-green' : 'bg-red-900/20 text-terminal-red'
            )}>
              {message.text}
            </div>
          )}
        </div>
      ) : (
        /* Order Book */
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 text-[10px] sticky top-0 bg-terminal-surface">
                <th className="text-left py-1.5 px-2">SYMBOL</th>
                <th className="text-center py-1.5 px-2">SIDE</th>
                <th className="text-right py-1.5 px-2">QTY</th>
                <th className="text-right py-1.5 px-2">PRICE</th>
                <th className="text-center py-1.5 px-2">STATUS</th>
                <th className="py-1.5 px-1"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-terminal-border/30">
                  <td className="py-2 px-2 text-white">{o.symbol}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={o.type === 'BUY' ? 'text-terminal-green' : 'text-terminal-red'}>
                      {o.type}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-white">{o.quantity}</td>
                  <td className="py-2 px-2 text-right text-white">
                    {o.executed_price ? formatNumber(o.executed_price) : o.price ? formatNumber(o.price) : 'MKT'}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded',
                      o.status === 'EXECUTED' ? 'bg-green-900/30 text-terminal-green' :
                      o.status === 'CANCELLED' ? 'bg-red-900/30 text-terminal-red' :
                      'bg-yellow-900/30 text-terminal-yellow'
                    )}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-2 px-1">
                    {o.status === 'PENDING' && (
                      <button onClick={() => handleCancel(o.id)} className="text-gray-500 hover:text-terminal-red text-[10px]">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-xs">No orders yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
