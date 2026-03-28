import { useMarketStore } from '../../stores/marketStore';
import { formatNumber, formatPercent, cn } from '../../utils/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function MarketOverview() {
  const indices = useMarketStore((s) => s.indices);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {indices.map((idx) => {
        const isUp = idx.regularMarketChange >= 0;
        return (
          <div
            key={idx.symbol}
            className={cn(
              'bg-terminal-surface border rounded-lg p-3 transition-colors',
              isUp ? 'border-green-900/50' : 'border-red-900/50'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{idx.symbol}</span>
              {isUp ? (
                <TrendingUp size={14} className="text-terminal-green" />
              ) : (
                <TrendingDown size={14} className="text-terminal-red" />
              )}
            </div>
            <div className="text-lg font-bold text-white">
              {formatNumber(idx.regularMarketPrice)}
            </div>
            <div className={cn(
              'text-xs font-medium',
              isUp ? 'text-terminal-green' : 'text-terminal-red'
            )}>
              {isUp ? '+' : ''}{formatNumber(idx.regularMarketChange)} ({formatPercent(idx.regularMarketChangePercent)})
            </div>
          </div>
        );
      })}
    </div>
  );
}
