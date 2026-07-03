export type AiProvider = "openai" | "gemini" | string

export type AiRiskProfile = "low" | "medium" | "high"

export type AiTimeHorizon = "short_term" | "medium_term" | "long_term"

export type AiReportOptions = {
    language: string
    riskProfile: AiRiskProfile
    timeHorizon: AiTimeHorizon
    includeExternalResearch: boolean
    renderMarkdown: boolean
    renderHtml: boolean
    capitalVnd: number
    riskPerTradePct: number
    maxPositionPct: number
    reportId?: string
    report_id?: string
}

export type AnalyseOneRequest = {
    provider: AiProvider
    model: string
    symbol: string
    scopeExchange: string
    options: AiReportOptions
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export type JsonRecord = Record<string, unknown>

export type AiReportProviderInfo = {
    name?: string
    model?: string
    status?: string
    latency_ms?: number
}

export type AiReportDataSource = {
    name?: string
    type?: string
    status?: string
    detail?: string
}

export type AiReportSummary = {
    symbol?: string
    company?: string
    scope_exchange?: string
    disclaimer?: string
    data_coverage?: JsonRecord
    latest_market?: JsonRecord
    price_history?: JsonRecord[]
    momentum?: JsonRecord
    bctc_3q?: JsonRecord & {
        periods?: JsonRecord[]
    }
    financial_balance?: JsonRecord
    company_overview?: JsonRecord
    hose_market_context?: JsonRecord
    industry_peer_context?: JsonRecord & {
        peers?: JsonRecord[]
    }
    market_general_context?: JsonRecord
    same_industry_recommendation?: JsonRecord & {
        candidates?: JsonRecord[]
    }
    data_quality?: JsonRecord
    scores?: JsonRecord
    strengths?: string[]
    weaknesses?: string[]
    external_research_context?: JsonRecord & {
        items?: JsonRecord[]
    }
    system_decision?: JsonRecord
    investment_plan?: JsonRecord
    warnings?: string[]
    report_presentation?: JsonRecord
}

export type AiReportData = {
    history_id?: string
    history_status?: string
    report_id?: string
    report_status?: string
    status?: string
    analysis_status?: string
    source_status?: string
    generated_at?: string
    symbol?: string
    company?: string
    scope_exchange?: string
    language?: string
    provider?: AiReportProviderInfo
    data_sources?: AiReportDataSource[]
    summary?: AiReportSummary
    warnings?: string[]
    report_presentation?: JsonRecord
}

export type AnalyseOneResponse = {
    code?: number
    message?: string
    data?: AiReportData
}

export type AiReportResponse = AnalyseOneResponse

export type AnalyseTechnicalDetails = {
    httpStatus?: number
    url: string
    method?: string
    hasAuthorizationHeader?: boolean
    response?: unknown
    message?: string
    stack?: string
}

export type AnalyseServiceErrorKind =
    | "network"
    | "timeout"
    | "http"
    | "api"
    | "auth_required"
    | "unauthorized"
    | "cancelled"
    | "unknown"

export class AnalyseServiceError extends Error {
    kind: AnalyseServiceErrorKind
    technicalDetails: AnalyseTechnicalDetails

    constructor(
        message: string,
        kind: AnalyseServiceErrorKind,
        technicalDetails: AnalyseTechnicalDetails,
        cause?: unknown
    ) {
        super(message, { cause })
        this.name = "AnalyseServiceError"
        this.kind = kind
        this.technicalDetails = technicalDetails
    }
}
