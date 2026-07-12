import { authenticatedRequest, getApiBaseUrl, getCurrentAccessToken } from "@/services/auth.service"
import type { StockItem } from "@/services/stock.service"
import type { AnalyseTechnicalDetails } from "@/types/aiReport"

export type AddToWatchlistResult = {
    watchlist_id: string
    symbol: string
    created_at: string
}

export type WatchlistRawItem = {
    stock_id?: string
    stock_code?: string
    stock_name?: string
    stock?: {
        stock_id?: string
        symbol?: string
        company_name?: string
        market_code?: string
    }
    latest_price?: {
        close_price?: number
        price_change?: number
        price_change_percent?: number
        volume?: number
    }
}

export type WatchlistStock = {
    symbol: string
    exchange?: string
    name?: string
    companyName?: string
    price?: number
    changePercent?: number
    source?: string
    raw?: unknown
}

export type WatchlistData = {
    items: StockItem[]
    stocks: WatchlistStock[]
    overLimit: boolean
    limit: number
    rawItems: WatchlistRawItem[]
}

export type TrimWatchlistResult = {
    deleted?: number
}

type WatchlistApiResponse = {
    success?: boolean
    message?: string
    data?: WatchlistRawItem[] | {
        items?: WatchlistRawItem[]
        watchlist?: WatchlistRawItem[]
        overLimit?: boolean
        limit?: number
    }
    overLimit?: boolean
    limit?: number
}

export type WatchlistServiceErrorKind = "auth_required" | "unauthorized" | "http" | "api" | "network" | "unknown"

export class WatchlistServiceError extends Error {
    kind: WatchlistServiceErrorKind
    technicalDetails: AnalyseTechnicalDetails

    constructor(
        message: string,
        kind: WatchlistServiceErrorKind,
        technicalDetails: AnalyseTechnicalDetails,
        cause?: unknown
    ) {
        super(message, { cause })
        this.name = "WatchlistServiceError"
        this.kind = kind
        this.technicalDetails = technicalDetails
    }
}

const WATCHLIST_PATH = "/api/watchlists"

export function getWatchlistsUrl() {
    return `${getApiBaseUrl()}${WATCHLIST_PATH}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function firstValue(record: Record<string, unknown> | undefined, keys: string[]) {
    if (!record) return undefined

    for (const key of keys) {
        const value = record[key]
        if (value !== undefined && value !== null && value !== "") return value
    }

    return undefined
}

function toText(value: unknown): string | undefined {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    return undefined
}

function toNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
        const normalized = Number(value.replace(/[%,$\s]/g, "").replace(/,/g, ""))
        if (Number.isFinite(normalized)) return normalized
    }
    return undefined
}

function collectWatchlistRows(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
        return payload.flatMap((item) => {
            if (!isRecord(item)) return [item]

            const nested = firstValue(item, ["stocks", "items", "watchlist", "watchlists"])
            if (Array.isArray(nested)) return collectWatchlistRows(nested)

            return [item]
        })
    }

    if (!isRecord(payload)) return []

    const nested = firstValue(payload, ["data", "stocks", "items", "watchlist", "watchlists", "results"])
    if (Array.isArray(nested)) return collectWatchlistRows(nested)
    if (isRecord(nested)) return collectWatchlistRows(nested)

    return [payload]
}

export function normalizeWatchlistStocks(response: unknown): WatchlistStock[] {
    const seen = new Set<string>()
    const normalized: WatchlistStock[] = []

    for (const row of collectWatchlistRows(response)) {
        if (!isRecord(row)) continue

        const stock = isRecord(row.stock) ? row.stock : {}
        const latestPrice = isRecord(row.latest_price) ? row.latest_price : {}
        const symbol = toText(firstValue(stock, ["symbol", "stock_code", "ticker", "code"])) ??
            toText(firstValue(row, ["symbol", "stock_code", "ticker", "code"]))

        if (!symbol) continue

        const exchange = (
            toText(firstValue(stock, ["exchange", "market", "market_code", "exchange_code", "scope_exchange"])) ??
            toText(firstValue(row, ["exchange", "market", "market_code", "exchange_code", "scope_exchange"])) ??
            "HOSE"
        ).toUpperCase()
        const normalizedSymbol = symbol.toUpperCase()
        const dedupeKey = `${normalizedSymbol}:${exchange}`

        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        const companyName =
            toText(firstValue(stock, ["companyName", "company_name", "name", "stock_name", "fullName", "full_name"])) ??
            toText(firstValue(row, ["companyName", "company_name", "name", "stock_name", "fullName", "full_name"]))

        normalized.push({
            symbol: normalizedSymbol,
            exchange,
            name: companyName,
            companyName,
            price:
                toNumber(firstValue(latestPrice, ["close_price", "price", "latest_price", "close"])) ??
                toNumber(firstValue(row, ["latestClosePrice", "latest_close_price", "close_price", "price", "latestPrice"])),
            changePercent:
                toNumber(firstValue(latestPrice, ["price_change_percent", "change_percent", "pctChange"])) ??
                toNumber(firstValue(row, ["changePercent", "change_percent", "pctChange", "percentChange"])),
            source: toText(firstValue(row, ["source", "provider"])),
            raw: row,
        })
    }

    return normalized
}

function mapWatchlistItem(raw: WatchlistRawItem): StockItem | null {
    if (!raw) return null
    const stock = raw.stock ?? {}
    const latestPrice = raw.latest_price ?? {}

    const symbol = stock.symbol?.trim() || raw.stock_code?.trim()
    if (!symbol) return null

    return {
        symbol,
        companyName: stock.company_name ?? raw.stock_name ?? undefined,
        market: stock.market_code ?? undefined,
        latestClosePrice: latestPrice.close_price ?? undefined,
        change: latestPrice.price_change ?? undefined,
        changePercent: latestPrice.price_change_percent ?? undefined,
        volume: latestPrice.volume ?? undefined,
    }
}

function getRawListFromPayload(payload: WatchlistApiResponse): WatchlistRawItem[] {
    return collectWatchlistRows(payload).filter((item): item is WatchlistRawItem => isRecord(item))
}

export async function getWatchlistData(): Promise<WatchlistData> {
    const token = getCurrentAccessToken()
    const url = getWatchlistsUrl()

    if (!token) {
        throw new WatchlistServiceError(
            "Bạn cần đăng nhập để tải watchlists và phân tích cổ phiếu.",
            "auth_required",
            {
                url,
                method: "GET",
                hasAuthorizationHeader: false,
                message: "Missing auth token",
            }
        )
    }

    let response
    try {
        response = await authenticatedRequest<WatchlistApiResponse>({
            url: WATCHLIST_PATH,
            method: "GET",
        })
    } catch (error) {
        throw new WatchlistServiceError(
            "Không tải được watchlists từ hệ thống.",
            "network",
            {
                url,
                method: "GET",
                hasAuthorizationHeader: true,
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            },
            error
        )
    }

    const payload = response.data
    const message = payload && typeof payload === "object" && "message" in payload
        ? String(payload.message || "")
        : ""

    if (response.status === 401) {
        throw new WatchlistServiceError(
            "Không có quyền đọc watchlists. Hãy đăng nhập lại hoặc kiểm tra token.",
            "unauthorized",
            {
                httpStatus: response.status,
                url,
                method: "GET",
                hasAuthorizationHeader: true,
                response: payload,
                message: message || "Unauthorized",
            }
        )
    }

    if (response.status < 200 || response.status >= 300) {
        throw new WatchlistServiceError(
            "Không tải được watchlists từ hệ thống.",
            "http",
            {
                httpStatus: response.status,
                url,
                method: "GET",
                hasAuthorizationHeader: true,
                response: payload,
                message: message || "Watchlists request failed",
            }
        )
    }

    if (payload?.success === false) {
        throw new WatchlistServiceError(
            payload.message || "Không tải được watchlists từ hệ thống.",
            "api",
            {
                httpStatus: response.status,
                url,
                method: "GET",
                hasAuthorizationHeader: true,
                response: payload,
                message: payload.message,
            }
        )
    }

    const rawList = getRawListFromPayload(payload)
    
    const dataObj = !Array.isArray(payload.data) ? payload.data : {}
    const overLimit = Boolean(dataObj?.overLimit ?? payload.overLimit ?? false)
    const limit = Number(dataObj?.limit ?? payload.limit ?? 5)
    const stocks = normalizeWatchlistStocks(payload)

    return {
        items: rawList.map(mapWatchlistItem).filter((item): item is StockItem => item !== null),
        stocks,
        overLimit,
        limit,
        rawItems: rawList,
    }
}

export async function getWatchlist(): Promise<StockItem[]> {
    const data = await getWatchlistData()
    return data.items
}

export async function getWatchlistStocks(): Promise<WatchlistStock[]> {
    const data = await getWatchlistData()
    return data.stocks
}

export async function addToWatchlist(symbol: string): Promise<AddToWatchlistResult> {
    const response = await authenticatedRequest<{ success: boolean; message: string; data: AddToWatchlistResult }>({
        url: "/api/watchlists",
        method: "POST",
        data: { symbol },
    })
    const payload = response.data

    if (response.status === 400) {
        throw new Error(payload?.message || "Watchlist limit exceeded or stock already exists")
    }
    if (response.status === 404) {
        throw new Error(payload?.message || "Stock symbol not found")
    }
    if (!payload?.success || !payload.data) {
        throw new Error(payload?.message || "Failed to add stock to watchlist")
    }

    return payload.data
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
    await authenticatedRequest({
        url: `/api/watchlists/${symbol}`,
        method: "DELETE",
    })
}

export async function deleteWatchlistItem(symbol: string): Promise<void> {
    await removeFromWatchlist(symbol)
}

export async function trimWatchlist(keepStockIds: string[]): Promise<TrimWatchlistResult> {
    const response = await authenticatedRequest<{ success: boolean; message: string; data: TrimWatchlistResult }>({
        url: "/api/watchlists/trim",
        method: "POST",
        data: { keepStockIds },
    })
    
    const payload = response.data
    if (!payload?.success) {
        throw new Error(payload?.message || "Failed to trim watchlist")
    }
    return payload.data || {}
}
