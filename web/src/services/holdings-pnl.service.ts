import axios from "axios"
import { authenticatedRequest, buildAuthHeaders, getCurrentAccessToken } from "@/services/auth.service"
import { getAnalyseApiBaseUrl, getAnalyseApiTimeoutMs } from "@/lib/config"
import type { AnalyseTechnicalDetails } from "@/types/aiReport"

export type HoldingsItem = {
    holding_id?: string
    symbol: string
    company_name?: string
    market?: string
    average_cost?: number
    quantity?: number
    holding_date?: string
    close_price?: number
    data_as_of?: string
    market_value?: number
    cost?: number
    unrealized_pnl?: number
    unrealized_pnl_pct?: number
    allocation_pct?: number | null
    status?: string
    prices_7d?: Array<{
        date: string
        close: number
        open?: number
        high?: number
        low?: number
        volume?: number
    }>
}

export type PortfolioData = {
    total_cost: number
    total_market_value: number
    total_unrealized_pnl: number
    total_unrealized_pnl_pct: number
    count_profit: number
    count_loss: number
    position_count?: number
    count_neutral?: number
}

export type HoldingsPnlResponse = {
    success?: boolean
    message?: string
    data?: {
        generated_at?: string
        data_as_of?: string
        portfolio?: PortfolioData
        items?: HoldingsItem[]
    }
}

export type HoldingsAdviceItem = {
    symbol: string
    exchange?: string
    company_name?: string
    average_cost?: number
    quantity?: number
    close_price?: number
    market_value?: number
    cost?: number
    allocation_pct?: number | null
    unrealized_pnl?: number
    unrealized_pnl_pct?: number
    status?: string
    decision?: string
    pnl_signal?: string
    total_score?: number
    risk_score?: number
    data_confidence?: number
    reasoning?: string
    reasoningSkeleton?: {
        portfolio_fit?: string
        financial_health?: string
        valuation_peer?: string
        market_momentum?: string
        action_plan?: string
        criteria?: Array<{
            title: string
            verdict: string
            evidence?: Array<{
                metric_name: string
                value: any
                unit?: string | null
                source?: string
                sourceUrl?: string | null
                publishedAt?: string | null
                note?: string | null
            }>
        }>
        evidencePool?: Array<{
            metric_name: string
            value: any
            unit?: string | null
            source?: string
            sourceUrl?: string | null
            publishedAt?: string | null
            note?: string | null
        }>
    }
    source?: string
    analysed_at?: string
    error?: string | null
}

export type HoldingsAdviceResponse = {
    success?: boolean
    message?: string
    data?: {
        generated_at?: string
        advice?: HoldingsAdviceItem[]
        total_items?: number
        cached_count?: number
        generated_count?: number
        fallback_count?: number
    }
}

export type PortfolioServiceErrorKind = "auth_required" | "unauthorized" | "http" | "api" | "network" | "unknown"

export class PortfolioServiceError extends Error {
    kind: PortfolioServiceErrorKind
    technicalDetails: AnalyseTechnicalDetails

    constructor(
        message: string,
        kind: PortfolioServiceErrorKind,
        technicalDetails: AnalyseTechnicalDetails,
        cause?: unknown
    ) {
        super(message, { cause })
        this.name = "PortfolioServiceError"
        this.kind = kind
        this.technicalDetails = technicalDetails
    }
}


/**
 * Fetch Holdings P&L data (Tier 1 - instant)
 */
export async function getHoldingsPnl(): Promise<{
    portfolio: PortfolioData | null
    items: HoldingsItem[]
    generated_at?: string
    data_as_of?: string
}> {
    const url = "/api/me/holdings/pnl"

    try {
        const response = await authenticatedRequest<HoldingsPnlResponse>({
            url,
            method: "GET",
        })

        const data = response.data?.data
        if (!data) {
            throw new Error("Invalid P&L response format")
        }

        return {
            portfolio: data.portfolio ?? null,
            items: Array.isArray(data.items) ? data.items : [],
            generated_at: data.generated_at,
            data_as_of: data.data_as_of,
        }
    } catch (error) {
        throw new PortfolioServiceError(
            "Không tải được dữ liệu P&L danh mục.",
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
 * Fetch Holdings AI Advice (Tier 2 - async)
 */
export async function getHoldingsAdvice(
    items: Array<{
        symbol: string
        exchange?: string
        market?: string
        company_name?: string
        average_cost?: number
        quantity?: number
        close_price?: number
        market_value?: number
        cost?: number
        allocation_pct?: number | null
        unrealized_pnl?: number
        unrealized_pnl_pct?: number
        status?: string
    }>,
    options?: {
        forceRefresh?: boolean
        portfolio?: PortfolioData | null
    }
): Promise<{
    advice: HoldingsAdviceItem[]
    generated_at?: string
    total_items?: number
    cached_count?: number
    generated_count?: number
    fallback_count?: number
}> {
    const baseUrl = getAnalyseApiBaseUrl()
    const url = `${baseUrl}/api/ai-reports/holdings-advice`
    const token = getCurrentAccessToken()

    if (!token) {
        throw new PortfolioServiceError(
            "Bạn cần đăng nhập để tải khuyến nghị AI.",
            "auth_required",
            {
                url,
                method: "POST",
                hasAuthorizationHeader: false,
                message: "Missing auth token",
            }
        )
    }

    const body = {
        items: items.map(item => ({
            symbol: item.symbol,
            exchange: item.exchange || item.market || "HOSE",
            company_name: item.company_name,
            average_cost: item.average_cost ?? 0,
            quantity: item.quantity ?? 1,
            close_price: item.close_price,
            market_value: item.market_value,
            cost: item.cost,
            allocation_pct: item.allocation_pct,
            unrealized_pnl: item.unrealized_pnl,
            unrealized_pnl_pct: item.unrealized_pnl_pct,
            status: item.status,
        })),
        portfolioSummary: options?.portfolio
            ? {
                totalCost: options.portfolio.total_cost,
                totalMarketValue: options.portfolio.total_market_value,
                totalUnrealizedPnl: options.portfolio.total_unrealized_pnl,
                totalUnrealizedPnlPct: options.portfolio.total_unrealized_pnl_pct,
                positionCount: options.portfolio.position_count ?? items.length,
                countProfit: options.portfolio.count_profit,
                countLoss: options.portfolio.count_loss,
            }
            : undefined,
        forceRefresh: options?.forceRefresh ?? false,
    }

    try {
        const response = await axios.post<HoldingsAdviceResponse>(url, body, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...buildAuthHeaders(token),
            },
            timeout: getAnalyseApiTimeoutMs(),
            validateStatus: () => true,
        })

        const payload = response.data
        if (response.status < 200 || response.status >= 300) {
            throw new Error(payload?.message || `HTTP status ${response.status}`)
        }

        const data = payload?.data
        if (!data) {
            throw new Error("Invalid advice response format")
        }

        return {
            advice: Array.isArray(data.advice) ? data.advice : [],
            generated_at: data.generated_at,
            total_items: data.total_items,
            cached_count: data.cached_count,
            generated_count: data.generated_count,
            fallback_count: data.fallback_count,
        }
    } catch (error) {
        throw new PortfolioServiceError(
            "Không tải được phân tích AI danh mục.",
            "network",
            {
                url,
                method: "POST",
                hasAuthorizationHeader: true,
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            },
            error
        )
    }
}
