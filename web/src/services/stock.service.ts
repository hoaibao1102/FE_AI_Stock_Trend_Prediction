import { authenticatedRequest } from "@/services/auth.service"

export type StockChartRange = "7d" | "1m" | "3m" | "1y" | "all"

export type StockCandle = {
    time: string
    open: number
    high: number
    low: number
    close: number
    volume: number
    sma?: number
    ema?: number
    rsi?: number
    macd?: number
    bollingerUpper?: number
    bollingerLower?: number
}

export type StockChartMeta = {
    symbol?: string
    companyName?: string
    exchange?: string
    sector?: string
    source?: string
    verified?: boolean
    completeness?: number | string
    lastCrawl?: string
    apiStatus?: string
    marketStatus?: string
}

export type StockChartResult = {
    candles: StockCandle[]
    meta: StockChartMeta
}

export type StockListQuery = {
    page: number
    limit: number
    market: string
}

export type StockItem = {
    symbol: string
    companyName?: string
    market?: string
    industry?: string
    sector?: string
    status?: string
    latestClosePrice?: number
    change?: number
    changePercent?: number
    volume?: number
    marketCap?: number
    lastUpdated?: string
    source?: string
    dataStatus?: string
}

export type StockListMeta = {
    total?: number
    lastUpdated?: string
    source?: string
}

export type StockListResult = {
    items: StockItem[]
    meta: StockListMeta
}

type StockChartResponse = {
    success?: boolean
    message?: string
    data?: unknown
    chart?: unknown
    meta?: StockChartMeta
    stock?: StockChartMeta
    summary?: StockChartMeta
}

type StockListResponse = {
    success?: boolean
    message?: string
    data?: unknown
    items?: unknown
    stocks?: unknown
    total?: number
    pagination?: {
        total?: number
    }
    meta?: {
        total?: number
        lastUpdated?: string
        source?: string
    }
    source?: string
    lastUpdated?: string
    page?: number
    limit?: number
    total_items?: number
    total_pages?: number
}

const DATE_KEYS = ["time", "date", "datetime", "timestamp", "tradingDate", "trading_date"]

function firstValue(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key]
        if (value !== undefined && value !== null && value !== "") return value
    }
    return undefined
}

function toNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
        const normalized = Number(value.replace(/,/g, ""))
        if (Number.isFinite(normalized)) return normalized
    }
    return undefined
}

function toDateLabel(value: unknown): string | undefined {
    if (typeof value === "number") {
        const date = new Date(value > 10_000_000_000 ? value : value * 1000)
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10)
    }

    if (typeof value === "string" && value.trim()) {
        const raw = value.trim()
        const date = new Date(raw)
        return Number.isNaN(date.getTime()) ? raw : date.toISOString().slice(0, 10)
    }

    return undefined
}

function toText(value: unknown): string | undefined {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    return undefined
}

function arrayFromPayload(payload: StockChartResponse | unknown): unknown[] {
    if (Array.isArray(payload)) return payload
    if (!payload || typeof payload !== "object") return []

    const response = payload as StockChartResponse
    if (Array.isArray(response.data)) return response.data
    if (Array.isArray(response.chart)) return response.chart

    if (response.data && typeof response.data === "object") {
        const data = response.data as StockChartResponse
        if (Array.isArray(data.data)) return data.data
        if (Array.isArray(data.chart)) return data.chart
    }

    return []
}

function stockListArrayFromPayload(payload: StockListResponse | unknown): unknown[] {
    if (Array.isArray(payload)) return payload
    if (!payload || typeof payload !== "object") return []

    const response = payload as StockListResponse
    if (Array.isArray(response.data)) return response.data
    if (Array.isArray(response.items)) return response.items
    if (Array.isArray(response.stocks)) return response.stocks

    if (response.data && typeof response.data === "object") {
        const data = response.data as StockListResponse
        if (Array.isArray(data.data)) return data.data
        if (Array.isArray(data.items)) return data.items
        if (Array.isArray(data.stocks)) return data.stocks
    }

    return []
}

function metaFromPayload(payload: StockChartResponse | unknown): StockChartMeta {
    if (!payload || typeof payload !== "object") return {}

    const response = payload as StockChartResponse
    const data = response.data && typeof response.data === "object" && !Array.isArray(response.data)
        ? (response.data as StockChartResponse)
        : {}

    return {
        ...response.meta,
        ...response.stock,
        ...response.summary,
        ...data.meta,
        ...data.stock,
        ...data.summary,
    }
}

function stockListMetaFromPayload(payload: StockListResponse | unknown): StockListMeta {
    if (!payload || typeof payload !== "object") return {}

    const response = payload as StockListResponse
    const data = response.data && typeof response.data === "object" && !Array.isArray(response.data)
        ? (response.data as StockListResponse)
        : {}

    return {
        total: response.meta?.total
            ?? response.total
            ?? response.total_items
            ?? response.pagination?.total
            ?? (response.pagination as { total_items?: number } | undefined)?.total_items
            ?? data.meta?.total
            ?? data.total
            ?? data.total_items
            ?? data.pagination?.total
            ?? (data.pagination as { total_items?: number } | undefined)?.total_items,
        lastUpdated: response.meta?.lastUpdated ?? response.lastUpdated ?? data.meta?.lastUpdated ?? data.lastUpdated,
        source: response.meta?.source ?? response.source ?? data.meta?.source ?? data.source,
    }
}

function mapCandle(item: unknown): StockCandle | null {
    if (!item || typeof item !== "object") return null
    const record = item as Record<string, unknown>

    const open = toNumber(firstValue(record, ["open", "o"]))
    const high = toNumber(firstValue(record, ["high", "h"]))
    const low = toNumber(firstValue(record, ["low", "l"]))
    const close = toNumber(firstValue(record, ["close", "c", "price"]))
    const volume = toNumber(firstValue(record, ["volume", "v", "vol"])) ?? 0
    const time = toDateLabel(firstValue(record, DATE_KEYS))

    if (!time || open === undefined || high === undefined || low === undefined || close === undefined) {
        return null
    }

    return {
        time,
        open,
        high,
        low,
        close,
        volume,
        sma: toNumber(firstValue(record, ["sma", "SMA"])),
        ema: toNumber(firstValue(record, ["ema", "EMA"])),
        rsi: toNumber(firstValue(record, ["rsi", "RSI"])),
        macd: toNumber(firstValue(record, ["macd", "MACD"])),
        bollingerUpper: toNumber(firstValue(record, ["bollingerUpper", "bb_upper", "bbUpper"])),
        bollingerLower: toNumber(firstValue(record, ["bollingerLower", "bb_lower", "bbLower"])),
    }
}

function mapStockItem(item: unknown): StockItem | null {
    if (!item || typeof item !== "object") return null
    const record = item as Record<string, unknown>
    const symbol = toText(firstValue(record, ["symbol", "ticker", "code"]))

    if (!symbol) return null

    return {
        symbol,
        companyName: toText(firstValue(record, ["companyName", "company_name", "name", "fullName", "full_name"])),
        market: toText(firstValue(record, ["market", "exchange", "market_code", "exchange_code"])),
        industry: toText(firstValue(record, ["industry", "industryName", "industry_name"])),
        sector: toText(firstValue(record, ["sector", "sectorName", "sector_name"])),
        status: toText(firstValue(record, ["status", "stockStatus", "stock_status"])),
        latestClosePrice: toNumber(firstValue(record, ["latestClosePrice", "latest_close_price", "close", "price", "latestPrice"])),
        change: toNumber(firstValue(record, ["change", "delta", "priceChange"])),
        changePercent: toNumber(firstValue(record, ["changePercent", "change_percent", "pctChange", "percentChange"])),
        volume: toNumber(firstValue(record, ["volume", "latestVolume", "latest_volume"])),
        marketCap: toNumber(firstValue(record, ["marketCap", "market_cap", "capitalization"])),
        lastUpdated: toDateLabel(firstValue(record, ["lastUpdated", "last_updated", "updatedAt", "updated_at", ...DATE_KEYS])),
        source: toText(firstValue(record, ["source", "provider"])),
        dataStatus: toText(firstValue(record, ["dataStatus", "data_status", "qualityStatus", "quality_status"])),
    }
}

export type StockPriceSnapshot = {
  close_price: number
  open_price?: number
  high_price?: number
  low_price?: number
  volume?: number
  time_id?: number
  price_change?: number
  price_change_percent?: number
}

export type StockDetailResponse = {
  symbol: string
  company_name: string
  latest_price: StockPriceSnapshot | null
  _mock?: boolean
  _cursor?: number
  _remaining?: number
  _done?: boolean
  alert_triggered?: boolean
  alert_status?: string | null
}

/**
 * Fetch stock detail (latest price snapshot).
 * During mock sessions returns next tick each call.
 */
export async function getStockDetail(symbol: string): Promise<StockDetailResponse> {
  const normalizedSymbol = symbol.trim().toUpperCase() || "FPT"
  const response = await authenticatedRequest({
    url: `/api/stocks/${encodeURIComponent(normalizedSymbol)}`,
    method: "GET",
  })

  const payload = response.data
  if (!payload || typeof payload !== "object") throw new Error("Invalid response")

  const data = (payload as Record<string, unknown>).data as StockDetailResponse | undefined
  if (!data) throw new Error("No stock data in response")

  return data
}

/** Convert time_id number (YYYYMMDD) to "YYYY-MM-DD" string */
function timeIdToDateString(timeId: number): string {
  const s = String(timeId)
  if (s.length !== 8) return String(timeId)
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

/** Convert mock tick from latest_price to a StockCandle */
export function mockSnapshotToCandle(snapshot: StockPriceSnapshot, cursor?: number): StockCandle {
  const time = snapshot.time_id
    ? timeIdToDateString(snapshot.time_id)
    : `mock-${cursor ?? Date.now()}`
  return {
    time,
    open: snapshot.open_price ?? snapshot.close_price,
    high: snapshot.high_price ?? snapshot.close_price,
    low: snapshot.low_price ?? snapshot.close_price,
    close: snapshot.close_price,
    volume: snapshot.volume ?? 0,
  }
}

export async function getStockChart(symbol: string, range: StockChartRange): Promise<StockChartResult> {
    const normalizedSymbol = symbol.trim().toUpperCase() || "FPT"
    const response = await authenticatedRequest<StockChartResponse | unknown[]>({
        url: `/api/stocks/${encodeURIComponent(normalizedSymbol)}/chart`,
        method: "GET",
        params: { range },
    })

    const payload = response.data
    const message = !Array.isArray(payload) && payload && typeof payload === "object"
        ? (payload as StockChartResponse).message
        : undefined

    if (response.status < 200 || response.status >= 300) {
        throw new Error(message || "Unable to load stock chart")
    }

    if (!Array.isArray(payload) && payload && typeof payload === "object" && (payload as StockChartResponse).success === false) {
        throw new Error(message || "Unable to load stock chart")
    }

    return {
        candles: arrayFromPayload(payload).map(mapCandle).filter((candle): candle is StockCandle => Boolean(candle)),
        meta: metaFromPayload(payload),
    }
}

export async function getStockList(query: StockListQuery): Promise<StockListResult> {
    const response = await authenticatedRequest<StockListResponse | unknown[]>({
        url: "/api/stocks",
        method: "GET",
        params: query,
    })

    const payload = response.data
    const message = !Array.isArray(payload) && payload && typeof payload === "object"
        ? (payload as StockListResponse).message
        : undefined

    if (response.status < 200 || response.status >= 300) {
        throw new Error(message || "Unable to load stock list")
    }

    if (!Array.isArray(payload) && payload && typeof payload === "object" && (payload as StockListResponse).success === false) {
        throw new Error(message || "Unable to load stock list")
    }

    return {
        items: stockListArrayFromPayload(payload).map(mapStockItem).filter((item): item is StockItem => Boolean(item)),
        meta: stockListMetaFromPayload(payload),
    }
}
