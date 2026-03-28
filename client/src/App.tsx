import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { MarketOverview } from './components/market/MarketOverview';
import { TopMovers } from './components/market/TopMovers';
import { StockChart } from './components/chart/StockChart';
import { WatchlistPanel } from './components/watchlist/Watchlist';
import { Portfolio } from './components/portfolio/Portfolio';
import { OrderPanel } from './components/order/OrderPanel';
import { Screener } from './components/screener/Screener';
import { NewsFeed } from './components/news/NewsFeed';
import { TutorialPanel } from './components/tutorial/TutorialPanel';
import { ForecastPanel } from './components/forecast/ForecastPanel';
import { useUIStore } from './stores/uiStore';
import { useWebSocket } from './hooks/useWebSocket';

function Dashboard() {
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <MarketOverview />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3">
          <TopMovers />
        </div>
      </div>
    </div>
  );
}

function PageContent() {
  const currentPage = useUIStore((s) => s.currentPage);

  switch (currentPage) {
    case 'dashboard': return <Dashboard />;
    case 'chart': return <StockChart />;
    case 'watchlist': return <WatchlistPanel />;
    case 'portfolio': return <Portfolio />;
    case 'orders': return <OrderPanel />;
    case 'screener': return <Screener />;
    case 'forecast': return <ForecastPanel />;
    case 'news': return <NewsFeed />;
    case 'tutorial': return <TutorialPanel />;
    default: return <Dashboard />;
  }
}

export default function App() {
  // Initialize WebSocket connection
  useWebSocket();

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <PageContent />
        </main>
      </div>
    </div>
  );
}
