import { useEffect, useState } from 'react';
import { getMovers } from '../../services/marketApi';
import { formatNumber, formatPercent, formatVolume, cn } from '../../utils/formatters';
import { useMarketStore } from '../../stores/marketStore';
import { useUIStore } from '../../stores/uiStore';
import type { Quote } from '../../types/market';

type Tab = 'gainers' | 'losers' | 'mostActive';

export function TopMovers() {
  const [tab, setTab] = useState<Tab>('gainers');
  const [data, setData] = useState<{ gainers: Quote[]; losers: Quote[]; mostActive: Quote[] }>({
    gainers: [], losers: [], mostActive: []
  });
  const [loading, setLoading] = useState(true);
  const setSelectedSymbol = useMarketStore((s) => s.setSelectedSymbol);
  const setCurrentPage = useUIStore((s) => s.setCurrentPage);

  useEffect(() => {
    setLoading(true);
    getMovers().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stocks = data[tab];

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg">
      <div className="flex border-b border-terminal-border">
        {(['gainers', 'losers', 'mostActive'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 px-3 py-2 text-xs font-medium transition-colors',
              tab === t
                ? 'text-terminal-blue border-b-2 border-terminal-blue bg-terminal-blue/5'
                : 'text-gray-400 hover:text-white'
            )}
          >
            {t === 'gainers' ? 'Top Gainers' : t === 'losers' ? 'Top Losers' : 'Most Active'}
          </button>
        ))}
      </div>

      <div className="p-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-xs">Loading market data...</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 text-[10px]">
                <th className="text-left py-1 px-2">SYMBOL</th>
                <th className="text-right py-1 px-2">LTP</th>
                <th className="text-right py-1 px-2">CHG%</th>
                <th className="text-right py-1 px-2">VOLUME</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr
                  key={s.symbol}
                  className="hover:bg-white/5 cursor-pointer"
                  onClick={() => { setSelectedSymbol(s.symbol); setCurrentPage('chart'); }}
                >
                  <td className="py-1.5 px-2 font-medium text-white">{s.symbol}</td>
                  <td className="py-1.5 px-2 text-right text-white">{formatNumber(s.regularMarketPrice)}</td>
                  <td className={cn(
                    'py-1.5 px-2 text-right font-medium',
                    s.regularMarketChange >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                  )}>
                    {formatPercent(s.regularMarketChangePercent)}
                  </td>
                  <td className="py-1.5 px-2 text-right text-gray-400">{formatVolume(s.regularMarketVolume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
