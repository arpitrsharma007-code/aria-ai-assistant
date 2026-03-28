import { create } from 'zustand';

type Page = 'dashboard' | 'chart' | 'watchlist' | 'portfolio' | 'orders' | 'screener' | 'forecast' | 'news' | 'tutorial';

interface UIState {
  currentPage: Page;
  sidebarCollapsed: boolean;
  setCurrentPage: (page: Page) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
