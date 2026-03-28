import { useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { cn } from '../../utils/formatters';

interface Section {
  id: string;
  title: string;
  content: string;
}

const sections: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: `Welcome to ALADDIN - your Indian Stock Market Trading Terminal.

ALADDIN connects to NSE (National Stock Exchange) and BSE (Bombay Stock Exchange) to provide real-time market data, charting, and paper trading capabilities.

**First steps:**
1. The Dashboard shows major indices (NIFTY 50, SENSEX, Bank NIFTY) and top market movers
2. Use the Search bar (or press /) to find any stock
3. Click any stock to open its chart
4. Set up your paper trading balance in the Portfolio section

**Navigation:** Use the sidebar on the left to switch between sections. You can collapse it by clicking the arrow at the bottom.

**Market Hours:** Indian markets are open Mon-Fri, 9:15 AM to 3:30 PM IST. The top bar shows whether the market is currently open or closed.`,
  },
  {
    id: 'reading-charts',
    title: 'Reading Charts',
    content: `ALADDIN uses professional candlestick charts powered by TradingView's Lightweight Charts.

**Candlestick Basics:**
- Green candle = price went UP (close > open)
- Red candle = price went DOWN (close < open)
- The thin lines (wicks) show the high and low of the period
- The thick body shows the open and close prices

**Timeframes:**
- 1D = intraday (5-minute candles)
- 1W = weekly view (15-minute candles)
- 1M = one month (daily candles)
- 3M, 6M, 1Y, 5Y = longer periods (daily/weekly candles)

**Chart Information:**
- The top bar shows: Open, High, Low, Previous Close, Volume, 52-week High/Low, and P/E ratio
- Volume bars at the bottom show trading activity
- Green volume = buying pressure, Red volume = selling pressure

**Interacting:**
- Scroll to zoom in/out on the time axis
- Click and drag to pan
- Hover over candles to see exact OHLC values`,
  },
  {
    id: 'watchlist',
    title: 'Using Watchlists',
    content: `Watchlists let you track your favorite stocks with live price updates.

**Adding Stocks:**
1. Go to the Watchlist page from the sidebar
2. Type a stock symbol (e.g., RELIANCE, TCS, INFY) in the "Add symbol" field
3. Press Enter or click the + button

**Features:**
- Live prices update automatically via WebSocket
- Click any stock to open its chart
- Remove stocks with the X button
- Prices show LTP (Last Traded Price) and change percentage

**Tips:**
- Add stocks you're interested in trading or monitoring
- The watchlist auto-subscribes to price updates for all listed stocks
- Green = price up, Red = price down from previous close`,
  },
  {
    id: 'placing-orders',
    title: 'Placing Orders (Paper Trading)',
    content: `ALADDIN includes a paper trading system — trade with virtual money using real market data.

**Setting Up:**
1. Go to Portfolio and click "Set Balance"
2. Enter an amount in INR (e.g., 100000 for ₹1,00,000)
3. You're ready to trade!

**Order Types:**
- **MARKET:** Executes immediately at the current price
- **LIMIT:** Executes only when the price reaches your specified level (BUY at or below, SELL at or above)
- **SL (Stop Loss):** Triggers when price hits your stop level

**Placing an Order:**
1. Go to Orders > Place Order tab
2. Select BUY or SELL
3. Choose order type (MARKET/LIMIT/SL)
4. Enter quantity
5. For LIMIT/SL orders, enter the target price
6. Click the BUY/SELL button

**Order Book:**
- View all your orders in the Order Book tab
- Cancel pending LIMIT/SL orders
- Track executed prices and timestamps

**Important:** This is paper trading only — no real money is involved. Use it to practice and learn!`,
  },
  {
    id: 'screener',
    title: 'Using the Screener',
    content: `The Stock Screener helps you filter and find stocks from the NIFTY 50 universe.

**Preset Filters:**
- **All NIFTY 50:** Shows all 50 stocks
- **Gainers:** Only stocks that are up today
- **Losers:** Only stocks that are down today
- **Near 52W High:** Stocks within 5% of their 52-week high (momentum)
- **Near 52W Low:** Stocks within 5% of their 52-week low (value)
- **High Volume:** Stocks with volume above 50 lakh

**Sorting:**
- Click any column header to sort
- Click again to reverse the sort order
- Sort by symbol, price, change%, volume, or market cap

**Using the Screener:**
1. Select a preset filter that matches your strategy
2. Sort by the metric that matters most to you
3. Click any stock to open its chart for deeper analysis`,
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    content: `Speed up your workflow with these keyboard shortcuts:

**Navigation:**
- / — Open stock search
- Escape — Close search/dialogs

**Chart:**
- Click timeframe buttons (1D, 1W, 1M, etc.) to switch periods

**General Tips:**
- Use search to quickly find and switch between stocks
- The WebSocket indicator in the top-right shows connection status
- Green dot = connected and receiving live data
- Red dot = disconnected, attempting to reconnect
- All data refreshes automatically every 3-5 seconds during market hours`,
  },
];

export function TutorialPanel() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredSections = searchQuery
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sections;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-terminal-border bg-terminal-surface">
        <h2 className="text-sm font-bold text-white mb-2">How to Use ALADDIN</h2>
        <div className="flex items-center bg-terminal-bg border border-terminal-border rounded px-2 py-1">
          <Search size={12} className="text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tutorials..."
            className="bg-transparent text-xs text-white px-2 outline-none flex-1"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredSections.map((section) => (
          <div key={section.id} className="border-b border-terminal-border/30">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 text-left"
            >
              {expandedSections.has(section.id) ? (
                <ChevronDown size={14} className="text-terminal-blue shrink-0" />
              ) : (
                <ChevronRight size={14} className="text-gray-400 shrink-0" />
              )}
              <span className={cn(
                'text-xs font-medium',
                expandedSections.has(section.id) ? 'text-terminal-blue' : 'text-white'
              )}>
                {section.title}
              </span>
            </button>
            {expandedSections.has(section.id) && (
              <div className="px-4 pb-4 pl-9">
                <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {section.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
