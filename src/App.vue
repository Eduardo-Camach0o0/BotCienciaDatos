<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type {
  Candle,
  LlmBotDecision,
  MarketPlatform,
  TechnicalIndicators
} from './types/trading';
import { buildMarketSnapshot } from './services/mexcService';
import { queryLocalLLM } from './services/localLlmService';
import { CATALOGO_36_EMPRESAS } from './data/portfolio30';

const platform = ref<MarketPlatform>('MEXC');
const selectedSymbol = ref<string>('BTCUSDT');
const interval = ref<string>('5m');
const localLlmEndpoint = ref<string>('http://localhost:11434/api/generate');
const localLlmModel = ref<string>('llama3.2');
const sectorFilter = ref<string>('Todos');

const candles = ref<Candle[]>([]);
const indicators = ref<TechnicalIndicators | null>(null);
const llmDecision = ref<LlmBotDecision | null>(null);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string>('');

const availableSymbols = computed(() => {
  if (platform.value === 'MEXC') {
    return [
      { code: 'BTCUSDT', label: 'BTCUSDT Perpetual (MEXC)' },
      { code: 'ETHUSDT', label: 'ETHUSDT Perpetual (MEXC)' },
      { code: 'SOLUSDT', label: 'SOLUSDT Perpetual (MEXC)' },
      { code: 'XRPUSDT', label: 'XRPUSDT Perpetual (MEXC)' },
      ...CATALOGO_36_EMPRESAS.slice(0, 6).map((c) => ({
        code: c.ticker,
        label: `${c.ticker} - ${c.nombre} (SQLite)`
      }))
    ];
  }
  return [
    { code: 'POLY-FED-CUT', label: 'Polymarket: Fed Rate Cut Decision' },
    { code: 'POLY-BTC-100K', label: 'Polymarket: BTC > $100k EOY' }
  ];
});

const filteredPortfolio = computed(() => {
  if (sectorFilter.value === 'Todos') return CATALOGO_36_EMPRESAS;
  return CATALOGO_36_EMPRESAS.filter((c) => c.sector.includes(sectorFilter.value));
});

async function refreshBotAnalysis() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const snap = await buildMarketSnapshot(selectedSymbol.value, platform.value, interval.value);
    candles.value = snap.candles;
    indicators.value = snap.indicators;
    llmDecision.value = await queryLocalLLM(
      snap.indicators,
      localLlmEndpoint.value,
      localLlmModel.value
    );
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : String(err);
  } finally {
    isLoading.value = false;
  }
}

function handlePlatformChange() {
  selectedSymbol.value = availableSymbols.value[0].code;
  refreshBotAnalysis();
}

onMounted(() => {
  refreshBotAnalysis();
});
</script>

<template>
  <div class="container">
    <!-- ENCABEZADO CON VERSIÓN v0.1.0 Y CUMPLIMIENTO DE REQUISITOS -->
    <header class="header-bar">
      <div>
        <h1 style="font-size: 1.35rem; font-weight: 800">
          🤖 Bot de Trading Algorítmico — Entrega <span style="color: #58a6ff">v0.1.0</span>
        </h1>
        <p style="font-size: 0.84rem; color: #8b949e; margin-top: 0.2rem">
          UI en Vue 3 + Vite + TypeScript | Opciones: MEXC &amp; Polymarket | Catálogo SQLite 36 Empresas
        </p>
      </div>
      <div class="badge-row">
        <span class="badge badge-version">Versión: v0.1.0</span>
        <span class="badge badge-llm">IA: Solo Consume LLM Local (Ollama)</span>
        <span class="badge badge-sec">🔒 Indispensable: Cero API Keys enviadas a IA</span>
      </div>
    </header>

    <!-- BARRA DE CONFIGURACIÓN DEL BOT -->
    <section class="controls-grid">
      <div class="control-group">
        <label>Plataforma / Mercado</label>
        <select v-model="platform" @change="handlePlatformChange">
          <option value="MEXC">MEXC (Futures &amp; Spot)</option>
          <option value="POLYMARKET">Polymarket (Predicción)</option>
        </select>
      </div>

      <div class="control-group">
        <label>Activo / Contrato</label>
        <select v-model="selectedSymbol" @change="refreshBotAnalysis">
          <option v-for="item in availableSymbols" :key="item.code" :value="item.code">
            {{ item.label }}
          </option>
        </select>
      </div>

      <div class="control-group">
        <label>Temporalidad (Intervalo)</label>
        <select v-model="interval" @change="refreshBotAnalysis">
          <option value="5m">5 minutos (5m)</option>
          <option value="15m">15 minutos (15m)</option>
          <option value="1h">1 hora (1h - SQLite)</option>
          <option value="1d">1 día (1d)</option>
        </select>
      </div>

      <div class="control-group">
        <label>Modelo LLM Local (Ollama)</label>
        <select v-model="localLlmModel" @change="refreshBotAnalysis">
          <option value="llama3.2">llama3.2 (Local)</option>
          <option value="qwen2.5">qwen2.5 (Local)</option>
          <option value="deepseek-r1">deepseek-r1 (Local)</option>
        </select>
      </div>

      <div class="control-group" style="justify-content: flex-end">
        <label>&nbsp;</label>
        <button class="btn-primary" :disabled="isLoading" @click="refreshBotAnalysis">
          {{ isLoading ? 'Analizando con LLM Local...' : '⚡ Actualizar Señal y Consultar LLM Local' }}
        </button>
      </div>
    </section>

    <div v-if="errorMessage" class="card" style="border-color: #f85149; margin-bottom: 1rem; color: #ff7b72">
      ⚠️ {{ errorMessage }}
    </div>

    <!-- PANEL PRINCIPAL: INDICADORES MEXC + DECISIÓN DEL LLM LOCAL -->
    <div v-if="indicators" class="dashboard-grid">
      <!-- Tarjeta Izquierda: Telemetría de Mercado e Indicadores -->
      <div class="card">
        <h2>
          <span>📈 Telemetría {{ indicators.platform }}: {{ indicators.symbol }} ({{ indicators.interval }})</span>
          <span :class="['signal-pill', `sig-${indicators.signal}`]">
            Señal: {{ indicators.signal }}
          </span>
        </h2>

        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">Precio Actual</div>
            <div class="kpi-val">{{ indicators.lastPrice }}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label" style="color: #f2cc60">EMA 10 (Rápida)</div>
            <div class="kpi-val" style="color: #f2cc60">{{ indicators.ema10 }}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label" style="color: #58a6ff">EMA 20 (Lenta)</div>
            <div class="kpi-val" style="color: #58a6ff">{{ indicators.ema20 }}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">RSI (14)</div>
            <div class="kpi-val">{{ indicators.rsi14 }}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">MACD Hist.</div>
            <div class="kpi-val" :style="{ color: indicators.macdHistogram >= 0 ? '#3fb950' : '#ff7b72' }">
              {{ indicators.macdHistogram }}
            </div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label" style="color: #3fb950">Take Profit (TP)</div>
            <div class="kpi-val" style="color: #3fb950">{{ indicators.suggestedTp }}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label" style="color: #ff7b72">Stop Loss (SL)</div>
            <div class="kpi-val" style="color: #ff7b72">{{ indicators.suggestedSl }}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Actualizado</div>
            <div class="kpi-val" style="font-size: 0.95rem">{{ indicators.updatedAt }}</div>
          </div>
        </div>

        <h3 style="font-size: 0.88rem; color: #8b949e; margin-bottom: 0.5rem">
          Últimas Velas OHLCV ({{ indicators.symbol }})
        </h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hora (UTC)</th>
                <th>Open</th>
                <th>High</th>
                <th>Low</th>
                <th>Close</th>
                <th>Volumen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in candles.slice(-8).reverse()" :key="c.timestamp">
                <td>{{ c.timestamp.slice(11, 19) }}</td>
                <td>{{ c.open }}</td>
                <td>{{ c.high }}</td>
                <td>{{ c.low }}</td>
                <td :style="{ color: c.close >= c.open ? '#3fb950' : '#ff7b72', fontWeight: 600 }">
                  {{ c.close }}
                </td>
                <td>{{ c.volume.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tarjeta Derecha: Dictamen del LLM Local y Auditoría Zero-API-Leak -->
      <div v-if="llmDecision" class="card">
        <h2>
          <span>🧠 Dictamen del LLM Local</span>
          <span class="badge badge-llm">Confianza: {{ llmDecision.confidencePct }}%</span>
        </h2>

        <p style="font-size: 0.82rem; color: #8b949e; margin-bottom: 0.6rem">
          <strong>Endpoint Local:</strong> <code>{{ llmDecision.endpoint }}</code> |
          <strong>Modelo:</strong> <code>{{ llmDecision.model }}</code>
        </p>

        <div
          style="
            background: #0d1117;
            border-left: 4px solid #58a6ff;
            padding: 0.85rem;
            border-radius: 6px;
            font-size: 0.92rem;
            line-height: 1.45;
          "
        >
          {{ llmDecision.reasoning }}
        </div>

        <div style="margin-top: 1rem">
          <div style="font-size: 0.8rem; color: #e3b341; font-weight: 600">
            🔒 Auditoría de Seguridad ("No pasar API a I.A."): Prompt Sanitizado Enviado al LLM Local
          </div>
          <div class="prompt-box">{{ llmDecision.sanitizedPromptUsed }}</div>
        </div>
      </div>
    </div>

    <!-- SECCIÓN INFERIOR: CATÁLOGO DE 36 EMPRESAS (CONECTADO A TU BASE SQLITE) -->
    <section class="card">
      <h2>
        <span>🏦 Portafolio Histórico Integrado (36 Empresas en SQLite — `mercado_portafolio.sqlite`)</span>
        <select v-model="sectorFilter" style="font-size: 0.82rem; padding: 0.35rem 0.6rem">
          <option value="Todos">Todos los sectores (36)</option>
          <option value="Tecnología">Tecnología (13)</option>
          <option value="Financiero">Financiero (4)</option>
          <option value="Consumo">Consumo y Retail (6)</option>
          <option value="Salud">Salud (5)</option>
          <option value="Energía">Energía e Industrial (5)</option>
        </select>
      </h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Ticker</th>
              <th>Empresa</th>
              <th>Sector</th>
              <th>Mercado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(emp, idx) in filteredPortfolio" :key="emp.ticker">
              <td>{{ idx + 1 }}</td>
              <td style="font-weight: 700; color: #58a6ff">{{ emp.ticker }}</td>
              <td>{{ emp.nombre }}</td>
              <td>{{ emp.sector }}</td>
              <td>{{ emp.mercado }}</td>
              <td>
                <button
                  style="padding: 0.25rem 0.6rem; font-size: 0.78rem; cursor: pointer"
                  @click="
                    platform = 'MEXC';
                    selectedSymbol = emp.ticker;
                    refreshBotAnalysis();
                  "
                >
                  Analizar en Bot
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
