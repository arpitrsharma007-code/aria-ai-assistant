import { useEffect, useState } from 'react';
import { TrendingUp, Search, Scan, Loader2, Crosshair, Trophy, RefreshCw } from 'lucide-react';
import { useForecastStore } from '../../stores/forecastStore';
import { useMarketStore } from '../../stores/marketStore';
import { ForecastChart } from './ForecastChart';
import { SignalCard } from './SignalCard';
import { cn, formatINR } from '../../utils/formatters';
import { trackSignal, checkOutcomes, getSignalStats, type SignalStats } from '../../services/forecastApi';
import type { ForecastSignal } from '../../types/forecast';

const FORECAST_TIMEFRAMES = [
  { label: '5m',  period: '5d',  interval: '5m',  desc: '5 Min' },
  { label: '15m', period: '5d',  interval: '15m', desc: '15 Min' },
  { label: '1H',  period: '1mo', interval: '60m', desc: '1 Hour' },
  { label: '1D',  period: '3mo', interval: '1d',  desc: 'Daily' },
  { label: '1W',  period: '6mo', interval: '1wk', desc: 'Weekly' },
  { label: '1M',  period: '5y',  interval: '1mo', desc: 'Monthly' },
];

export function ForecastPanel() {
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const [symbol, setSymbol] = useState(selectedSymbol);
  const [searchInput, setSearchInput] = useState('');
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [tracking, setTracking] = useState(false);
  const [trackMsg, setTrackMsg] = useState('');

  const {
    currentSignal, scanResults, signalHistory, selectedTimeframe,
    loading, scanning, error,
    setTimeframe, fetchForecast, fetchScan, fetchHistory,
  } = useForecastStore();

  const tfConfig = FORECAST_TIMEFRAMES.find(t => t.label === selectedTimeframe) || FORECAST_TIMEFRAMES[3];

  // Fetch forecast when symbol or timeframe changes
  useEffect(() => {
    if (symbol) {
      fetchForecast(symbol, selectedTimeframe);
      fetchHistory(symbol, selectedTimeframe);
    }
  }, [symbol, selectedTimeframe]);

  // Load stats on mount
  useEffect(() => {
    getSignalStats().then(setStats).catch(() => {});
  }, []);

  const handleSearch = () => {
    const s = searchInput.trim().toUpperCase();
    if (s) {
      setSymbol(s);
      setSearchInput('');
    }
  };

  const handleTrack = async () => {
    if (!currentSignal || currentSignal.signalType === 'HOLD') return;
    setTracking(true);
    try {
      await trackSignal(currentSignal);
      setTrackMsg('Signal tracked!');
      const newStats = await getSignalStats();
      setStats(newStats);
      setTimeout(() => setTrackMsg(''), 2000);
    } catch {
      setTrackMsg('Failed');
    }
    setTracking(false);
  };

  const handleCheckOutcomes = async () => {
    try {
      const result = await checkOutcomes();
      const newStats = await getSignalStats();
      setStats(newStats);
      setTrackMsg(`Checked ${result.checked}, resolved ${result.resolved}`);
      setTimeout(() => setTrackMsg(''), 3000);
    } catch {
      setTrackMsg('Check failed');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-terminal-border bg-terminal-surface shrink-0 flex-wrap">
        <TrendingUp size={18} className="text-terminal-blue" />
        <span className="text-sm font-bold text-white">Forecast</span>
        <span className="text-sm text-terminal-blue font-bold">{symbol}</span>

        {/* Search */}
        <div className="flex items-center gap-1 ml-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Symbol..."
            className="bg-terminal-border/50 text-white text-xs px-2 py-1 rounded w-24 outline-none focus:ring-1 focus:ring-terminal-blue"
          />
          <button onClick={handleSearch} className="p-1 text-gray-400 hover:text-white">
            <Search size={14} />
          </button>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex items-center gap-0.5 ml-2">
          {FORECAST_TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setTimeframe(tf.label)}
              title={tf.desc}
              className={cn(
                'px-2 py-1 text-[10px] rounded transition-colors',
                selectedTimeframe === tf.label
                  ? 'bg-terminal-blue text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Scan Button */}
        <button
          onClick={() => fetchScan(selectedTimeframe)}
          disabled={scanning}
          className={cn(
            'ml-auto flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors',
            scanning
              ? 'bg-terminal-border text-gray-500 cursor-not-allowed'
              : 'bg-terminal-blue/20 text-terminal-blue hover:bg-terminal-blue/30'
          )}
        >
          {scanning ? <Loader2 size={12} className="animate-spin" /> : <Scan size={12} />}
          {scanning ? 'Scanning...' : 'Scan NIFTY50'}
        </button>
      </div>

      {/* Stats Bar */}
      {stats && stats.total > 0 && (
        <div className="flex items-center gap-4 px-4 py-1 border-b border-terminal-border text-[10px] bg-terminal-surface/50 shrink-0">
          <span className="text-gray-500">
            <Trophy size={10} className="inline mr-1" />
            Win Rate: <span className={cn('font-bold', stats.winRate >= 50 ? 'text-green-400' : 'text-red-400')}>{stats.winRate}%</span>
          </span>
          <span className="text-gray-500">
            Wins: <span className="text-green-400 font-bold">{stats.wins}</span> / Losses: <span className="text-red-400 font-bold">{stats.losses}</span>
          </span>
          <span className="text-gray-500">
            P&L: <span className={cn('font-bold', stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400')}>
              {stats.totalPnl >= 0 ? '+' : ''}{formatINR(stats.totalPnl)}
            </span>
          </span>
          <span className="text-gray-500">
            Avg: <span className={cn('font-bold', stats.avgPnlPercent >= 0 ? 'text-green-400' : 'text-red-400')}>
              {stats.avgPnlPercent >= 0 ? '+' : ''}{stats.avgPnlPercent}%
            </span>
          </span>
          <span className="text-gray-500">Tracked: {stats.total} | Pending: {stats.pending}</span>
          <button onClick={handleCheckOutcomes} className="text-terminal-blue hover:text-white ml-auto" title="Check outcomes">
            <RefreshCw size={10} />
          </button>
        </div>
      )}

      {/* Track Message */}
      {trackMsg && (
        <div className="px-4 py-1 text-[10px] text-terminal-blue bg-terminal-blue/5 border-b border-terminal-border shrink-0">
          {trackMsg}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chart Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <Loader2 size={24} className="animate-spin mr-2" />
                Generating forecast for {symbol}...
              </div>
            ) : (
              <ForecastChart
                symbol={symbol}
                period={tfConfig.period}
                interval={tfConfig.interval}
                signal={currentSignal}
                historicalSignals={signalHistory}
              />
            )}
          </div>

          {/* Reasoning Bar */}
          {currentSignal && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-terminal-border bg-terminal-surface/50 text-[11px] text-gray-400 shrink-0">
              <div className="flex-1">
                <span className="text-gray-500 font-medium">Reasoning: </span>
                {currentSignal.reasoning}
              </div>
              {currentSignal.signalType !== 'HOLD' && (
                <button
                  onClick={handleTrack}
                  disabled={tracking}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-terminal-blue/20 text-terminal-blue hover:bg-terminal-blue/30 text-[10px] shrink-0"
                >
                  <Crosshair size={10} />
                  {tracking ? 'Tracking...' : 'Track Signal'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-72 border-l border-terminal-border bg-terminal-surface overflow-y-auto shrink-0">
          <div className="p-3">
            {error && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-400">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                <Loader2 size={16} className="animate-spin mr-2" />
                Loading...
              </div>
            ) : currentSignal ? (
              <SignalCard signal={currentSignal} />
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No signal data. Select a stock to analyze.
              </div>
            )}

            {/* Signal History */}
            {signalHistory.length > 0 && (
              <div className="mt-4 border-t border-terminal-border pt-3">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Signal History</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {signalHistory.slice(-10).reverse().map((hs, i) => (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span className={cn(
                        'font-medium',
                        hs.signalType.includes('BUY') ? 'text-green-400' : 'text-red-400'
                      )}>
                        {hs.signalType.replace('_', ' ')}
                      </span>
                      <span className="text-gray-500">{hs.confidence}%</span>
                      <span className="text-gray-600">{new Date(hs.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scan Results */}
            {scanResults.length > 0 && (
              <div className="mt-4 border-t border-terminal-border pt-3">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">
                  Scan Results ({scanResults.length} signals)
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {scanResults.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSymbol(s.symbol);
                        useForecastStore.getState().setCurrentSignal(s);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded text-[11px] transition-colors',
                        s.symbol === symbol
                          ? 'bg-terminal-blue/10 border border-terminal-blue/30'
                          : 'hover:bg-white/5'
                      )}
                    >
                      <span className="text-white font-medium">{s.symbol}</span>
                      <span className={cn(
                        'font-bold',
                        s.signalType.includes('BUY') ? 'text-green-400' : 'text-red-400'
                      )}>
                        {s.signalType.replace('_', ' ')}
                      </span>
                      <span className="text-gray-500">{s.confidence}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
