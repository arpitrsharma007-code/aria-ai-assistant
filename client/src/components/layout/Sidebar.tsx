import {
  LayoutDashboard, CandlestickChart, List, Briefcase, ShoppingCart,
  Filter, TrendingUp, Newspaper, HelpCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../utils/formatters';

const navItems = [
  { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'chart' as const, icon: CandlestickChart, label: 'Chart' },
  { id: 'watchlist' as const, icon: List, label: 'Watchlist' },
  { id: 'portfolio' as const, icon: Briefcase, label: 'Portfolio' },
  { id: 'orders' as const, icon: ShoppingCart, label: 'Orders' },
  { id: 'screener' as const, icon: Filter, label: 'Screener' },
  { id: 'forecast' as const, icon: TrendingUp, label: 'Forecast' },
  { id: 'news' as const, icon: Newspaper, label: 'News' },
  { id: 'tutorial' as const, icon: HelpCircle, label: 'How to Use' },
];

export function Sidebar() {
  const currentPage = useUIStore((s) => s.currentPage);
  const setCurrentPage = useUIStore((s) => s.setCurrentPage);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <div className={cn(
      'bg-terminal-surface border-r border-terminal-border flex flex-col shrink-0 transition-all duration-200',
      collapsed ? 'w-12' : 'w-44'
    )}>
      <nav className="flex-1 py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors',
              currentPage === item.id
                ? 'bg-terminal-blue/10 text-terminal-blue border-r-2 border-terminal-blue'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={16} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <button
        onClick={toggleSidebar}
        className="p-2 text-gray-500 hover:text-white border-t border-terminal-border"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
}
