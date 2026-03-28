import { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

interface NewsItem {
  title: string;
  source: string;
  time: string;
  url: string;
  category: string;
}

// Simulated news since we don't have a proper news API key
// In production, this would fetch from a real API
function generateMarketNews(): NewsItem[] {
  const news: NewsItem[] = [
    { title: 'NIFTY 50 trades near all-time highs amid strong FII inflows', source: 'Economic Times', time: '2 hours ago', url: '#', category: 'Market' },
    { title: 'RBI keeps repo rate unchanged at current levels', source: 'Mint', time: '3 hours ago', url: '#', category: 'Macro' },
    { title: 'IT sector rallies on strong Q3 earnings guidance', source: 'Moneycontrol', time: '4 hours ago', url: '#', category: 'Sector' },
    { title: 'Reliance Industries announces new renewable energy investment', source: 'Business Standard', time: '5 hours ago', url: '#', category: 'Company' },
    { title: 'Banking stocks surge as credit growth remains robust', source: 'NDTV Profit', time: '5 hours ago', url: '#', category: 'Sector' },
    { title: 'Auto sector witnesses record monthly sales figures', source: 'ET Auto', time: '6 hours ago', url: '#', category: 'Sector' },
    { title: 'FII net buyers in Indian equities for 5th consecutive session', source: 'Mint', time: '7 hours ago', url: '#', category: 'Market' },
    { title: 'HDFC Bank Q3 results beat street estimates', source: 'Moneycontrol', time: '8 hours ago', url: '#', category: 'Company' },
    { title: 'Crude oil prices impact downstream oil marketing companies', source: 'Economic Times', time: '10 hours ago', url: '#', category: 'Commodity' },
    { title: 'Pharma exports show steady growth in FY26', source: 'Business Standard', time: '12 hours ago', url: '#', category: 'Sector' },
  ];
  return news;
}

export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    setTimeout(() => {
      setNews(generateMarketNews());
      setLoading(false);
    }, 500);
  }, []);

  const categories = ['All', ...new Set(news.map(n => n.category))];
  const filtered = filter === 'All' ? news : news.filter(n => n.category === filter);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-terminal-border bg-terminal-surface">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-white">Market News</h2>
          <button
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="flex gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2 py-1 text-[11px] rounded ${
                filter === cat ? 'bg-terminal-blue/10 text-terminal-blue' : 'text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-xs">Loading news...</div>
        ) : (
          <div className="divide-y divide-terminal-border/30">
            {filtered.map((item, i) => (
              <div key={i} className="px-4 py-3 hover:bg-white/5 cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs text-white font-medium leading-relaxed">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-terminal-blue">{item.source}</span>
                      <span className="text-[10px] text-gray-500">{item.time}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{item.category}</span>
                    </div>
                  </div>
                  <ExternalLink size={12} className="text-gray-500 shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
