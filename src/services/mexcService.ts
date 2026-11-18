import type { Candle, SignalDirection, TechnicalIndicators } from '../types/trading';

export const AVAILABLE_MEXC_PAIRS = [
  { code: 'BTCUSDT', name: 'Bitcoin (BTC/USDT)' },
  { code: 'ETHUSDT', name: 'Ethereum (ETH/USDT)' },
  { code: 'SOLUSDT', name: 'Solana (SOL/USDT)' },
  { code: 'XRPUSDT', name: 'Ripple (XRP/USDT)' }
];

export const AVAILABLE_INTERVALS = [
  { code: '1m', label: '1 minuto (Scalping rápido)', mexcCode: '1m' },
  { code: '5m', label: '5 minutos (Operación intradía)', mexcCode: '5m' },
  { code: '15m', label: '15 minutos (Tendencia corta)', mexcCode: '15m' },
  { code: '1h', label: '1 hora (Tendencia media)', mexcCode: '60m' },
  { code: '1d', label: '1 día (Tendencia diaria)', mexcCode: '1d' }
];

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
 * Calcula el RSI de 14 periodos usando el suavizado clásico de Wilder.
 */
export function computeRSI(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

/**
 * Calcula MACD (12, 26, 9).
 */
export function computeMACD(closes: number[]): {
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
} {
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
 * Descarga velas OHLCV reales en vivo desde la API pública de MEXC (/api/v3/klines).
 */
export async function fetchLiveMexcCandles(
  symbol: string,
  interval: string
): Promise<Candle[]> {
  const foundInterval = AVAILABLE_INTERVALS.find((i) => i.code === interval);
  const mexcInterval = foundInterval ? foundInterval.mexcCode : '5m';

  const res = await fetch(
    `/mexc-api/api/v3/klines?symbol=${symbol}&interval=${mexcInterval}&limit=60`
  );
  if (!res.ok) {
    throw new Error(`Error al consultar MEXC API (HTTP ${res.status})`);
  }
  const raw = await res.json();
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('MEXC API devolvió una lista de velas vacía.');
  }

  return raw.map((k: (string | number)[]) => ({
    timestamp: new Date(Number(k[0])).toISOString(),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5])
  }));
}

/**
 * Construye el análisis completo de mercado de MEXC con señales claras LONG / SHORT.
 */
export async function buildMarketSnapshot(
  symbol: string,
  interval: string
): Promise<{ candles: Candle[]; indicators: TechnicalIndicators }> {
  const pairInfo = AVAILABLE_MEXC_PAIRS.find((p) => p.code === symbol) ?? {
    code: symbol,
    name: symbol
  };
  const intervalInfo = AVAILABLE_INTERVALS.find((i) => i.code === interval) ?? {
    code: interval,
    label: interval,
    mexcCode: '5m'
  };

  const candles = await fetchLiveMexcCandles(symbol, interval);
  const closes = candles.map((c) => c.close);
  const ema10Series = computeEMA(closes, 10);
  const ema20Series = computeEMA(closes, 20);

  const lastPrice = closes[closes.length - 1];
  const firstPrice = closes[0];
  const decimals = lastPrice < 5 ? 4 : 2;

  const ema10 = Number(ema10Series[ema10Series.length - 1].toFixed(decimals));
  const ema20 = Number(ema20Series[ema20Series.length - 1].toFixed(decimals));
  const emaSpreadPct = Number((((ema10 - ema20) / ema20) * 100).toFixed(3));

  const rsi14 = computeRSI(closes, 14);
  const { macdLine, macdSignal, macdHistogram } = computeMACD(closes);

  // Interpretación clara del RSI
  let rsiStatus = 'Zona neutral (espacio libre para moverse)';
  if (rsi14 >= 70) rsiStatus = 'Sobrecompra (>70, cuidado con caída)';
  else if (rsi14 >= 55) rsiStatus = 'Fuerza alcista sana (55 a 70)';
  else if (rsi14 <= 30) rsiStatus = 'Sobreventa (<30, posible rebote)';
  else if (rsi14 <= 45) rsiStatus = 'Presión bajista activa (30 a 45)';

  // Interpretación clara del MACD
  const macdStatus =
    macdHistogram >= 0
      ? 'Histograma verde positivo (impulso alcista)'
      : 'Histograma rojo negativo (impulso bajista)';

  // Regla de decisión basada en el cruce EMA 10 (Amarilla) vs EMA 20 (Azul):
  // - Si EMA 10 está arriba de EMA 20 y no está sobrecomprado extremo -> LONG
  // - Si EMA 10 está abajo de EMA 20 y no está sobrevendido extremo -> SHORT
  let signal: SignalDirection = 'NEUTRAL';
  let signalReason = '';

  if (ema10 > ema20 && rsi14 < 75) {
    signal = 'LONG';
    signalReason = `La línea rápida EMA 10 (${ema10}) está POR ENCIMA de la línea lenta EMA 20 (${ema20}) y el RSI (${rsi14}) tiene espacio para subir.`;
  } else if (ema10 < ema20 && rsi14 > 25) {
    signal = 'SHORT';
    signalReason = `La línea rápida EMA 10 (${ema10}) está POR DEBAJO de la línea lenta EMA 20 (${ema20}) indicando tendencia hacia abajo.`;
  } else {
    signal = 'NEUTRAL';
    signalReason = `Las medias EMA 10 (${ema10}) y EMA 20 (${ema20}) están empatadas o el RSI (${rsi14}) está en zona extrema.`;
  }

  // Cálculo de distancia para Take Profit y Stop Loss según la temporalidad
  const riskFactors: Record<string, { tp: number; sl: number }> = {
    '1m': { tp: 0.002, sl: 0.0015 },
    '5m': { tp: 0.0035, sl: 0.0025 },
    '15m': { tp: 0.006, sl: 0.004 },
    '1h': { tp: 0.012, sl: 0.008 },
    '1d': { tp: 0.03, sl: 0.02 }
  };
  const factor = riskFactors[interval] ?? { tp: 0.0035, sl: 0.0025 };

  const tpDelta = lastPrice * factor.tp;
  const slDelta = lastPrice * factor.sl;

  const isShort = signal === 'SHORT';
  const suggestedTp = Number(
    (isShort ? lastPrice - tpDelta : lastPrice + tpDelta).toFixed(decimals)
  );
  const suggestedSl = Number(
    (isShort ? lastPrice + slDelta : lastPrice - slDelta).toFixed(decimals)
  );

  return {
    candles,
    indicators: {
      symbol,
      symbolName: pairInfo.name,
      interval,
      intervalLabel: intervalInfo.label,
      lastPrice,
      changePct: Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2)),
      ema10,
      ema20,
      emaSpreadPct,
      rsi14,
      rsiStatus,
      macdLine,
      macdSignal,
      macdHistogram,
      macdStatus,
      signal,
      signalReason,
      suggestedTp,
      suggestedSl,
      tpMovePct: Number((factor.tp * 100).toFixed(2)),
      slMovePct: Number((factor.sl * 100).toFixed(2)),
      updatedAt: new Date().toLocaleTimeString(),
      isLiveMexc: true
    }
  };
}
