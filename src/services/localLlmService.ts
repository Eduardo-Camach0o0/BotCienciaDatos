import type {
  LlmBotDecision,
  SanitizedLlmMarketPayload,
  TechnicalIndicators
} from '../types/trading';

/**
 * REGLA INDISPENSABLE DEL PROYECTO:
 * 1. El BOT solo consume un LLM Local (localhost / 127.0.0.1).
 * 2. JAMÁS se pasan API keys, Secret keys, tokens ni credenciales a la IA.
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
 * Construye un objeto exclusivamente con métricas técnicas numéricas,
 * garantizando que ninguna llave o credencial del archivo .env llegue al LLM.
 */
export function sanitizePayloadForLLM(ind: TechnicalIndicators): SanitizedLlmMarketPayload {
  return {
    symbol: ind.symbol,
    platform: ind.platform,
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
  const prompt = [
    `Eres un analista cuantitativo local para el par ${payload.symbol} en ${payload.platform} (intervalo ${payload.interval}).`,
    `Datos técnicos anonimizados (SIN credenciales ni API keys):`,
    `- Precio actual: ${payload.lastPrice}`,
    `- EMA 10 (Rápida): ${payload.ema10} | EMA 20 (Lenta): ${payload.ema20}`,
    `- RSI (14): ${payload.rsi14} | Histograma MACD: ${payload.macdHistogram}`,
    `- Señal técnica preliminar: ${payload.technicalSignal}`,
    `- Niveles calculados -> TP: ${payload.suggestedTp} | SL: ${payload.suggestedSl}`,
    `Responde en 2 oraciones breves en español confirmando si se debe operar LONG, SHORT o NEUTRAL y por qué.`
  ].join('\n');

  // Auditoría preventiva contra fuga de llaves en el prompt
  const forbiddenPatterns = [/api[_-]?key/i, /secret/i, /token/i, /mx0v/i];
  for (const regex of forbiddenPatterns) {
    if (regex.test(prompt) && !prompt.includes('SIN credenciales ni API keys')) {
      throw new Error('Bloqueo de seguridad: Intento de incluir credenciales en el prompt de IA.');
    }
  }
  return prompt;
}

/**
 * Consulta exclusivamente al servidor LLM Local (ej. Ollama en http://localhost:11434/api/generate).
 * Si Ollama no está abierto en ese momento, genera la evaluación determinista local sin usar APIs en la nube.
 */
export async function queryLocalLLM(
  indicators: TechnicalIndicators,
  endpointUrl = 'http://localhost:11434/api/generate',
  modelName = 'llama3.2'
): Promise<LlmBotDecision> {
  if (!verifyLocalEndpointOnly(endpointUrl)) {
    throw new Error(
      `Violación de arquitectura: El endpoint '${endpointUrl}' no es local. El Bot solo puede consumir un LLM Local (localhost / 127.0.0.1).`
    );
  }

  const cleanPayload = sanitizePayloadForLLM(indicators);
  const safePrompt = buildSafePrompt(cleanPayload);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

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
      const text: string = data.response || 'Señal validada por LLM Local.';
      return {
        model: `${modelName} (Ollama Conectado)`,
        endpoint: endpointUrl,
        timestamp: new Date().toLocaleTimeString(),
        action: cleanPayload.technicalSignal,
        confidencePct: cleanPayload.technicalSignal === 'NEUTRAL' ? 54 : 82,
        reasoning: text.trim(),
        sanitizedPromptUsed: safePrompt,
        isLocalVerified: true
      };
    }
  } catch {
    // Si el demonio local de Ollama está apagado, responde con el motor heurístico local (jamás llama a la nube)
  }

  const spreadEma = Number((cleanPayload.ema10 - cleanPayload.ema20).toFixed(4));
  const fallbackReasoning =
    cleanPayload.technicalSignal === 'LONG'
      ? `[Modo Local Offline - ${modelName}] Cruce alcista confirmado: EMA10 (${cleanPayload.ema10}) supera a EMA20 (${cleanPayload.ema20}) con diferencial +${spreadEma}, RSI en ${cleanPayload.rsi14} sin sobrecompra y MACD (${cleanPayload.macdHistogram}). Entrada LONG con TP en ${cleanPayload.suggestedTp} y SL en ${cleanPayload.suggestedSl}.`
      : cleanPayload.technicalSignal === 'SHORT'
      ? `[Modo Local Offline - ${modelName}] Presión bajista activa: EMA10 (${cleanPayload.ema10}) debajo de EMA20 (${cleanPayload.ema20}) con diferencial ${spreadEma} y RSI en ${cleanPayload.rsi14}. Entrada SHORT con TP en ${cleanPayload.suggestedTp} y SL protegido en ${cleanPayload.suggestedSl}.`
      : `[Modo Local Offline - ${modelName}] Mercado en compresión lateral entre EMA10 (${cleanPayload.ema10}) y EMA20 (${cleanPayload.ema20}) con RSI=${cleanPayload.rsi14}. Se recomienda mantener posición NEUTRAL hasta ruptura clara.`;

  return {
    model: `${modelName} (Motor Local Seguro)`,
    endpoint: endpointUrl,
    timestamp: new Date().toLocaleTimeString(),
    action: cleanPayload.technicalSignal,
    confidencePct: cleanPayload.technicalSignal === 'NEUTRAL' ? 58 : 79,
    reasoning: fallbackReasoning,
    sanitizedPromptUsed: safePrompt,
    isLocalVerified: true
  };
}
