import { useEffect, useRef, useState } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import { getHistory, getQuote } from '../../services/marketApi';
import { useMarketStore } from '../../stores/marketStore';
import { formatNumber, formatPercent, formatINR, cn } from '../../utils/formatters';
import { TIMEFRAMES, CHART_COLORS } from '../../utils/constants';
import type { Quote, OHLCV } from '../../types/market';

export function StockChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const price = useMarketStore((s) => s.prices[selectedSymbol]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[5]); // 1Y default
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');

  // Fetch quote on symbol change
  useEffect(() => {
    getQuote(selectedSymbol).then(setQuote).catch(console.error);
  }, [selectedSymbol]);

  // Create chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.bg },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        vertLine: { color: '#475569', width: 1, style: 2 },
        horzLine: { color: '#475569', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: CHART_COLORS.green,
      downColor: CHART_COLORS.red,
      borderUpColor: CHART_COLORS.green,
      borderDownColor: CHART_COLORS.red,
      wickUpColor: CHART_COLORS.green,
      wickDownColor: CHART_COLORS.red,
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Load data when symbol or timeframe changes
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getHistory(selectedSymbol, timeframe.period, timeframe.interval);
        if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

        const candles = data.map((d: OHLCV) => ({
          time: (new Date(d.date).getTime() / 1000) as any,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));

        const volumes = data.map((d: OHLCV) => ({
          time: (new Date(d.date).getTime() / 1000) as any,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
        }));

        candleSeriesRef.current.setData(candles);
        volumeSeriesRef.current.setData(volumes);
        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        console.error('Failed to load chart data:', err);
      }
    }
    loadData();
  }, [selectedSymbol, timeframe]);

  const displayPrice = price?.ltp ?? quote?.regularMarketPrice ?? 0;
  const displayChange = price?.change ?? quote?.regularMarketChange ?? 0;
  const displayChangePercent = price?.changePercent ?? quote?.regularMarketChangePercent ?? 0;
  const isUp = displayChange >= 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-terminal-surface">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-lg font-bold text-white">{selectedSymbol}</span>
            <span className="text-xs text-gray-400 ml-2">{quote?.shortName || ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">{formatNumber(displayPrice)}</span>
            <span className={cn('text-sm font-medium', isUp ? 'text-terminal-green' : 'text-terminal-red')}>
              {isUp ? '+' : ''}{formatNumber(displayChange)} ({formatPercent(displayChangePercent)})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setTimeframe(tf)}
              className={cn(
                'px-2 py-1 text-[11px] rounded transition-colors',
                timeframe.label === tf.label
                  ? 'bg-terminal-blue text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quote Stats */}
      {quote && (
        <div className="flex items-center gap-6 px-4 py-1.5 border-b border-terminal-border text-[11px] text-gray-400 bg-terminal-surface/50">
          <span>O: <span className="text-white">{formatNumber(quote.regularMarketOpen)}</span></span>
          <span>H: <span className="text-white">{formatNumber(quote.regularMarketDayHigh)}</span></span>
          <span>L: <span className="text-white">{formatNumber(quote.regularMarketDayLow)}</span></span>
          <span>Prev: <span className="text-white">{formatNumber(quote.regularMarketPreviousClose)}</span></span>
          <span>Vol: <span className="text-white">{quote.regularMarketVolume?.toLocaleString('en-IN')}</span></span>
          <span>52W H: <span className="text-terminal-green">{formatNumber(quote.fiftyTwoWeekHigh)}</span></span>
          <span>52W L: <span className="text-terminal-red">{formatNumber(quote.fiftyTwoWeekLow)}</span></span>
          {quote.trailingPE && <span>PE: <span className="text-white">{formatNumber(quote.trailingPE)}</span></span>}
        </div>
      )}

      {/* Chart */}
      <div ref={chartContainerRef} className="flex-1 min-h-0" />
    </div>
  );
}
