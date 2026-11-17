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
 * Obtiene velas OHLCV reales desde la API PÚBLICA de MEXC (GET /api/v3/klines).
 * No requiere API Key: solo datos públicos de mercado.
 * Devuelve null si el símbolo no cotiza en MEXC o si no hay conexión.
 */
export async function fetchLiveMexcCandles(symbol: string, interval: string): Promise<Candle[] | null> {
  const mexcSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
  if (!mexcSymbols.includes(symbol)) return null;

  const intervalMap: Record<string, string> = { '5m': '5m', '15m': '15m', '1h': '60m', '1d': '1d' };
  const mexcInterval = intervalMap[interval] ?? '5m';

  try {
    const res = await fetch(`/mexc-api/api/v3/klines?symbol=${symbol}&interval=${mexcInterval}&limit=50`);
    if (!res.ok) return null;
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return raw.map((k: (string | number)[]) => ({
      timestamp: new Date(Number(k[0])).toISOString(),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5])
    }));
  } catch {
    return null;
  }
}

/**
 * Obtiene velas (API real de MEXC; si no hay conexión o el activo no cotiza en MEXC,
 * usa una serie simulada de respaldo) y calcula EMA 10 (Amarilla) vs EMA 20 (Azul) + RSI + MACD.
 */
export async function buildMarketSnapshot(
  symbol: string,
  platform: MarketPlatform,
  interval: string
): Promise<{ candles: Candle[]; indicators: TechnicalIndicators }> {
  const basePrices: Record<string, number> = {
    BTCUSDT: 80450,
    ETHUSDT: 2275,
    SOLUSDT: 100.4,
    XRPUSDT: 0.542,
    'POLY-FED-CUT': 0.68,
    'POLY-BTC-100K': 0.42
  };

  const base = basePrices[symbol] ?? 185.0;
  const liveCandles = platform === 'MEXC' ? await fetchLiveMexcCandles(symbol, interval) : null;
  const candles: Candle[] = liveCandles ?? [];

  const volatility = base * 0.0022;
  let current = base * (1 - 0.004);
  const now = Date.now();

  for (let i = 40; !liveCandles && i >= 0; i--) {
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
  const decimals = lastPrice < 5 ? 4 : 2;

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
