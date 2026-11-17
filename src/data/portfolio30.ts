import type { PortfolioCompany } from '../types/trading';

/**
 * Catálogo de 36 empresas de la base de datos SQLite (mercado_portafolio.sqlite)
 * clasificado en 6 sectores económicos.
 */
export const CATALOGO_36_EMPRESAS: PortfolioCompany[] = [
  // Tecnología (13)
  { ticker: 'AAPL', nombre: 'Apple Inc.', sector: 'Tecnología', mercado: 'NASDAQ' },
  { ticker: 'MSFT', nombre: 'Microsoft Corp.', sector: 'Tecnología', mercado: 'NASDAQ' },
  { ticker: 'GOOG', nombre: 'Alphabet Inc. (Google)', sector: 'Tecnología', mercado: 'NASDAQ' },
  { ticker: 'AMZN', nombre: 'Amazon.com Inc.', sector: 'Tecnología', mercado: 'NASDAQ' },
  { ticker: 'NVDA', nombre: 'NVIDIA Corporation', sector: 'Tecnología / Semiconductores', mercado: 'NASDAQ' },
  { ticker: 'TSLA', nombre: 'Tesla Inc.', sector: 'Tecnología / Automotriz', mercado: 'NASDAQ' },
  { ticker: 'META', nombre: 'Meta Platforms Inc.', sector: 'Tecnología', mercado: 'NASDAQ' },
  { ticker: 'INTC', nombre: 'Intel Corporation', sector: 'Tecnología', mercado: 'NASDAQ' },
  { ticker: 'IBM', nombre: 'IBM Corporation', sector: 'Tecnología', mercado: 'NYSE' },
  { ticker: 'NFLX', nombre: 'Netflix Inc.', sector: 'Tecnología / Medios', mercado: 'NASDAQ' },
  { ticker: 'ORCL', nombre: 'Oracle Corporation', sector: 'Tecnología', mercado: 'NYSE' },
  { ticker: 'CRM', nombre: 'Salesforce Inc.', sector: 'Tecnología', mercado: 'NYSE' },
  { ticker: 'CSCO', nombre: 'Cisco Systems Inc.', sector: 'Tecnología', mercado: 'NASDAQ' },
  // Financiero (4)
  { ticker: 'JPM', nombre: 'JPMorgan Chase & Co.', sector: 'Financiero', mercado: 'NYSE' },
  { ticker: 'BAC', nombre: 'Bank of America Corp.', sector: 'Financiero', mercado: 'NYSE' },
  { ticker: 'V', nombre: 'Visa Inc.', sector: 'Financiero', mercado: 'NYSE' },
  { ticker: 'MA', nombre: 'Mastercard Inc.', sector: 'Financiero', mercado: 'NYSE' },
  // Consumo & Retail (6)
  { ticker: 'PG', nombre: 'Procter & Gamble Co.', sector: 'Consumo', mercado: 'NYSE' },
  { ticker: 'DIS', nombre: 'The Walt Disney Company', sector: 'Consumo / Entretenimiento', mercado: 'NYSE' },
  { ticker: 'KO', nombre: 'The Coca-Cola Company', sector: 'Consumo', mercado: 'NYSE' },
  { ticker: 'PEP', nombre: 'PepsiCo Inc.', sector: 'Consumo', mercado: 'NASDAQ' },
  { ticker: 'HD', nombre: 'The Home Depot Inc.', sector: 'Retail', mercado: 'NYSE' },
  { ticker: 'SPG', nombre: 'Simon Property Group', sector: 'Inmobiliario / Retail', mercado: 'NYSE' },
  // Salud (5)
  { ticker: 'JNJ', nombre: 'Johnson & Johnson', sector: 'Salud', mercado: 'NYSE' },
  { ticker: 'PFE', nombre: 'Pfizer Inc.', sector: 'Salud', mercado: 'NYSE' },
  { ticker: 'LLY', nombre: 'Eli Lilly and Company', sector: 'Salud', mercado: 'NYSE' },
  { ticker: 'UNH', nombre: 'UnitedHealth Group Inc.', sector: 'Salud', mercado: 'NYSE' },
  { ticker: 'MRK', nombre: 'Merck & Co. Inc.', sector: 'Salud', mercado: 'NYSE' },
  // Energía e Industrial (5)
  { ticker: 'CVX', nombre: 'Chevron Corporation', sector: 'Energía', mercado: 'NYSE' },
  { ticker: 'XOM', nombre: 'Exxon Mobil Corp.', sector: 'Energía', mercado: 'NYSE' },
  { ticker: 'GE', nombre: 'General Electric Co.', sector: 'Industrial', mercado: 'NYSE' },
  { ticker: 'LMT', nombre: 'Lockheed Martin Corp.', sector: 'Industrial / Defensa', mercado: 'NYSE' },
  { ticker: 'DD', nombre: 'DuPont de Nemours Inc.', sector: 'Materiales', mercado: 'NYSE' },
  // Otros / Conglomerados & Benchmark (3)
  { ticker: 'BABA', nombre: 'Alibaba Group Holding', sector: 'E-Commerce / Tech', mercado: 'NYSE' },
  { ticker: 'BRK-B', nombre: 'Berkshire Hathaway Inc.', sector: 'Conglomerado', mercado: 'NYSE' },
  { ticker: 'SPY', nombre: 'SPDR S&P 500 ETF Trust', sector: 'Benchmark ETF', mercado: 'NYSEArca' }
];
