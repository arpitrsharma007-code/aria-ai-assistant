import { useEffect, useState } from 'react';
import { Activity, Search, Wifi, WifiOff } from 'lucide-react';
import { useMarketStore } from '../../stores/marketStore';
import { useUIStore } from '../../stores/uiStore';
import { getIndices } from '../../services/marketApi';
import { formatNumber, formatPercent, cn } from '../../utils/formatters';
import { StockSearch } from '../common/StockSearch';

export function TopBar() {
  const indices = useMarketStore((s) => s.indices);
  const connected = useMarketStore((s) => s.connected);
  const setIndices = useMarketStore((s) => s.setIndices);
  const [time, setTime] = useState(new Date());
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    getIndices().then(setIndices).catch(console.error);
    const interval = setInterval(() => {
      getIndices().then(setIndices).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [setIndices]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isMarketOpen = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
    const timeInMinutes = hours * 60 + minutes;
    return timeInMinutes >= 555 && timeInMinutes <= 930; // 9:15 - 15:30
  };

  return (
    <div className="h-10 bg-terminal-surface border-b border-terminal-border flex items-center px-3 gap-4 shrink-0">
      <div className="flex items-center gap-2 text-terminal-blue font-bold text-sm">
        <Activity size={16} />
        <span>ALADDIN</span>
      </div>

      <div className="h-5 w-px bg-terminal-border" />

      {/* Index Ticker */}
      <div className="flex items-center gap-4 overflow-hidden flex-1">
        {indices.map((idx) => (
          <div key={idx.symbol} className="flex items-center gap-2 text-xs whitespace-nowrap">
            <span className="text-gray-400">{idx.symbol}</span>
            <span className="text-white font-medium">{formatNumber(idx.regularMarketPrice)}</span>
            <span className={cn(
              idx.regularMarketChange >= 0 ? 'text-terminal-green' : 'text-terminal-red',
              'text-[11px]'
            )}>
              {formatPercent(idx.regularMarketChangePercent)}
            </span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        {showSearch ? (
          <StockSearch onClose={() => setShowSearch(false)} />
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-terminal-bg px-2 py-1 rounded border border-terminal-border"
          >
            <Search size={12} />
            <span>Search</span>
            <kbd className="text-[10px] text-gray-500 ml-2 bg-gray-800 px-1 rounded">/</kbd>
          </button>
        )}
      </div>

      <div className="h-5 w-px bg-terminal-border" />

      {/* Market Status */}
      <div className={cn(
        'text-[10px] px-2 py-0.5 rounded',
        isMarketOpen() ? 'bg-green-900/30 text-terminal-green' : 'bg-red-900/30 text-terminal-red'
      )}>
        {isMarketOpen() ? 'MARKET OPEN' : 'MARKET CLOSED'}
      </div>

      {/* Connection */}
      <div className="flex items-center gap-1 text-xs">
        {connected ? (
          <Wifi size={12} className="text-terminal-green" />
        ) : (
          <WifiOff size={12} className="text-terminal-red" />
        )}
      </div>

      {/* Clock */}
      <div className="text-xs text-gray-400 font-mono">
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
    </div>
  );
}
