import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { getWatchlists, getWatchlistItems, addWatchlistItem, removeWatchlistItem } from '../../services/portfolioApi';
import { useMarketStore } from '../../stores/marketStore';
import { useUIStore } from '../../stores/uiStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { formatNumber, formatPercent, cn } from '../../utils/formatters';
import type { Watchlist as WatchlistType, WatchlistItem } from '../../types/watchlist';

export function WatchlistPanel() {
  const [watchlists, setWatchlists] = useState<WatchlistType[]>([]);
  const [activeWl, setActiveWl] = useState<number>(0);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [addSymbol, setAddSymbol] = useState('');
  const prices = useMarketStore((s) => s.prices);
  const setSelectedSymbol = useMarketStore((s) => s.setSelectedSymbol);
  const setCurrentPage = useUIStore((s) => s.setCurrentPage);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    getWatchlists().then((wls) => {
      setWatchlists(wls);
      if (wls.length > 0) setActiveWl(wls[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activeWl) return;
    getWatchlistItems(activeWl).then((items) => {
      setItems(items);
      const symbols = items.map(i => i.symbol);
      if (symbols.length > 0) subscribe(symbols);
    });
  }, [activeWl, subscribe]);

  const handleAdd = async () => {
    if (!addSymbol.trim() || !activeWl) return;
    await addWatchlistItem(activeWl, addSymbol.trim().toUpperCase());
    setAddSymbol('');
    const updated = await getWatchlistItems(activeWl);
    setItems(updated);
    subscribe([addSymbol.trim().toUpperCase()]);
  };

  const handleRemove = async (itemId: number) => {
    if (!activeWl) return;
    await removeWatchlistItem(activeWl, itemId);
    setItems(items.filter(i => i.id !== itemId));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-terminal-border bg-terminal-surface">
        <h2 className="text-sm font-bold text-white mb-2">Watchlist</h2>
        <div className="flex gap-1">
          {watchlists.map((wl) => (
            <button
              key={wl.id}
              onClick={() => setActiveWl(wl.id)}
              className={cn(
                'px-2 py-1 text-[11px] rounded',
                activeWl === wl.id ? 'bg-terminal-blue text-white' : 'text-gray-400 hover:bg-white/5'
              )}
            >
              {wl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Add Symbol */}
      <div className="px-3 py-2 border-b border-terminal-border flex gap-2">
        <input
          value={addSymbol}
          onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add symbol..."
          className="flex-1 bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs text-white outline-none focus:border-terminal-blue"
        />
        <button onClick={handleAdd} className="text-terminal-blue hover:text-white">
          <Plus size={16} />
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 text-[10px] sticky top-0 bg-terminal-surface">
              <th className="text-left py-1.5 px-3">SYMBOL</th>
              <th className="text-right py-1.5 px-2">LTP</th>
              <th className="text-right py-1.5 px-2">CHG%</th>
              <th className="py-1.5 px-1"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const p = prices[item.symbol];
              return (
                <tr
                  key={item.id}
                  className="hover:bg-white/5 cursor-pointer border-b border-terminal-border/30"
                  onClick={() => { setSelectedSymbol(item.symbol); setCurrentPage('chart'); }}
                >
                  <td className="py-2 px-3 font-medium text-white">{item.symbol}</td>
                  <td className="py-2 px-2 text-right text-white">
                    {p ? formatNumber(p.ltp) : '-'}
                  </td>
                  <td className={cn(
                    'py-2 px-2 text-right font-medium',
                    p && p.change >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                  )}>
                    {p ? formatPercent(p.changePercent) : '-'}
                  </td>
                  <td className="py-2 px-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                      className="text-gray-500 hover:text-terminal-red"
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">
            No stocks in watchlist. Add symbols above.
          </div>
        )}
      </div>
    </div>
  );
}
