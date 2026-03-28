import { useEffect, useState } from 'react';
import { getHoldings, getTransactions, getPortfolioSummary, setBalance } from '../../services/portfolioApi';
import { useMarketStore } from '../../stores/marketStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { formatINR, formatNumber, formatPercent, formatDateTime, cn } from '../../utils/formatters';
import type { Holding, Transaction, PortfolioSummary } from '../../types/portfolio';

export function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [tab, setTab] = useState<'holdings' | 'transactions'>('holdings');
  const [showSetBalance, setShowSetBalance] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const prices = useMarketStore((s) => s.prices);
  const { subscribe } = useWebSocket();

  const loadData = () => {
    getHoldings().then(setHoldings);
    getTransactions().then(setTransactions);
    getPortfolioSummary().then(setSummary);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const symbols = holdings.map(h => h.symbol);
    if (symbols.length > 0) subscribe(symbols);
  }, [holdings, subscribe]);

  const handleSetBalance = async () => {
    const amt = parseFloat(newBalance);
    if (!amt || amt <= 0) return;
    await setBalance(amt);
    setShowSetBalance(false);
    setNewBalance('');
    loadData();
  };

  const totalCurrentValue = holdings.reduce((sum, h) => {
    const ltp = prices[h.symbol]?.ltp || h.avg_price;
    return sum + h.quantity * ltp;
  }, 0);

  const totalInvested = holdings.reduce((sum, h) => sum + h.quantity * h.avg_price, 0);
  const totalPnL = totalCurrentValue - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Summary Cards */}
      <div className="px-4 py-3 border-b border-terminal-border bg-terminal-surface">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">Portfolio</h2>
          <button
            onClick={() => setShowSetBalance(!showSetBalance)}
            className="text-[11px] text-terminal-blue hover:text-white px-2 py-1 border border-terminal-border rounded"
          >
            Set Balance
          </button>
        </div>

        {showSetBalance && (
          <div className="flex gap-2 mb-3">
            <input
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetBalance()}
              placeholder="Amount in INR..."
              className="flex-1 bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs text-white outline-none"
              type="number"
            />
            <button onClick={handleSetBalance} className="bg-terminal-blue text-white text-xs px-3 py-1 rounded">
              Set
            </button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] text-gray-500">Cash Balance</div>
            <div className="text-sm font-bold text-white">{formatINR(summary?.cashBalance || 0)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Invested</div>
            <div className="text-sm font-bold text-white">{formatINR(totalInvested)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Current Value</div>
            <div className="text-sm font-bold text-white">{formatINR(totalCurrentValue)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Total P&L</div>
            <div className={cn(
              'text-sm font-bold',
              totalPnL >= 0 ? 'text-terminal-green' : 'text-terminal-red'
            )}>
              {formatINR(totalPnL)} ({formatPercent(totalPnLPercent)})
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-terminal-border">
        {(['holdings', 'transactions'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 px-3 py-2 text-xs font-medium',
              tab === t ? 'text-terminal-blue border-b-2 border-terminal-blue' : 'text-gray-400 hover:text-white'
            )}
          >
            {t === 'holdings' ? 'Holdings' : 'Transactions'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'holdings' ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 text-[10px] sticky top-0 bg-terminal-surface">
                <th className="text-left py-1.5 px-3">SYMBOL</th>
                <th className="text-right py-1.5 px-2">QTY</th>
                <th className="text-right py-1.5 px-2">AVG</th>
                <th className="text-right py-1.5 px-2">LTP</th>
                <th className="text-right py-1.5 px-2">P&L</th>
                <th className="text-right py-1.5 px-2">P&L%</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const ltp = prices[h.symbol]?.ltp || h.avg_price;
                const pnl = (ltp - h.avg_price) * h.quantity;
                const pnlPct = ((ltp - h.avg_price) / h.avg_price) * 100;
                return (
                  <tr key={h.id} className="border-b border-terminal-border/30 hover:bg-white/5">
                    <td className="py-2 px-3 font-medium text-white">{h.symbol}</td>
                    <td className="py-2 px-2 text-right text-white">{h.quantity}</td>
                    <td className="py-2 px-2 text-right text-gray-400">{formatNumber(h.avg_price)}</td>
                    <td className="py-2 px-2 text-right text-white">{formatNumber(ltp)}</td>
                    <td className={cn('py-2 px-2 text-right', pnl >= 0 ? 'text-terminal-green' : 'text-terminal-red')}>
                      {formatINR(pnl)}
                    </td>
                    <td className={cn('py-2 px-2 text-right', pnl >= 0 ? 'text-terminal-green' : 'text-terminal-red')}>
                      {formatPercent(pnlPct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 text-[10px] sticky top-0 bg-terminal-surface">
                <th className="text-left py-1.5 px-3">TIME</th>
                <th className="text-left py-1.5 px-2">SYMBOL</th>
                <th className="text-center py-1.5 px-2">TYPE</th>
                <th className="text-right py-1.5 px-2">QTY</th>
                <th className="text-right py-1.5 px-2">PRICE</th>
                <th className="text-right py-1.5 px-2">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-terminal-border/30">
                  <td className="py-2 px-3 text-gray-400">{formatDateTime(t.timestamp)}</td>
                  <td className="py-2 px-2 font-medium text-white">{t.symbol}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium',
                      t.type === 'BUY' ? 'bg-green-900/30 text-terminal-green' : 'bg-red-900/30 text-terminal-red'
                    )}>
                      {t.type}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-white">{t.quantity}</td>
                  <td className="py-2 px-2 text-right text-white">{formatNumber(t.price)}</td>
                  <td className="py-2 px-2 text-right text-white">{formatINR(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'holdings' && holdings.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">No holdings. Place an order to get started.</div>
        )}
      </div>
    </div>
  );
}
