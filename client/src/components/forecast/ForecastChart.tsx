import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, ColorType, LineStyle } from 'lightweight-charts';
import { getHistory } from '../../services/marketApi';
import { CHART_COLORS } from '../../utils/constants';
import type { OHLCV } from '../../types/market';
import type { ForecastSignal, HistoricalSignal } from '../../types/forecast';

interface ForecastChartProps {
  symbol: string;
  period: string;
  interval: string;
  signal: ForecastSignal | null;
  historicalSignals: HistoricalSignal[];
}

export function ForecastChart({ symbol, period, interval, signal, historicalSignals }: ForecastChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Recreate entire chart whenever data dependencies change
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Destroy old chart if exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

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
      rightPriceScale: { borderColor: '#1e293b' },
      timeScale: { borderColor: '#1e293b', timeVisible: true },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      if (chartRef.current) {
        const { width, height } = entries[0].contentRect;
        chartRef.current.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    // Load data and build all overlays
    async function loadData() {
      try {
        const data = await getHistory(symbol, period, interval);
        if (!chartRef.current || data.length === 0) return;

        // Candlestick series
        const candleSeries = chart.addCandlestickSeries({
          upColor: CHART_COLORS.green,
          downColor: CHART_COLORS.red,
          borderUpColor: CHART_COLORS.green,
          borderDownColor: CHART_COLORS.red,
          wickUpColor: CHART_COLORS.green,
          wickDownColor: CHART_COLORS.red,
        });

        const candles = data.map((d: OHLCV) => ({
          time: (new Date(d.date).getTime() / 1000) as any,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));
        candleSeries.setData(candles);

        // Volume series
        const volumeSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

        volumeSeries.setData(data.map((d: OHLCV) => ({
          time: (new Date(d.date).getTime() / 1000) as any,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
        })));

        // Bollinger Bands overlay
        if (data.length >= 20) {
          const closes = data.map((d: OHLCV) => d.close);
          const smaPeriod = 20;
          const bbUpper: any[] = [];
          const bbMiddle: any[] = [];
          const bbLower: any[] = [];

          for (let i = 0; i < data.length; i++) {
            const time = (new Date(data[i].date).getTime() / 1000) as any;
            if (i < smaPeriod - 1) continue;

            const slice = closes.slice(i - smaPeriod + 1, i + 1);
            const mean = slice.reduce((a, b) => a + b, 0) / smaPeriod;
            const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / smaPeriod;
            const stdDev = Math.sqrt(variance);

            bbUpper.push({ time, value: mean + 2 * stdDev });
            bbMiddle.push({ time, value: mean });
            bbLower.push({ time, value: mean - 2 * stdDev });
          }

          const upperSeries = chart.addLineSeries({ color: 'rgba(239,68,68,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          const middleSeries = chart.addLineSeries({ color: 'rgba(148,163,184,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
          const lowerSeries = chart.addLineSeries({ color: 'rgba(34,197,94,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

          upperSeries.setData(bbUpper);
          middleSeries.setData(bbMiddle);
          lowerSeries.setData(bbLower);
        }

        // EMA overlays
        if (data.length >= 21) {
          const closes = data.map((d: OHLCV) => d.close);

          function computeEMA(src: number[], emaPeriod: number) {
            const result: { time: any; value: number }[] = [];
            const mult = 2 / (emaPeriod + 1);
            let ema: number | null = null;
            for (let i = 0; i < src.length; i++) {
              if (i < emaPeriod - 1) continue;
              if (i === emaPeriod - 1) {
                ema = src.slice(0, emaPeriod).reduce((a, b) => a + b, 0) / emaPeriod;
              } else {
                ema = (src[i] - ema!) * mult + ema!;
              }
              result.push({ time: (new Date(data[i].date).getTime() / 1000) as any, value: ema! });
            }
            return result;
          }

          const ema9 = computeEMA(closes, 9);
          const ema21 = computeEMA(closes, 21);

          const ema9Series = chart.addLineSeries({ color: '#eab308', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          const ema21Series = chart.addLineSeries({ color: '#a855f7', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

          ema9Series.setData(ema9);
          ema21Series.setData(ema21);
        }

        // Historical signal markers (green ▲ for BUY, red ▼ for SELL)
        if (historicalSignals.length > 0) {
          const markers = historicalSignals
            .map((hs) => {
              const time = (new Date(hs.date).getTime() / 1000) as any;
              const isBuy = hs.signalType.includes('BUY');
              return {
                time,
                position: isBuy ? 'belowBar' as const : 'aboveBar' as const,
                color: isBuy ? CHART_COLORS.green : CHART_COLORS.red,
                shape: isBuy ? 'arrowUp' as const : 'arrowDown' as const,
                text: `${hs.signalType} ${hs.confidence}%`,
              };
            })
            .sort((a, b) => (a.time as number) - (b.time as number));

          candleSeries.setMarkers(markers);
        }

        // Price lines for current signal (entry, SL, targets)
        if (signal) {
          candleSeries.createPriceLine({
            price: signal.entryPrice,
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'Entry',
          });
          candleSeries.createPriceLine({
            price: signal.stopLoss,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'SL',
          });
          candleSeries.createPriceLine({
            price: signal.target1,
            color: '#22c55e',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'T1',
          });
          candleSeries.createPriceLine({
            price: signal.target2,
            color: '#22c55e',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'T2',
          });
        }

        chart.timeScale().fitContent();
      } catch (err) {
        console.error('Failed to load forecast chart:', err);
      }
    }

    loadData();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, period, interval, signal, historicalSignals]);

  return <div ref={chartContainerRef} className="w-full h-full min-h-[400px]" />;
}
