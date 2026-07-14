export type StockChartRange = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

export type StockTimeframe = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

export type StockChartPoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type StockChartResponse = {
  success: boolean;
  message?: string;
  data: StockChartPoint[];
};

export type StockListItem = {
  symbol: string;
  companyName: string | null;
  market: string | null;
  industry: string | null;
  sector: string | null;
  status: string | null;
  latestClosePrice: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
  lastUpdated: string | null;
  source: string | null;
  dataStatus: string | null;
};

export type StockListResponse = {
  success?: boolean;
  message?: string;
  data: StockListItem[];
  meta?: {
    total?: number;
    lastUpdated?: string;
    source?: string;
  };
};

export type PriceStats = {
  latestPrice: number | null;
  previousPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  avgVolume: number | null;
  lastUpdated: string | null;
};

export type TechnicalStats = {
  sma20: number | null;
  rsi14: number | null;
  volatility30d: number | null;
};

// ─── AI Analysis Types ───────────────────────────────────

export type AiProvider = "openai" | "gemini";
export type AiRiskProfile = "low" | "medium" | "high";
export type AiTimeHorizon = "short_term" | "medium_term" | "long_term";

export type AiReportOptions = {
  language: string;
  riskProfile: AiRiskProfile;
  timeHorizon: AiTimeHorizon;
  includeExternalResearch: boolean;
  capitalVnd: number;
  riskPerTradePct: number;
  maxPositionPct: number;
};

export type AnalyseOneRequest = {
  provider: AiProvider;
  model: string;
  symbol: string;
  scopeExchange: string;
  options: AiReportOptions;
};

export type JsonRecord = Record<string, unknown>;

export type AiReportProviderInfo = {
  name?: string;
  model?: string;
  status?: string;
  latency_ms?: number;
};

export type AiReportDataSource = {
  name?: string;
  type?: string;
  status?: string;
  detail?: string;
};

export type AiReportSummary = {
  symbol?: string;
  company?: string;
  scope_exchange?: string;
  disclaimer?: string;
  data_coverage?: JsonRecord;
  latest_market?: JsonRecord;
  price_history?: JsonRecord[];
  momentum?: JsonRecord;
  bctc_3q?: JsonRecord & { periods?: JsonRecord[] };
  financial_balance?: JsonRecord;
  company_overview?: JsonRecord;
  hose_market_context?: JsonRecord;
  industry_peer_context?: JsonRecord & { peers?: JsonRecord[] };
  market_general_context?: JsonRecord;
  same_industry_recommendation?: JsonRecord & { candidates?: JsonRecord[] };
  data_quality?: JsonRecord;
  scores?: JsonRecord;
  strengths?: string[];
  weaknesses?: string[];
  external_research_context?: JsonRecord & { items?: JsonRecord[] };
  system_decision?: JsonRecord;
  investment_plan?: JsonRecord;
  warnings?: string[];
  report_presentation?: JsonRecord;
};

export type AiReportData = {
  history_id?: string;
  history_status?: string;
  report_id?: string;
  report_status?: string;
  status?: string;
  analysis_status?: string;
  source_status?: string;
  generated_at?: string;
  symbol?: string;
  company?: string;
  scope_exchange?: string;
  language?: string;
  provider?: AiReportProviderInfo;
  data_sources?: AiReportDataSource[];
  summary?: AiReportSummary;
  warnings?: string[];
  report_presentation?: JsonRecord;
};

export type AnalyseOneResponse = {
  code?: number;
  message?: string;
  data?: AiReportData;
};
