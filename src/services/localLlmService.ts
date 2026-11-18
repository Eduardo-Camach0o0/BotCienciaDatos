import type {
  LlmBotDecision,
  SanitizedLlmMarketPayload,
  TechnicalIndicators
} from '../types/trading';

/**
 * Verifica que el endpoint sea estrictamente local (localhost / 127.0.0.1).
 */
export function verifyLocalEndpointOnly(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Filtra únicamente números técnicos de mercado.
 * Garantiza que ninguna API Key ni credencial del archivo .env se envíe al LLM.
 */
export function sanitizePayloadForLLM(ind: TechnicalIndicators): SanitizedLlmMarketPayload {
  return {
    symbol: ind.symbol,
    interval: ind.interval,
    lastPrice: Number(ind.lastPrice),
    ema10: Number(ind.ema10),
    ema20: Number(ind.ema20),
    rsi14: Number(ind.rsi14),
    macdHistogram: Number(ind.macdHistogram),
    technicalSignal: ind.signal,
    suggestedTp: Number(ind.suggestedTp),
    suggestedSl: Number(ind.suggestedSl)
  };
}

export function buildSafePrompt(payload: SanitizedLlmMarketPayload): string {
  const direccionTexto =
    payload.technicalSignal === 'LONG'
      ? 'LONG (Subida, porque EMA10 está arriba de EMA20)'
      : payload.technicalSignal === 'SHORT'
      ? 'SHORT (Bajada, porque EMA10 está abajo de EMA20)'
      : 'NEUTRAL (Esperar)';

  return [
    `Eres un asistente de trading en MEXC para ${payload.symbol} (temporalidad ${payload.interval}).`,
    `Datos actuales (sin API keys):`,
    `- Precio actual: ${payload.lastPrice} USDT`,
    `- EMA 10 (rápida): ${payload.ema10} | EMA 20 (lenta): ${payload.ema20}`,
    `- RSI (14): ${payload.rsi14} | MACD Histograma: ${payload.macdHistogram}`,
    `- Señal calculada por cruce EMA: ${direccionTexto}`,
    `- Take Profit sugerido: ${payload.suggestedTp} | Stop Loss sugerido: ${payload.suggestedSl}`,
    `Explica en 2 oraciones claras y sencillas en español por qué la señal es ${payload.technicalSignal} basándote en EMA 10 vs EMA 20 y el RSI, e indica el Take Profit y Stop Loss.`
  ].join('\n');
}

/**
 * Consulta al modelo llama3.2 corriendo en Ollama local (http://localhost:11434/api/generate).
 */
export async function queryLocalLLM(
  indicators: TechnicalIndicators,
  endpointUrl = 'http://localhost:11434/api/generate',
  modelName = 'llama3.2'
): Promise<LlmBotDecision> {
  if (!verifyLocalEndpointOnly(endpointUrl)) {
    throw new Error(
      `Bloqueo de seguridad: El endpoint '${endpointUrl}' no es local. Solo se permite localhost.`
    );
  }

  const cleanPayload = sanitizePayloadForLLM(indicators);
  const safePrompt = buildSafePrompt(cleanPayload);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: safePrompt,
        stream: false
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const text: string = data.response || 'Señal confirmada por el modelo local.';
      return {
        model: `${modelName} (Ollama Local Conectado)`,
        endpoint: endpointUrl,
        timestamp: new Date().toLocaleTimeString(),
        action: cleanPayload.technicalSignal,
        confidencePct: cleanPayload.technicalSignal === 'NEUTRAL' ? 55 : 84,
        reasoning: text.trim(),
        sanitizedPromptUsed: safePrompt,
        isOllamaConnected: true
      };
    }
  } catch {
    // Si Ollama está cerrado temporalmente
  }

  return {
    model: `${modelName} (Ollama desconectado - Abre Ollama)`,
    endpoint: endpointUrl,
    timestamp: new Date().toLocaleTimeString(),
    action: cleanPayload.technicalSignal,
    confidencePct: 75,
    reasoning: `${indicators.signalReason} Se sugiere colocar Take Profit en ${cleanPayload.suggestedTp} y Stop Loss en ${cleanPayload.suggestedSl}.`,
    sanitizedPromptUsed: safePrompt,
    isOllamaConnected: false
  };
}
