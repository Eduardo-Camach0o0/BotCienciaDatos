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
  symbolName: string;
  interval: string;
  intervalLabel: string;
  lastPrice: number;
  changePct: number;
  ema10: number;
  ema20: number;
  emaSpreadPct: number;
  rsi14: number;
  rsiStatus: string;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  macdStatus: string;
  signal: SignalDirection;
  signalReason: string;
  suggestedTp: number;
  suggestedSl: number;
  tpMovePct: number;
  slMovePct: number;
  updatedAt: string;
  isLiveMexc: boolean;
}

/**
 * Datos sanitizados que se envían al LLM Local (Ollama).
 * PROHIBIDO incluir llaves de API, tokens o credenciales.
 */
export interface SanitizedLlmMarketPayload {
  symbol: string;
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
  isOllamaConnected: boolean;
}
