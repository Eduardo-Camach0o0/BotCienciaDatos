export type MarketPlatform = 'MEXC' | 'POLYMARKET';

export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  symbol: string;
  platform: MarketPlatform;
  interval: string;
  lastPrice: number;
  change24hPct: number;
  ema10: number;
  ema20: number;
  rsi14: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  signal: SignalDirection;
  suggestedTp: number;
  suggestedSl: number;
  updatedAt: string;
}

/**
 * Payload estrictamente sanitizado para el LLM Local.
 * PROHIBIDO incluir llaves de API, tokens, IDs de cuenta o firmas.
 */
export interface SanitizedLlmMarketPayload {
  symbol: string;
  platform: MarketPlatform;
  interval: string;
  lastPrice: number;
  ema10: number;
  ema20: number;
  rsi14: number;
  macdHistogram: number;
  technicalSignal: SignalDirection;
  suggestedTp: number;
  suggestedSl: number;
}

export interface LlmBotDecision {
  model: string;
  endpoint: string;
  timestamp: string;
  action: SignalDirection;
  confidencePct: number;
  reasoning: string;
  sanitizedPromptUsed: string;
  isLocalVerified: boolean;
}

export interface PortfolioCompany {
  ticker: string;
  nombre: string;
  sector: string;
  mercado: string;
}
