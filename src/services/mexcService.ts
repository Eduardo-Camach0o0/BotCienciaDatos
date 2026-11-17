import type { Candle, MarketPlatform, SignalDirection, TechnicalIndicators } from '../types/trading';

/**
 * Calcula una Media Móvil Exponencial (EMA) de periodo N sobre los precios de cierre.
 */
export function computeEMA(closes: number[], period: number): number[] {
  if (closes.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

/**
 * Calcula el RSI de 14 periodos sobre la serie de cierres.
 */
export function computeRSI(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

/**
 * Calcula MACD (12, 26, 9) y devuelve línea MACD, Señal e Histograma.
 */
export function computeMACD(closes: number[]): { macdLine: number; macdSignal: number; macdHistogram: number } {
  if (closes.length < 26) {
    return { macdLine: 0, macdSignal: 0, macdHistogram: 0 };
  }
  const ema12 = computeEMA(closes, 12);
  const ema26 = computeEMA(closes, 26);
  const macdSeries = closes.map((_, idx) => ema12[idx] - ema26[idx]);
  const signalSeries = computeEMA(macdSeries, 9);
  const lastIdx = closes.length - 1;
  const macdLine = Number(macdSeries[lastIdx].toFixed(4));
  const macdSignal = Number(signalSeries[lastIdx].toFixed(4));
  const macdHistogram = Number((macdLine - macdSignal).toFixed(4));
  return { macdLine, macdSignal, macdHistogram };
}

/**
 * Genera velas recientes para MEXC o Polymarket y calcula los indicadores técnicos
 * de la estrategia EMA 10 (Amarilla) vs EMA 20 (Azul) + RSI + MACD.
 */
export function buildMarketSnapshot(
  symbol: string,
  platform: MarketPlatform,
  interval: string
): { candles: Candle[]; indicators: TechnicalIndicators } {
  const basePrices: Record<string, number> = {
    BTCUSDT: 80450,
    ETHUSDT: 2275,
    SOLUSDT: 100.4,
    XRPUSDT: 0.542,
    'POLY-FED-CUT': 0.68,
    'POLY-BTC-100K': 0.42
  };

  const base = basePrices[symbol] ?? 185.0;
  const volatility = base * 0.0022;
  const candles: Candle[] = [];
  let current = base * (1 - 0.004);
  const now = Date.now();

  for (let i = 40; i >= 0; i--) {
    const drift = (Math.sin(i / 4.5) + (Math.random() - 0.46)) * volatility;
    const open = Number(current.toFixed(base < 5 ? 4 : 2));
    const close = Number(Math.max(0.01, open + drift).toFixed(base < 5 ? 4 : 2));
    const high = Number((Math.max(open, close) + Math.abs(drift) * 0.65).toFixed(base < 5 ? 4 : 2));
    const low = Number((Math.min(open, close) - Math.abs(drift) * 0.55).toFixed(base < 5 ? 4 : 2));
    const volume = Math.round(12000 + Math.random() * 45000);
    candles.push({
      timestamp: new Date(now - i * 300000).toISOString(),
      open,
      high,
      low,
      close,
      volume
    });
    current = close;
  }

  const closes = candles.map((c) => c.close);
  const ema10Series = computeEMA(closes, 10);
  const ema20Series = computeEMA(closes, 20);
  const lastPrice = closes[closes.length - 1];
  const firstPrice = closes[0];
  const decimals = base < 5 ? 4 : 2;

  const ema10 = Number(ema10Series[ema10Series.length - 1].toFixed(decimals));
  const ema20 = Number(ema20Series[ema20Series.length - 1].toFixed(decimals));
  const rsi14 = computeRSI(closes, 14);
  const { macdLine, macdSignal, macdHistogram } = computeMACD(closes);

  let signal: SignalDirection = 'NEUTRAL';
  if (ema10 > ema20 && lastPrice >= ema10 && rsi14 < 70) {
    signal = 'LONG';
  } else if (ema10 < ema20 && lastPrice <= ema10 && rsi14 > 30) {
    signal = 'SHORT';
  }

  const tpDelta = lastPrice * 0.0035;
  const slDelta = lastPrice * 0.0025;
  const suggestedTp = Number(
    (signal === 'SHORT' ? lastPrice - tpDelta : lastPrice + tpDelta).toFixed(decimals)
  );
  const suggestedSl = Number(
    (signal === 'SHORT' ? lastPrice + slDelta : lastPrice - slDelta).toFixed(decimals)
  );

  return {
    candles,
    indicators: {
      symbol,
      platform,
      interval,
      lastPrice,
      change24hPct: Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2)),
      ema10,
      ema20,
      rsi14,
      macdLine,
      macdSignal,
      macdHistogram,
      signal,
      suggestedTp,
      suggestedSl,
      updatedAt: new Date().toLocaleTimeString()
    }
  };
}
