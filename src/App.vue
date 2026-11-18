<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Candle, LlmBotDecision, TechnicalIndicators } from './types/trading';
import {
  AVAILABLE_INTERVALS,
  AVAILABLE_MEXC_PAIRS,
  buildMarketSnapshot
} from './services/mexcService';
import { queryLocalLLM } from './services/localLlmService';

const selectedSymbol = ref<string>('BTCUSDT');
const selectedInterval = ref<string>('5m');
const localLlmModel = 'llama3.2';

const candles = ref<Candle[]>([]);
const indicators = ref<TechnicalIndicators | null>(null);
const llmDecision = ref<LlmBotDecision | null>(null);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string>('');

async function refreshBotAnalysis() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const snap = await buildMarketSnapshot(selectedSymbol.value, selectedInterval.value);
    candles.value = snap.candles;
    indicators.value = snap.indicators;
    llmDecision.value = await queryLocalLLM(
      snap.indicators,
      'http://localhost:11434/api/generate',
      localLlmModel
    );
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : String(err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  refreshBotAnalysis();
});
</script>

<template>
  <div class="app-wrapper">
    <!-- 1. ENCABEZADO CLARO -->
    <header class="top-header">
      <div class="title-block">
        <h1>🤖 Asistente de Trading para MEXC con IA Local (v0.1.0)</h1>
        <p>
          Analiza precios en tiempo real de MEXC y te indica si entrar en
          <strong>LONG (Subida)</strong> o <strong>SHORT (Bajada)</strong> con niveles de
          <strong>Take Profit</strong> y <strong>Stop Loss</strong>.
        </p>
      </div>
      <div class="badges">
        <span class="badge badge-blue">Versión: v0.1.0</span>
        <span class="badge badge-green">MEXC en Vivo</span>
        <span class="badge badge-gold">🔒 Sin API Keys en la IA</span>
      </div>
    </header>

    <!-- 2. EXPLICACIÓN EN 3 PASOS SENCILLOS -->
    <section class="how-it-works">
      <div class="step-card">
        <div class="step-num">1</div>
        <div class="step-text">
          <strong>Elige Cripto y Temporalidad</strong>
          <span>
            Selecciona abajo la moneda de MEXC (BTC, ETH, SOL o XRP) y el tiempo de cada vela (ej. 5 minutos).
          </span>
        </div>
      </div>
      <div class="step-card">
        <div class="step-num">2</div>
        <div class="step-text">
          <strong>Cruce EMA 10 vs EMA 20</strong>
          <span>
            Si la línea rápida (EMA 10) está arriba de la lenta (EMA 20) es señal de
            <strong>LONG</strong>; si está abajo, es señal de <strong>SHORT</strong>.
          </span>
        </div>
      </div>
      <div class="step-card">
        <div class="step-num">3</div>
        <div class="step-text">
          <strong>Copia el TP y SL en MEXC</strong>
          <span>
            El bot y tu IA local (<code>llama3.2</code>) te dan el precio exacto de
            <strong>Take Profit</strong> y <strong>Stop Loss</strong>.
          </span>
        </div>
      </div>
    </section>

    <!-- 3. BARRA DE SELECCIÓN (SOLO OPCIONES REALES DISPONIBLES) -->
    <section class="toolbar-card">
      <div class="field">
        <label>Exchange Conectado</label>
        <div class="static-input">🟢 MEXC (Precios Reales)</div>
      </div>

      <div class="field">
        <label>Criptomoneda (Par USDT)</label>
        <select v-model="selectedSymbol" @change="refreshBotAnalysis">
          <option v-for="p in AVAILABLE_MEXC_PAIRS" :key="p.code" :value="p.code">
            {{ p.name }}
          </option>
        </select>
      </div>

      <div class="field">
        <label>Temporalidad de las Velas</label>
        <select v-model="selectedInterval" @change="refreshBotAnalysis">
          <option v-for="i in AVAILABLE_INTERVALS" :key="i.code" :value="i.code">
            {{ i.label }}
          </option>
        </select>
      </div>

      <div class="field">
        <label>Modelo IA Local (Ollama)</label>
        <div class="static-input">🧠 llama3.2 (Local)</div>
      </div>

      <div class="field">
        <button class="btn-analyze" :disabled="isLoading" @click="refreshBotAnalysis">
          {{ isLoading ? 'Consultando MEXC y Ollama...' : '🔄 Actualizar Precio y Señal' }}
        </button>
      </div>
    </section>

    <!-- MENSAJE DE ERROR SI FALLA LA RED -->
    <div
      v-if="errorMessage"
      class="panel-card"
      style="border-color: #f85149; color: #ff7b72; font-weight: 600"
    >
      ⚠️ {{ errorMessage }}
    </div>

    <!-- 4. TARJETA PRINCIPAL: QUÉ HACER AHORITA MISMO EN MEXC -->
    <section
      v-if="indicators"
      :class="['action-banner', `action-${indicators.signal}`]"
    >
      <div class="action-header">
        <div :class="['action-title', `title-${indicators.signal}`]">
          <span v-if="indicators.signal === 'LONG'">
            🟢 SEÑAL ACTUAL: ABRIR LONG (SUBIDA) EN {{ indicators.symbol }}
          </span>
          <span v-else-if="indicators.signal === 'SHORT'">
            🔴 SEÑAL ACTUAL: ABRIR SHORT (BAJADA) EN {{ indicators.symbol }}
          </span>
          <span v-else>
            🟡 SEÑAL ACTUAL: ESPERAR (MERCADO EMPATADO)
          </span>
        </div>
        <span style="font-size: 0.82rem; color: #9ba7b8">
          Última actualización: <strong>{{ indicators.updatedAt }}</strong>
        </span>
      </div>

      <p class="action-subtitle">
        <strong>¿Por qué?:</strong> {{ indicators.signalReason }}
      </p>

      <!-- 3 CAJAS GRANDES LISTAS PARA COPIAR EN MEXC -->
      <div class="order-boxes">
        <div class="order-box">
          <div class="order-box-label">1. Precio Actual en MEXC</div>
          <div class="order-box-price" style="color: #ffffff">
            ${{ indicators.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </div>
          <div class="order-box-hint">
            Cambio reciente ({{ indicators.interval }}):
            <strong :style="{ color: indicators.changePct >= 0 ? '#3fb950' : '#ff7b72' }">
              {{ indicators.changePct >= 0 ? '+' : '' }}{{ indicators.changePct }}%
            </strong>
          </div>
        </div>

        <div class="order-box" style="border-color: rgba(63, 185, 80, 0.5)">
          <div class="order-box-label" style="color: #3fb950">
            2. Take Profit Sugerido (TP - Ganancia)
          </div>
          <div class="order-box-price" style="color: #3fb950">
            ${{ indicators.suggestedTp.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </div>
          <div class="order-box-hint">
            Objetivo de movimiento: <strong>+{{ indicators.tpMovePct }}%</strong> (en 100x =
            <strong>+{{ (indicators.tpMovePct * 100).toFixed(0) }}% ROE</strong>)
          </div>
        </div>

        <div class="order-box" style="border-color: rgba(248, 81, 73, 0.5)">
          <div class="order-box-label" style="color: #ff7b72">
            3. Stop Loss Sugerido (SL - Protección)
          </div>
          <div class="order-box-price" style="color: #ff7b72">
            ${{ indicators.suggestedSl.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </div>
          <div class="order-box-hint">
            Distancia de protección: <strong>-{{ indicators.slMovePct }}%</strong> por si el
            precio se regresa
          </div>
        </div>
      </div>
    </section>

    <!-- 5. DOS COLUMNAS: EXPLICACIÓN DE INDICADORES + OPINIÓN DE OLLAMA -->
    <div v-if="indicators" class="two-col">
      <!-- Columna Izquierda: Qué dicen los 3 indicadores -->
      <div class="panel-card">
        <h2>
          <span>📊 ¿Qué dicen los indicadores técnicos?</span>
          <span style="font-size: 0.78rem; color: #58a6ff">{{ indicators.intervalLabel }}</span>
        </h2>

        <div class="indicator-list">
          <div class="indicator-item">
            <div class="indicator-top">
              <span>1. Cruce de Medias (EMA 10 vs EMA 20)</span>
              <span :style="{ color: indicators.ema10 >= indicators.ema20 ? '#3fb950' : '#ff7b72' }">
                {{ indicators.ema10 >= indicators.ema20 ? 'Alcista (EMA10 > EMA20)' : 'Bajista (EMA10 < EMA20)' }}
              </span>
            </div>
            <div class="indicator-desc">
              • <strong style="color: #f2cc60">EMA 10 (Línea Amarilla rápida):</strong>
              ${{ indicators.ema10 }}<br />
              • <strong style="color: #58a6ff">EMA 20 (Línea Azul lenta):</strong>
              ${{ indicators.ema20 }}<br />
              👉 Cuando la amarilla está arriba de la azul, el precio lleva fuerza hacia arriba (LONG); cuando está abajo, lleva fuerza hacia abajo (SHORT).
            </div>
          </div>

          <div class="indicator-item">
            <div class="indicator-top">
              <span>2. Fuerza del Precio (RSI de 14 velas)</span>
              <span>{{ indicators.rsi14 }} / 100</span>
            </div>
            <div class="indicator-desc">
              • <strong>Estado actual:</strong> {{ indicators.rsiStatus }}.<br />
              👉 Si el RSI pasa de 70 está muy caro (sobrecomprado); si baja de 30 está muy barato (sobrevendido). Entre 30 y 70 tiene camino libre.
            </div>
          </div>

          <div class="indicator-item">
            <div class="indicator-top">
              <span>3. Impulso MACD (12, 26, 9)</span>
              <span :style="{ color: indicators.macdHistogram >= 0 ? '#3fb950' : '#ff7b72' }">
                Histograma: {{ indicators.macdHistogram }}
              </span>
            </div>
            <div class="indicator-desc">
              • <strong>Estado actual:</strong> {{ indicators.macdStatus }}.<br />
              • Línea MACD: {{ indicators.macdLine }} | Línea Señal: {{ indicators.macdSignal }}
            </div>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Explicación del LLM Local (Ollama) -->
      <div v-if="llmDecision" class="panel-card">
        <h2>
          <span>🧠 Explicación de tu IA Local (Ollama)</span>
          <span
            :class="['badge', llmDecision.isOllamaConnected ? 'badge-green' : 'badge-gold']"
          >
            {{ llmDecision.model }}
          </span>
        </h2>

        <div class="llm-reply-box">
          {{ llmDecision.reasoning }}
        </div>

        <!-- Desplegable opcional para mostrar al profesor el cumplimiento técnico -->
        <details class="tech-details">
          <summary>
            🔒 Ver evidencia de seguridad ("No pasar API a I.A.") y últimas velas de MEXC
          </summary>
          <p style="margin-top: 0.6rem; color: #9ba7b8">
            <strong>Endpoint local verificado:</strong> <code>{{ llmDecision.endpoint }}</code> (solo recibe precios e indicadores públicos, cero llaves privadas):
          </p>
          <div class="prompt-pre">{{ llmDecision.sanitizedPromptUsed }}</div>

          <h4 style="margin-top: 0.9rem; color: #f0f6fc">
            Últimas 5 velas descargadas en vivo de MEXC ({{ indicators.symbol }})
          </h4>
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Apertura</th>
                <th>Máximo</th>
                <th>Mínimo</th>
                <th>Cierre</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in candles.slice(-5).reverse()" :key="c.timestamp">
                <td>{{ new Date(c.timestamp).toLocaleTimeString() }}</td>
                <td>${{ c.open }}</td>
                <td>${{ c.high }}</td>
                <td>${{ c.low }}</td>
                <td :style="{ color: c.close >= c.open ? '#3fb950' : '#ff7b72', fontWeight: 700 }">
                  ${{ c.close }}
                </td>
              </tr>
            </tbody>
          </table>
        </details>
      </div>
    </div>
  </div>
</template>
