import { useState, useEffect } from 'react';
import { getBatchQuotes } from '../../services/marketApi';
import { NIFTY50_SYMBOLS } from '../../utils/constants';
import { formatNumber, formatPercent, formatVolume, formatCompactINR, cn } from '../../utils/formatters';
import { useMarketStore } from '../../stores/marketStore';
import { useUIStore } from '../../stores/uiStore';
import type { Quote } from '../../types/market';

type SortField = 'symbol' | 'price' | 'change' | 'volume' | 'marketCap';
type Preset = 'all' | 'gainers' | 'losers' | '52wHigh' | '52wLow' | 'highVolume';

export function Screener() {
  const [stocks, setStocks] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('change');
  const [sortAsc, setSortAsc] = useState(false);
  const [preset, setPreset] = useState<Preset>('all');
  const setSelectedSymbol = useMarketStore((s) => s.setSelectedSymbol);
  const setCurrentPage = useUIStore((s) => s.setCurrentPage);

  useEffect(() => {
    setLoading(true);
    getBatchQuotes(NIFTY50_SYMBOLS)
      .then(setStocks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredStocks = stocks.filter((s) => {
    switch (preset) {
      case 'gainers': return s.regularMarketChange > 0;
      case 'losers': return s.regularMarketChange < 0;
      case '52wHigh': return s.regularMarketPrice >= s.fiftyTwoWeekHigh * 0.95;
      case '52wLow': return s.regularMarketPrice <= s.fiftyTwoWeekLow * 1.05;
      case 'highVolume': return s.regularMarketVolume > 5000000;
      default: return true;
    }
  });

  const sortedStocks = [...filteredStocks].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
      case 'price': cmp = a.regularMarketPrice - b.regularMarketPrice; break;
      case 'change': cmp = a.regularMarketChangePercent - b.regularMarketChangePercent; break;
      case 'volume': cmp = a.regularMarketVolume - b.regularMarketVolume; break;
      case 'marketCap': cmp = (a.marketCap || 0) - (b.marketCap || 0); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const presets: { id: Preset; label: string }[] = [
    { id: 'all', label: 'All NIFTY 50' },
    { id: 'gainers', label: 'Gainers' },
    { id: 'losers', label: 'Losers' },
    { id: '52wHigh', label: 'Near 52W High' },
    { id: '52wLow', label: 'Near 52W Low' },
    { id: 'highVolume', label: 'High Volume' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-terminal-border bg-terminal-surface">
        <h2 className="text-sm font-bold text-white mb-2">Stock Screener</h2>
        <div className="flex gap-1 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                'px-2 py-1 text-[11px] rounded border',
                preset === p.id
                  ? 'border-terminal-blue text-terminal-blue bg-terminal-blue/10'
                  : 'border-terminal-border text-gray-400 hover:text-white'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-xs">Loading NIFTY 50 data...</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 text-[10px] sticky top-0 bg-terminal-surface">
                <th className="text-left py-1.5 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>SYMBOL</th>
                <th className="text-right py-1.5 px-2 cursor-pointer hover:text-white" onClick={() => handleSort('price')}>LTP</th>
                <th className="text-right py-1.5 px-2 cursor-pointer hover:text-white" onClick={() => handleSort('change')}>CHG%</th>
                <th className="text-right py-1.5 px-2 cursor-pointer hover:text-white" onClick={() => handleSort('volume')}>VOLUME</th>
                <th className="text-right py-1.5 px-2">52W HIGH</th>
                <th className="text-right py-1.5 px-2">52W LOW</th>
                <th className="text-right py-1.5 px-2 cursor-pointer hover:text-white" onClick={() => handleSort('marketCap')}>MCAP</th>
              </tr>
            </thead>
            <tbody>
              {sortedStocks.map((s) => (
                <tr
                  key={s.symbol}
                  className="border-b border-terminal-border/30 hover:bg-white/5 cursor-pointer"
                  onClick={() => { setSelectedSymbol(s.symbol); setCurrentPage('chart'); }}
                >
                  <td className="py-2 px-3 font-medium text-white">{s.symbol}</td>
                  <td className="py-2 px-2 text-right text-white">{formatNumber(s.regularMarketPrice)}</td>
                  <td className={cn('py-2 px-2 text-right font-medium',
                    s.regularMarketChange >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                  )}>
                    {formatPercent(s.regularMarketChangePercent)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-400">{formatVolume(s.regularMarketVolume)}</td>
                  <td className="py-2 px-2 text-right text-gray-400">{formatNumber(s.fiftyTwoWeekHigh)}</td>
                  <td className="py-2 px-2 text-right text-gray-400">{formatNumber(s.fiftyTwoWeekLow)}</td>
                  <td className="py-2 px-2 text-right text-gray-400">{s.marketCap ? formatCompactINR(s.marketCap) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="text-center py-2 text-[10px] text-gray-600">
          Showing {sortedStocks.length} of {stocks.length} stocks
        </div>
      </div>
    </div>
  );
}
