import type { ForecastSignal } from '../../types/forecast';
import { formatINR, cn } from '../../utils/formatters';

const SIGNAL_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  STRONG_BUY: { bg: 'bg-green-500/20', text: 'text-green-400', glow: 'shadow-green-500/30 shadow-lg' },
  BUY: { bg: 'bg-green-500/10', text: 'text-green-400', glow: '' },
  HOLD: { bg: 'bg-gray-500/10', text: 'text-gray-400', glow: '' },
  SELL: { bg: 'bg-red-500/10', text: 'text-red-400', glow: '' },
  STRONG_SELL: { bg: 'bg-red-500/20', text: 'text-red-400', glow: 'shadow-red-500/30 shadow-lg' },
};

const INDICATOR_ICON: Record<string, string> = {
  OVERSOLD: '🟢', RECOVERING: '🟢', 'BULLISH CROSS': '🟢',
  OVERBOUGHT: '🔴', WEAKENING: '🔴', 'BEARISH CROSS': '🔴',
  'BULLISH CROSSOVER': '🟢', 'BEARISH CROSSOVER': '🔴',
  'BULLISH MOMENTUM': '🟢', 'BEARISH MOMENTUM': '🔴',
  BULLISH: '🟢', BEARISH: '🔴',
  'LOWER BAND': '🟢', 'UPPER BAND': '🔴', 'ABOVE MIDDLE': '🟢', 'BELOW MIDDLE': '🔴',
  UPTREND: '🟢', DOWNTREND: '🔴',
  'GOLDEN CROSS': '🟢', 'DEATH CROSS': '🔴',
  'BULLISH VOLUME SPIKE': '🟢', 'BEARISH VOLUME SPIKE': '🔴',
  'ABOVE AVG (BULLISH)': '🟢', 'ABOVE AVG (BEARISH)': '🔴',
  NEUTRAL: '⚪', NORMAL: '⚪', 'NO DATA': '⚪', 'HIGH VOLUME (MIXED)': '🟡',
};

function getIcon(signal: string): string {
  return INDICATOR_ICON[signal] || '⚪';
}

export function SignalCard({ signal }: { signal: ForecastSignal }) {
  const colors = SIGNAL_COLORS[signal.signalType] || SIGNAL_COLORS.HOLD;
  const isBuy = signal.signalType.includes('BUY');
  const isSell = signal.signalType.includes('SELL');

  return (
    <div className="space-y-3">
      {/* Signal Badge */}
      <div className={cn('rounded-lg p-4 text-center border border-terminal-border', colors.bg, colors.glow)}>
        <div className={cn('text-2xl font-bold', colors.text)}>
          {signal.signalType.replace('_', ' ')}
        </div>
        <div className="text-xs text-gray-400 mt-1">{signal.timeframe} Timeframe</div>
      </div>

      {/* Confidence Meter */}
      <div>
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-gray-400">Confidence</span>
          <span className={cn(
            'font-bold',
            signal.confidence >= 70 ? 'text-green-400' :
            signal.confidence >= 40 ? 'text-yellow-400' : 'text-red-400'
          )}>
            {signal.confidence}%
          </span>
        </div>
        <div className="h-2 bg-terminal-border rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              signal.confidence >= 70 ? 'bg-green-500' :
              signal.confidence >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>

      {/* Entry / SL / Target Prices */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-terminal-border/30 rounded p-2">
          <div className="text-gray-500">Entry</div>
          <div className="text-terminal-blue font-bold">{formatINR(signal.entryPrice)}</div>
        </div>
        <div className="bg-terminal-border/30 rounded p-2">
          <div className="text-gray-500">Stop Loss</div>
          <div className="text-red-400 font-bold">{formatINR(signal.stopLoss)}</div>
        </div>
        <div className="bg-terminal-border/30 rounded p-2">
          <div className="text-gray-500">Target 1</div>
          <div className={cn('font-bold', isBuy ? 'text-green-400' : 'text-red-400')}>{formatINR(signal.target1)}</div>
        </div>
        <div className="bg-terminal-border/30 rounded p-2">
          <div className="text-gray-500">Target 2</div>
          <div className={cn('font-bold', isBuy ? 'text-green-400' : 'text-red-400')}>{formatINR(signal.target2)}</div>
        </div>
      </div>

      {/* Risk:Reward */}
      <div className="flex justify-between text-[11px] px-1">
        <span className="text-gray-400">Risk : Reward</span>
        <span className="text-white font-bold">1 : {signal.riskReward}</span>
      </div>

      {/* Indicator Breakdown */}
      <div className="border-t border-terminal-border pt-3">
        <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Indicator Breakdown</div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">RSI</span>
            <span className="flex items-center gap-1">
              <span className="text-white">{signal.indicators.rsi.value}</span>
              <span>{getIcon(signal.indicators.rsi.signal)}</span>
              <span className="text-gray-500 text-[10px] w-20 text-right truncate">{signal.indicators.rsi.signal}</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">MACD</span>
            <span className="flex items-center gap-1">
              <span className="text-white">{signal.indicators.macd.value}</span>
              <span>{getIcon(signal.indicators.macd.signal)}</span>
              <span className="text-gray-500 text-[10px] w-20 text-right truncate">{signal.indicators.macd.signal}</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Bollinger</span>
            <span className="flex items-center gap-1">
              <span>{getIcon(signal.indicators.bollingerBands.position)}</span>
              <span className="text-gray-500 text-[10px] w-20 text-right truncate">{signal.indicators.bollingerBands.position}</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">MA Cross</span>
            <span className="flex items-center gap-1">
              <span>{getIcon(signal.indicators.movingAvg.crossover)}</span>
              <span className="text-gray-500 text-[10px] w-20 text-right truncate">{signal.indicators.movingAvg.crossover}</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Volume</span>
            <span className="flex items-center gap-1">
              <span className="text-white">{signal.indicators.volume.relative}x</span>
              <span>{getIcon(signal.indicators.volume.signal)}</span>
              <span className="text-gray-500 text-[10px] w-20 text-right truncate">{signal.indicators.volume.signal}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Expiry */}
      <div className="text-[10px] text-gray-600 text-center pt-1 border-t border-terminal-border">
        Generated {new Date(signal.generatedAt).toLocaleTimeString()} · Expires {new Date(signal.expiresAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
