import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { searchSymbols } from '../../services/marketApi';
import { useMarketStore } from '../../stores/marketStore';
import { useUIStore } from '../../stores/uiStore';
import type { SearchResult } from '../../types/market';

interface Props {
  onClose: () => void;
}

export function StockSearch({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const setSelectedSymbol = useMarketStore((s) => s.setSelectedSymbol);
  const setCurrentPage = useUIStore((s) => s.setCurrentPage);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchSymbols(query);
        setResults(data);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const selectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    setCurrentPage('chart');
    onClose();
  };

  return (
    <div className="absolute right-0 top-0 z-50">
      <div className="flex items-center bg-terminal-bg border border-terminal-border rounded overflow-hidden">
        <Search size={14} className="ml-2 text-gray-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks..."
          className="bg-transparent text-sm text-white px-2 py-1 w-64 outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && results.length > 0) selectSymbol(results[0].symbol);
          }}
        />
        <button onClick={onClose} className="px-2 text-gray-400 hover:text-white">
          <X size={14} />
        </button>
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-terminal-surface border border-terminal-border rounded mt-1 max-h-64 overflow-y-auto shadow-xl">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => selectSymbol(r.symbol)}
              className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between text-xs"
            >
              <div>
                <span className="text-white font-medium">{r.symbol}</span>
                <span className="text-gray-400 ml-2">{r.shortName}</span>
              </div>
              <span className="text-gray-500 text-[10px]">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div className="absolute top-full left-0 right-0 bg-terminal-surface border border-terminal-border rounded mt-1 p-3 text-center text-xs text-gray-400">
          Searching...
        </div>
      )}
    </div>
  );
}
