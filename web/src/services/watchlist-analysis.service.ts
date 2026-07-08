import { authenticatedRequest } from "@/services/auth.service"
import type { AnalyseTechnicalDetails } from "@/types/aiReport"

export type WatchlistBatchItem = {
    symbol: string
    average_cost?: number
    quantity?: number
    close_price?: number
    unrealized_pnl?: number
    recommendation?: string
    explanation?: string
    trend_7d_pct?: number
}

export type WatchlistBatchResponse = {
    success?: boolean
    message?: string
    data?: WatchlistBatchItem[] | {
        items?: WatchlistBatchItem[]
        watchlist?: WatchlistBatchItem[]
    }
}

export type WatchlistDetailItem = {
    symbol: string
    average_cost?: number
    quantity?: number
    close_price?: number
    unrealized_pnl?: number
    pnl_percent?: number
    recommendation?: string
    explanation?: string
    trend_7d_pct?: number
    technical_analysis?: Record<string, unknown>
    fundamental_analysis?: Record<string, unknown>
    sentiment_analysis?: Record<string, unknown>
    ai_insights?: Record<string, unknown>
}

export type WatchlistDetailResponse = {
    success?: boolean
    message?: string
    data?: WatchlistDetailItem
}

export type WatchlistServiceErrorKind = "auth_required" | "unauthorized" | "http" | "api" | "network" | "unknown"

export class WatchlistAnalysisError extends Error {
    kind: WatchlistServiceErrorKind
    technicalDetails: AnalyseTechnicalDetails

    constructor(
        message: string,
        kind: WatchlistServiceErrorKind,
        technicalDetails: AnalyseTechnicalDetails,
        cause?: unknown
    ) {
        super(message, { cause })
        this.name = "WatchlistAnalysisError"
        this.kind = kind
        this.technicalDetails = technicalDetails
    }
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

function collectBatchItems(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
        return payload.flatMap((item) => {
            if (!isRecord(item)) return [item]

            const nested = firstValue(item, ["items", "watchlist", "data"])
            if (Array.isArray(nested)) return collectBatchItems(nested)

            return [item]
        })
    }

    if (!isRecord(payload)) return []

    const nested = firstValue(payload, ["data", "items", "watchlist", "results"])
    if (Array.isArray(nested)) return collectBatchItems(nested)
    if (isRecord(nested)) return collectBatchItems(nested)

    return [payload]
}

export function normalizeWatchlistBatchItems(response: unknown): WatchlistBatchItem[] {
    const seen = new Set<string>()
    const normalized: WatchlistBatchItem[] = []

    for (const row of collectBatchItems(response)) {
        if (!isRecord(row)) continue

        const symbol = String(row.symbol ?? row.stock_code ?? row.code ?? "").trim().toUpperCase()
        if (!symbol) continue

        if (seen.has(symbol)) continue
        seen.add(symbol)

        normalized.push({
            symbol,
            average_cost: typeof row.average_cost === "number" ? row.average_cost : undefined,
            quantity: typeof row.quantity === "number" ? row.quantity : undefined,
            close_price: typeof row.close_price === "number" ? row.close_price : undefined,
            unrealized_pnl: typeof row.unrealized_pnl === "number" ? row.unrealized_pnl : undefined,
            recommendation: typeof row.recommendation === "string" ? row.recommendation : undefined,
            explanation: typeof row.explanation === "string" ? row.explanation : undefined,
            trend_7d_pct: typeof row.trend_7d_pct === "number" ? row.trend_7d_pct : undefined,
        })
    }

    return normalized
}

/**
 * Fetch batch analysis for all watchlist items
 */
export async function getWatchlistBatchAnalysis(includeAi: boolean = false): Promise<WatchlistBatchItem[]> {
    const url = `/api/portfolio/watchlist/batch${includeAi ? "?includeAi=true" : ""}`

    try {
        const response = await authenticatedRequest<WatchlistBatchResponse>({
            url,
            method: "GET",
        })

        const payload = response.data
        const items = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
                ? payload.data
                : []

        return normalizeWatchlistBatchItems(items)
    } catch (error) {
        throw new WatchlistAnalysisError(
            "Không tải được dữ liệu phân tích watchlist.",
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
}

/**
 * Fetch detailed analysis for a specific stock
 */
export async function getWatchlistDetailAnalysis(
    symbol: string,
    includeAi: boolean = false
): Promise<WatchlistDetailItem> {
    const url = `/api/portfolio/watchlist/${encodeURIComponent(symbol)}/detail${includeAi ? "?includeAi=true" : ""}`

    try {
        const response = await authenticatedRequest<WatchlistDetailResponse>({
            url,
            method: "GET",
        })

        const data = response.data?.data
        if (!isRecord(data)) {
            throw new Error("Invalid detail response format")
        }

        return {
            symbol: String(data.symbol ?? symbol).toUpperCase(),
            average_cost: typeof data.average_cost === "number" ? data.average_cost : undefined,
            quantity: typeof data.quantity === "number" ? data.quantity : undefined,
            close_price: typeof data.close_price === "number" ? data.close_price : undefined,
            unrealized_pnl: typeof data.unrealized_pnl === "number" ? data.unrealized_pnl : undefined,
            pnl_percent: typeof data.pnl_percent === "number" ? data.pnl_percent : undefined,
            recommendation: typeof data.recommendation === "string" ? data.recommendation : undefined,
            explanation: typeof data.explanation === "string" ? data.explanation : undefined,
            trend_7d_pct: typeof data.trend_7d_pct === "number" ? data.trend_7d_pct : undefined,
            technical_analysis: isRecord(data.technical_analysis) ? data.technical_analysis : undefined,
            fundamental_analysis: isRecord(data.fundamental_analysis) ? data.fundamental_analysis : undefined,
            sentiment_analysis: isRecord(data.sentiment_analysis) ? data.sentiment_analysis : undefined,
            ai_insights: isRecord(data.ai_insights) ? data.ai_insights : undefined,
        }
    } catch (error) {
        throw new WatchlistAnalysisError(
            `Không tải được dữ liệu chi tiết phân tích cho ${symbol}.`,
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
}
