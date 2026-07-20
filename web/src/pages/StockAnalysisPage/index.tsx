import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import {
    AlertTriangle,
    ArrowUp,
    BarChart3,
    BookOpen,
    Building2,
    CheckCircle2,
    ClipboardList,
    Copy,
    Database,
    FileText,
    Landmark,
    Loader2,
    Newspaper,
    RefreshCw,
    Scale,
    ShieldAlert,
    Sparkles,
    Target,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/providers/AuthProvider"
import { analyseOneStock, getAnalyseOneUrl, fetchVisualizationJson, invalidateAiReportHistoryCache } from "@/services/aiReportService"
import VisualizationTab from "@/components/visualization/VisualizationTab"
import { buildZipExportPackage, downloadBlob } from "@/utils/visualizationExport"
import { autoDownloadVisualizationExport } from "@/lib/config"
import { getCurrentAccessToken, normalizeAuthToken } from "@/services/auth.service"
import {
    getWatchlistStocks,
    getWatchlistsUrl,
    WatchlistServiceError,
    type WatchlistStock,
} from "@/services/watchlist.service"
import type {
    AiReportData,
    AiReportDataSource,
    AiRiskProfile,
    AiTimeHorizon,
    AnalyseOneRequest,
    AnalyseOneResponse,
    AnalyseTechnicalDetails,
    JsonRecord,
} from "@/types/aiReport"
import { AnalyseServiceError } from "@/types/aiReport"
import { Breadcrumb } from "@/shared/components"
import "./StockAnalysisPage.css"
import DataFormulatorPanel from "@/components/data-formulator/DataFormulatorPanel"

type AnalysisFormState = {
    provider: "openai" | "gemini"
    model: string
    language: string
    riskProfile: AiRiskProfile
    timeHorizon: AiTimeHorizon
    includeExternalResearch: boolean
    capitalVnd: number
    riskPerTradePct: number
    maxPositionPct: number
}

type AnalysisErrorState = {
    message: string
    details?: AnalyseTechnicalDetails
}

type ScoreCard = {
    key: string
    label: string
    value?: number
    detail?: string
    rating?: string
    dataUsed?: string
}

type ResearchCard = {
    title: string
    source?: string
    publishedAt?: string
    tone?: string
    group?: string
    relevance?: string
    confidence?: string
    summary?: string
    verify?: string
    url?: string
}

type ReportTab = "ai-report" | "visualization" | "data-formulator"

const FALLBACK = "Chưa xác minh"
const EMPTY_MESSAGE = "Chưa có dữ liệu phù hợp cho phần này."
const UNVERIFIED = "Chưa xác minh"
const DISCLAIMER =
    "Báo cáo này chỉ phục vụ tham khảo/học tập, không phải khuyến nghị đầu tư cá nhân hóa."

const GEMINI_PREFERRED_MODEL = "gemini-2.5-flash"

const PROVIDER_DEFAULT_MODELS: Record<AnalysisFormState["provider"], string> = {
    openai: "gpt-4.1-mini",
    gemini: GEMINI_PREFERRED_MODEL,
}

const MODEL_OPTIONS: Record<AnalysisFormState["provider"], string[]> = {
    openai: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"],
    gemini: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
}

const DEFAULT_FORM: AnalysisFormState = {
    provider: "openai",
    model: PROVIDER_DEFAULT_MODELS.openai,
    language: "vi",
    riskProfile: "medium",
    timeHorizon: "medium_term",
    includeExternalResearch: true,
    capitalVnd: 100_000_000,
    riskPerTradePct: 1,
    maxPositionPct: 12,
}

const ANALYSIS_STEP_ADVANCE_MS = 18_000

const LOADING_STEPS = [
    {
        label: "Xác nhận phiên làm việc",
        description: "Đảm bảo bạn đang thao tác trong phiên truy cập hợp lệ.",
    },
    {
        label: "Đối chiếu danh mục theo dõi",
        description: "Kiểm tra mã cổ phiếu trong danh mục được phép phân tích.",
    },
    {
        label: "Khởi tạo hồ sơ phân tích",
        description: "Chuẩn bị thông tin mã, sàn giao dịch và cấu hình phân tích.",
    },
    {
        label: "Thu thập dữ liệu thị trường",
        description: "Tổng hợp giá, thanh khoản, BCTC, peer và tin tức liên quan.",
    },
    {
        label: "Lượng hóa tín hiệu & kịch bản",
        description: "Đánh giá điểm số, rủi ro, xu hướng và các kịch bản tham khảo.",
    },
    {
        label: "Hoàn thiện báo cáo phân tích",
        description: "Chuẩn hóa dữ liệu và dựng báo cáo để hiển thị.",
    },
]

const LONG_ANALYSIS_NOTE =
    "Quá trình phân tích có thể mất vài phút khi hệ thống cần tổng hợp BCTC, dữ liệu giá, peer và tin tức từ nhiều nguồn."
const LONG_ANALYSIS_30S_MESSAGE =
    "Đang tiếp tục tổng hợp dữ liệu. Một số nguồn như CafeF, Vietstock hoặc tin tức thị trường có thể cần thêm thời gian."
const LONG_ANALYSIS_90S_MESSAGE =
    "Báo cáo vẫn đang được xử lý. Vui lòng giữ trang này mở trong khi hệ thống hoàn thiện phân tích."

const REPORT_SECTIONS = [
    ["cover", "Trang bìa"],
    ["summary-strip", "Tổng quan nhanh"],
    ["executive-summary", "Tóm tắt điều hành"],
    ["business-overview", "Tổng quan doanh nghiệp"],
    ["market-context", "Bối cảnh VNINDEX/HoSE"],
    ["stock-quality-dashboard", "Dashboard chất lượng cổ phiếu"],
    ["financial-statement-analysis", "Phân tích tài chính"],
    ["valuation", "Định giá"],
    ["peer-comparison", "So sánh peer cùng ngành"],
    ["external-research", "Tin tức và dữ liệu bên ngoài"],
    ["investment-memo", "Investment memo"],
    ["action-plan", "Kế hoạch hành động"],
    ["strengths", "Điểm mạnh"],
    ["weaknesses-risks", "Rủi ro"],
    ["scenario-matrix", "Kịch bản"],
    ["checklist", "Checklist"],
    ["metric-dictionary", "Từ điển chỉ số"],
    ["data-coverage", "Độ phủ dữ liệu"],
    ["data-sources", "Nguồn đã sử dụng"],
] as const

const SCORE_LABELS: Record<string, string> = {
    valuation_score: "Định giá",
    quality_score: "Chất lượng",
    growth_score: "Tăng trưởng",
    momentum_score: "Động lượng",
    liquidity_score: "Thanh khoản",
    size_score: "Quy mô",
    risk_score: "Rủi ro",
}

const FINANCIAL_COLUMNS = [
    ["Kỳ", ["period", "quarter", "year", "label", "date"]],
    ["Thu nhập lãi thuần", ["net_interest_income", "netInterestIncome", "nii"]],
    ["Thu nhập dịch vụ thuần", ["net_service_income", "netServiceIncome", "service_income"]],
    ["LN trước dự phòng", ["pre_provision_profit", "profit_before_provision", "popp"]],
    ["Dự phòng", ["provision_expense", "provision", "credit_provision"]],
    ["LNTT", ["profit_before_tax", "pbt"]],
    ["LNST", ["profit_after_tax", "pat", "net_profit"]],
    ["EPS", ["eps", "eps_4q"]],
    ["Tổng tài sản", ["total_assets", "assets"]],
    ["Cho vay KH", ["customer_loans", "loans", "loan_customers"]],
    ["Tiền gửi KH", ["customer_deposits", "deposits"]],
    ["Vốn chủ", ["equity", "owner_equity", "shareholder_equity"]],
    ["P/E", ["pe", "p_e", "trailing_pe"]],
    ["P/B", ["pb", "p_b"]],
    ["NIM", ["nim", "net_interest_margin"]],
    ["Nợ xấu", ["npl", "npl_ratio", "bad_debt_ratio"]],
    ["ROE", ["roe"]],
    ["ROA", ["roa"]],
] as const

function isRecord(value: unknown): value is JsonRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function asRecord(value: unknown): JsonRecord | undefined {
    return isRecord(value) ? value : undefined
}

function asRecordArray(value: unknown): JsonRecord[] {
    if (Array.isArray(value)) return value.filter(isRecord)
    if (isRecord(value)) {
        const nested = getFirstValue(value, ["items", "rows", "data", "candidates", "peers", "periods"])
        if (Array.isArray(nested)) return nested.filter(isRecord)
    }
    return []
}

function getFirstValue(record: unknown, keys: readonly string[]) {
    if (!isRecord(record)) return undefined

    for (const key of keys) {
        const value = record[key]
        if (value !== undefined && value !== null && value !== "") return value
    }

    return undefined
}

function toText(value: unknown): string | undefined {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    if (typeof value === "boolean") return value ? "Có" : "Không"
    return undefined
}

function displayText(value: unknown, fallback = FALLBACK) {
    return toText(value) ?? fallback
}

function toNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
        const normalized = Number(value.replace(/[%,$\s]/g, "").replace(/,/g, ""))
        if (Number.isFinite(normalized)) return normalized
    }
    return undefined
}

function toTextArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value
        .map((item) => {
            if (typeof item === "string") return item.trim()
            if (isRecord(item)) {
                return toText(getFirstValue(item, ["text", "title", "summary", "detail", "reason"]))
            }
            return undefined
        })
        .filter((item): item is string => Boolean(item))
}

function dedupeTextArray(items: string[], limit?: number) {
    const seen = new Set<string>()
    const result: string[] = []

    for (const item of items) {
        const normalized = item.replace(/\s+/g, " ").trim().toLowerCase()
        if (!normalized || seen.has(normalized)) continue
        seen.add(normalized)
        result.push(item.trim())
        if (limit && result.length >= limit) break
    }

    return result
}

function formatNumber(value?: number, digits = 0) {
    if (value === undefined || !Number.isFinite(value)) return FALLBACK
    return new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: digits,
    }).format(value)
}

function formatCurrencyVnd(value?: number) {
    if (value === undefined || !Number.isFinite(value)) return FALLBACK
    return new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: 0,
    }).format(value)
}

function formatCompact(value?: number) {
    if (value === undefined || !Number.isFinite(value)) return FALLBACK
    return new Intl.NumberFormat("vi-VN", {
        notation: "compact",
        maximumFractionDigits: 2,
    }).format(value)
}

function formatPercentValue(value?: number, digits = 2) {
    if (value === undefined || !Number.isFinite(value)) return FALLBACK
    return `${formatNumber(value, digits)}%`
}

function formatRatio(value?: number, digits = 2) {
    if (value === undefined || !Number.isFinite(value)) return FALLBACK
    return formatNumber(value, digits)
}

function formatConfidence(value: unknown) {
    const numberValue = toNumber(value)
    if (numberValue === undefined) return FALLBACK
    const pct = Math.abs(numberValue) <= 1 ? numberValue * 100 : numberValue
    return `${formatNumber(pct, Number.isInteger(pct) ? 0 : 1)}%`
}

function formatDate(value?: string) {
    if (!value) return FALLBACK
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

function formatElapsedTime(totalSeconds: number) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds))
    const minutes = Math.floor(safeSeconds / 60)
    const seconds = safeSeconds % 60
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function formatCell(value: unknown) {
    const numberValue = toNumber(value)
    if (numberValue !== undefined) {
        if (Math.abs(numberValue) >= 1_000_000) return formatCompact(numberValue)
        if (Number.isInteger(numberValue)) return formatNumber(numberValue, 0)
        return formatNumber(numberValue, Math.abs(numberValue) < 10 ? 2 : 1)
    }

    if (Array.isArray(value)) return value.length ? `${value.length} mục` : FALLBACK
    if (isRecord(value)) {
        return (
            toText(getFirstValue(value, ["label", "value", "name", "title", "summary", "detail", "status"])) ??
            `${Object.keys(value).length} trường`
        )
    }

    return displayText(value)
}

function formatInlineValue(value: unknown) {
    if (Array.isArray(value)) {
        const items = value
            .map((item) => {
                if (typeof item === "string") return item
                if (isRecord(item)) return toText(getFirstValue(item, ["text", "label", "name", "title", "summary", "detail", "reason"]))
                return toText(item)
            })
            .filter((item): item is string => Boolean(item))
        return items.length ? dedupeTextArray(items).join("; ") : FALLBACK
    }

    if (isRecord(value)) {
        return (
            toText(getFirstValue(value, ["text", "label", "name", "title", "summary", "detail", "reason", "status"])) ??
            FALLBACK
        )
    }

    return formatCell(value)
}

function formatKpiValue(value: unknown, kind?: "price" | "percent" | "score" | "count" | "confidence" | "ratio") {
    const numberValue = toNumber(value)

    if (kind === "confidence") return formatConfidence(value)
    if (kind === "percent") return numberValue === undefined ? displayText(value) : formatPercentValue(numberValue)
    if (kind === "price") return numberValue === undefined ? displayText(value) : formatCurrencyVnd(numberValue)
    if (kind === "score" || kind === "count") return numberValue === undefined ? displayText(value) : formatNumber(numberValue, Number.isInteger(numberValue) ? 0 : 1)
    if (kind === "ratio") return numberValue === undefined ? displayText(value) : formatRatio(numberValue)

    return formatCell(value)
}

function getPresentation(report: AiReportData) {
    return asRecord(report.summary?.report_presentation)
}

function getSummaryStripRecord(report: AiReportData) {
    const presentation = getPresentation(report)
    return asRecord(presentation?.summary_strip)
}

function getSystemDecision(report: AiReportData) {
    return asRecord(report.summary?.system_decision)
}

function getScores(report: AiReportData) {
    return asRecord(report.summary?.scores)
}

function getLatestMarket(report: AiReportData) {
    return asRecord(report.summary?.latest_market)
}

function getDataQuality(report: AiReportData) {
    return asRecord(report.summary?.data_quality)
}

function getTotalScore(report: AiReportData) {
    const strip = getSummaryStripRecord(report)
    const scores = getScores(report)
    const decision = getSystemDecision(report)
    return toNumber(
        getFirstValue(strip, ["total_score", "score", "overall_score"]) ??
            getFirstValue(scores, ["total_score", "overall_score", "score"]) ??
            getFirstValue(decision, ["total_score", "overall_score", "score"])
    )
}

function getRiskLabel(report: AiReportData) {
    const strip = getSummaryStripRecord(report)
    const scores = getScores(report)
    const decision = getSystemDecision(report)
    return (
        toText(getFirstValue(strip, ["risk_label", "risk", "risk_level"])) ??
        toText(getFirstValue(scores, ["risk_label", "risk_level"])) ??
        toText(getFirstValue(decision, ["risk_label", "risk", "risk_level"])) ??
        UNVERIFIED
    )
}

function getDecisionStatus(report: AiReportData) {
    const decision = getSystemDecision(report)
    return (
        toText(getFirstValue(decision, ["status", "decision_label", "label", "decision", "action", "rating"])) ??
        UNVERIFIED
    )
}

function getDataConfidenceValue(report: AiReportData) {
    const strip = getSummaryStripRecord(report)
    const dataQuality = getDataQuality(report)
    const decision = getSystemDecision(report)
    return (
        getFirstValue(strip, ["data_confidence", "confidence", "confidence_pct"]) ??
        getFirstValue(dataQuality, ["confidence", "confidence_score", "data_confidence", "coverage_pct"]) ??
        getFirstValue(decision, ["confidence", "confidence_score"])
    )
}

function getSummaryKpis(report: AiReportData) {
    const strip = getSummaryStripRecord(report)
    const latestMarket = getLatestMarket(report)
    const momentum = asRecord(report.summary?.momentum)
    const periods = getFinancialPeriods(report)

    return [
        {
            label: "Giá",
            value: getFirstValue(latestMarket, ["price", "close", "close_price", "latest_price"]) ??
                getFirstValue(strip, ["price", "close", "close_price"]),
            kind: "price" as const,
        },
        {
            label: "Biến động kỳ chart",
            value: getFirstValue(momentum, ["price_change_percent", "chart_change", "change_percent", "pct_change"]) ??
                getFirstValue(strip, ["chart_change", "price_change_percent"]),
            kind: "percent" as const,
        },
        {
            label: "Điểm tổng",
            value: getTotalScore(report),
            kind: "score" as const,
        },
        {
            label: "Rủi ro",
            value: getRiskLabel(report),
        },
        {
            label: "Số kỳ BCTC",
            value: getFirstValue(strip, ["financial_period_count", "period_count"]) ?? periods.length,
            kind: "count" as const,
        },
        {
            label: "Tỷ lệ tin cậy dữ liệu",
            value: getDataConfidenceValue(report),
            kind: "confidence" as const,
        },
    ]
}

function scoreLabel(score?: number) {
    if (score === undefined) return UNVERIFIED
    if (score >= 80) return "Tích cực"
    if (score >= 60) return "Khá tích cực"
    if (score >= 45) return "Trung tính"
    return "Cần thận trọng"
}

function cleanSourceLabel(value?: string) {
    const raw = value?.trim()
    if (!raw) return FALLBACK
    const normalized = raw.toLowerCase()
    if (normalized.includes("vietstock")) return "Vietstock"
    if (normalized.includes("cafef")) return "CafeF"
    if (normalized.includes("google_news")) return "Google News"
    if (normalized === "google_news_rss") return "Google News"
    if (normalized.includes("vietstockfinance")) return "Vietstock Finance"
    return raw
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizeResearchGroup(value?: string) {
    const normalized = value?.trim().toLowerCase()
    if (!normalized) return "Bối cảnh ngành/thông tin nền"
    if (normalized.includes("risk") || normalized.includes("rủi") || normalized.includes("tiêu cực") || normalized.includes("thận trọng")) {
        return "Rủi ro/tín hiệu cần thận trọng"
    }
    if (normalized.includes("positive") || normalized.includes("catalyst") || normalized.includes("tích cực")) {
        return "Catalyst tích cực"
    }
    if (normalized.includes("verify") || normalized.includes("kiểm chứng") || normalized.includes("xác minh")) {
        return "Mục cần kiểm chứng"
    }
    return "Bối cảnh ngành/thông tin nền"
}

function getWatchlistStockKey(stock: Pick<WatchlistStock, "symbol" | "exchange">) {
    return `${stock.symbol.trim().toUpperCase()}:${(stock.exchange || "HOSE").trim().toUpperCase()}`
}

function isStockInWatchlist(stock: WatchlistStock | null, watchlistStocks: WatchlistStock[]) {
    if (!stock) return false
    const selectedKey = getWatchlistStockKey(stock)
    return watchlistStocks.some((item) => getWatchlistStockKey(item) === selectedKey)
}

function getStockCompanyName(stock?: WatchlistStock | null) {
    return stock?.companyName || stock?.name || FALLBACK
}

function buildRequest(form: AnalysisFormState, selectedStock: WatchlistStock): AnalyseOneRequest {
    return {
        provider: form.provider,
        model: form.model.trim(),
        symbol: selectedStock.symbol.trim().toUpperCase(),
        scopeExchange: (selectedStock.exchange || "HOSE").trim().toUpperCase(),
        options: {
            language: form.language,
            riskProfile: form.riskProfile,
            timeHorizon: form.timeHorizon,
            includeExternalResearch: form.includeExternalResearch,
            renderMarkdown: false,
            renderHtml: false,
            capitalVnd: Number(form.capitalVnd),
            riskPerTradePct: Number(form.riskPerTradePct),
            maxPositionPct: Number(form.maxPositionPct),
        },
    }
}

function getScoreCards(report: AiReportData): ScoreCard[] {
    const presentation = getPresentation(report)
    const presentationCards = asRecordArray(presentation?.score_cards)

    if (presentationCards.length) {
        return presentationCards.map((card, index) => {
            const key = displayText(getFirstValue(card, ["key", "id", "name"]), `score-${index}`)
            return {
                key,
                label: displayText(getFirstValue(card, ["label", "title", "name"]), SCORE_LABELS[key] ?? key),
                value: toNumber(getFirstValue(card, ["score", "value", "points"])),
                detail: toText(getFirstValue(card, ["detail", "description", "note"])),
                rating: toText(getFirstValue(card, ["rating", "label", "status"])),
                dataUsed: toText(getFirstValue(card, ["data_used", "dataUsed", "source_note", "source"])),
            }
        })
    }

    const scores = getScores(report)
    if (!scores) {
        const confidence = toNumber(getDataConfidenceValue(report))
        return confidence === undefined
            ? []
            : [{
                  key: "data_confidence",
                  label: "Tỷ lệ tin cậy dữ liệu",
                  value: Math.abs(confidence) <= 1 ? confidence * 100 : confidence,
                  rating: scoreLabel(Math.abs(confidence) <= 1 ? confidence * 100 : confidence),
                  detail: "Tỷ lệ tin cậy dữ liệu xét độ phủ giá, BCTC, peer, thị trường và nghiên cứu bên ngoài.",
              }]
    }

    const cards: ScoreCard[] = Object.entries(SCORE_LABELS)
        .map(([key, label]) => ({
            key,
            label,
            value: toNumber(scores[key]),
            rating: scoreLabel(toNumber(scores[key])),
        }))
        .filter((card) => card.value !== undefined)

    const confidence = toNumber(getDataConfidenceValue(report))
    if (confidence !== undefined) {
        const normalizedConfidence = Math.abs(confidence) <= 1 ? confidence * 100 : confidence
        cards.push({
            key: "data_confidence",
            label: "Tỷ lệ tin cậy dữ liệu",
            value: normalizedConfidence,
            rating: scoreLabel(normalizedConfidence),
            detail: "Tỷ lệ tin cậy dữ liệu xét độ phủ giá, BCTC, bối cảnh thị trường, peer và nguồn nghiên cứu bên ngoài.",
        })
    }

    return cards
}

function getFinancialPeriods(report: AiReportData) {
    return asRecordArray(report.summary?.bctc_3q?.periods)
}

function getPeers(report: AiReportData) {
    return asRecordArray(report.summary?.industry_peer_context?.peers)
}

function getPriceHistory(report: AiReportData) {
    return asRecordArray(report.summary?.price_history)
}

function getBusinessOverview(report: AiReportData) {
    const presentation = asRecord(report.summary?.report_presentation)
    return asRecord(presentation?.business_overview) ?? asRecord(report.summary?.company_overview)
}

function extractRows(record: unknown, keys: readonly string[]) {
    return asRecordArray(getFirstValue(record, keys))
}

function getResearchCards(report: AiReportData): ResearchCard[] {
    const summaryItems = asRecordArray(report.summary?.external_research_context?.items)
    const presentation = asRecord(report.summary?.report_presentation)
    const insights = presentation?.research_insights
    const cards: ResearchCard[] = []

    for (const item of summaryItems) {
        cards.push(mapResearchRecord(item))
    }

    if (Array.isArray(insights)) {
        insights.filter(isRecord).forEach((item) => cards.push(mapResearchRecord(item)))
    } else if (isRecord(insights)) {
        Object.entries(insights).forEach(([group, value]) => {
            if (Array.isArray(value)) {
                value.filter(isRecord).forEach((item) => cards.push(mapResearchRecord(item, group)))
            } else if (typeof value === "string") {
                cards.push({ title: value, group })
            } else if (isRecord(value)) {
                cards.push(mapResearchRecord(value, group))
            }
        })
    }

    return cards
}

function mapResearchRecord(record: JsonRecord, group?: string): ResearchCard {
    const rawSource = toText(getFirstValue(record, ["source", "publisher", "provider", "source_id"]))
    const rawGroup = group ?? toText(getFirstValue(record, ["group", "bucket", "type", "category"]))
    return {
        title: displayText(getFirstValue(record, ["title", "headline", "name"]), "Tin tức/nghiên cứu"),
        source: cleanSourceLabel(rawSource),
        publishedAt: toText(getFirstValue(record, ["published_at", "publishedAt", "date", "time"])),
        tone: toText(getFirstValue(record, ["tone", "sentiment", "category"])),
        group: normalizeResearchGroup(rawGroup ?? toText(getFirstValue(record, ["tone", "sentiment"]))),
        relevance: toText(getFirstValue(record, ["relevance", "relevance_score"])),
        confidence: toText(getFirstValue(record, ["confidence", "confidence_score"])),
        summary: toText(getFirstValue(record, ["summary", "snippet", "detail", "content", "description"])),
        verify: toText(getFirstValue(record, ["what_to_verify", "verify", "verification", "needs_verification"])),
        url: toText(getFirstValue(record, ["url", "link", "source_url"])),
    }
}

function statusTone(status?: string) {
    const normalized = status?.trim().toLowerCase()
    if (!normalized) return "neutral"
    if (["success", "ok", "active", "healthy", "verified", "tích cực", "khá tích cực", "đã ghi nhận"].includes(normalized)) return "success"
    if (["partial", "warning", "pending", "insufficient", "trung tính", "trung bình", "ghi nhận một phần"].includes(normalized)) return "warning"
    if (["failed", "error", "missing", "unavailable", "tiêu cực", "chưa lấy được", "rủi ro cao"].includes(normalized)) return "danger"
    return "neutral"
}

type ReportDisplayStatus = {
    key: "success" | "success_with_warnings" | "failed" | "unknown"
    label: string
    tone: "success" | "warning" | "danger" | "neutral"
    description?: string
}

function normalizeStatusValue(value: unknown) {
    return toText(value)?.trim().toLowerCase()
}

function isFailureStatus(value?: string) {
    return Boolean(value && ["failed", "error", "failure", "không thành công", "thất bại"].includes(value))
}

function isWarningStatus(value?: string) {
    return Boolean(value && ["partial", "warning", "warnings", "degraded", "insufficient", "failed", "error"].includes(value))
}

function getReportWarnings(report: AiReportData) {
    return dedupeTextArray([
        ...toTextArray(report.warnings),
        ...toTextArray(report.summary?.warnings),
    ])
}

function deriveReportDisplayStatus(report: AiReportData): ReportDisplayStatus {
    const summary = report.summary
    const summaryPresentation = summary?.report_presentation
    const hasUsableReport =
        Boolean(report.report_id) &&
        Boolean(summary || report.report_presentation || summaryPresentation)
    const explicitReportStatus = normalizeStatusValue(
        getFirstValue(report, ["report_status", "status", "analysis_status"])
    )
    const historyStatus = normalizeStatusValue(report.history_status)
    const sourceStatus = normalizeStatusValue(report.source_status)
    const providerStatus = normalizeStatusValue(report.provider?.status)
    const warnings = getReportWarnings(report)

    if (!hasUsableReport && (isFailureStatus(explicitReportStatus) || isFailureStatus(providerStatus))) {
        return {
            key: "failed",
            label: "Không thể hoàn tất",
            tone: "danger",
            description: "Không có nội dung báo cáo đủ điều kiện để hiển thị.",
        }
    }

    if (
        hasUsableReport &&
        (
            warnings.length > 0 ||
            isWarningStatus(historyStatus) ||
            isWarningStatus(sourceStatus) ||
            isFailureStatus(explicitReportStatus)
        )
    ) {
        return {
            key: "success_with_warnings",
            label: "Hoàn tất với lưu ý",
            tone: "warning",
            description: "Một số nguồn phụ chưa lấy được dữ liệu, nhưng báo cáo chính đã được tạo.",
        }
    }

    if (hasUsableReport) {
        return {
            key: "success",
            label: "Đã hoàn tất",
            tone: "success",
            description: "Báo cáo phân tích đã sẵn sàng.",
        }
    }

    return {
        key: "unknown",
        label: "Đang cập nhật",
        tone: "neutral",
        description: "Trạng thái báo cáo chưa được hệ thống cập nhật đầy đủ.",
    }
}

function formatReportId(reportId?: string) {
    const trimmed = reportId?.trim()
    if (!trimmed) return FALLBACK
    if (trimmed.length <= 32) return trimmed
    return `${trimmed.slice(0, 18)}...${trimmed.slice(-8)}`
}

function buildScoreOption(scoreCards: ScoreCard[]): EChartsOption {
    return {
        tooltip: { trigger: "axis", confine: true },
        grid: { left: 44, right: 18, top: 18, bottom: 58 },
        xAxis: {
            type: "category",
            data: scoreCards.map((card) => card.label),
            axisLabel: { color: "#64748b", rotate: 28, fontSize: 11 },
            axisLine: { lineStyle: { color: "#cbd5e1" } },
        },
        yAxis: {
            type: "value",
            min: 0,
            max: 100,
            axisLabel: { color: "#64748b" },
            splitLine: { lineStyle: { color: "#e5e7eb" } },
        },
        series: [
            {
                type: "bar",
                data: scoreCards.map((card) => card.value ?? 0),
                itemStyle: { color: "#2563eb", borderRadius: [6, 6, 0, 0] },
                barMaxWidth: 34,
            },
        ],
    }
}

function buildPriceOption(rows: JsonRecord[]): EChartsOption {
    const labels = rows.map((row) => displayText(getFirstValue(row, ["date", "time", "trading_date", "tradingDate"])))
    return {
        tooltip: { trigger: "axis", confine: true },
        legend: { top: 0, textStyle: { color: "#475569" } },
        grid: { left: 52, right: 52, top: 38, bottom: 36 },
        xAxis: {
            type: "category",
            data: labels,
            axisLabel: { color: "#64748b" },
            axisLine: { lineStyle: { color: "#cbd5e1" } },
        },
        yAxis: [
            {
                type: "value",
                name: "Giá",
                scale: true,
                axisLabel: { color: "#64748b" },
                splitLine: { lineStyle: { color: "#e5e7eb" } },
            },
            {
                type: "value",
                name: "KL",
                scale: true,
                axisLabel: { color: "#64748b" },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: "Close",
                type: "line",
                smooth: true,
                showSymbol: false,
                data: rows.map((row) => toNumber(getFirstValue(row, ["close", "close_price", "price", "c"]))),
                lineStyle: { color: "#2563eb", width: 2 },
                areaStyle: { color: "rgba(37,99,235,0.12)" },
            },
            {
                name: "Volume",
                type: "bar",
                yAxisIndex: 1,
                data: rows.map((row) => toNumber(getFirstValue(row, ["volume", "total_volume", "v"]))),
                itemStyle: { color: "rgba(14,165,233,0.34)", borderRadius: [4, 4, 0, 0] },
            },
        ],
    }
}

function buildFinancialResultOption(rows: JsonRecord[]): EChartsOption {
    const labels = rows.map((row) => displayText(getFirstValue(row, ["period", "quarter", "year", "label", "date"])))
    return {
        tooltip: { trigger: "axis", confine: true },
        legend: { top: 0, textStyle: { color: "#475569" } },
        grid: { left: 52, right: 18, top: 42, bottom: 34 },
        xAxis: { type: "category", data: labels, axisLabel: { color: "#64748b" } },
        yAxis: { type: "value", axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#e5e7eb" } } },
        series: [
            {
                name: "LNST",
                type: "bar",
                data: rows.map((row) => toNumber(getFirstValue(row, ["profit_after_tax", "pat", "net_profit"]))),
                itemStyle: { color: "#16a34a", borderRadius: [5, 5, 0, 0] },
            },
            {
                name: "LNTT",
                type: "bar",
                data: rows.map((row) => toNumber(getFirstValue(row, ["profit_before_tax", "pbt"]))),
                itemStyle: { color: "#2563eb", borderRadius: [5, 5, 0, 0] },
            },
            {
                name: "Thu nhập lãi thuần",
                type: "line",
                smooth: true,
                data: rows.map((row) => toNumber(getFirstValue(row, ["net_interest_income", "netInterestIncome", "nii"]))),
                lineStyle: { color: "#f59e0b", width: 2 },
            },
        ],
    }
}

function buildBalanceOption(rows: JsonRecord[]): EChartsOption {
    const labels = rows.map((row) => displayText(getFirstValue(row, ["period", "quarter", "year", "label", "date"])))
    return {
        tooltip: { trigger: "axis", confine: true },
        legend: { top: 0, textStyle: { color: "#475569" } },
        grid: { left: 52, right: 18, top: 42, bottom: 34 },
        xAxis: { type: "category", data: labels, axisLabel: { color: "#64748b" } },
        yAxis: { type: "value", axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#e5e7eb" } } },
        series: [
            {
                name: "Tổng tài sản",
                type: "line",
                smooth: true,
                data: rows.map((row) => toNumber(getFirstValue(row, ["total_assets", "assets"]))),
                lineStyle: { color: "#2563eb", width: 2 },
            },
            {
                name: "Cho vay KH",
                type: "line",
                smooth: true,
                data: rows.map((row) => toNumber(getFirstValue(row, ["customer_loans", "loans", "loan_customers"]))),
                lineStyle: { color: "#16a34a", width: 2 },
            },
            {
                name: "Tiền gửi KH",
                type: "line",
                smooth: true,
                data: rows.map((row) => toNumber(getFirstValue(row, ["customer_deposits", "deposits"]))),
                lineStyle: { color: "#f59e0b", width: 2 },
            },
        ],
    }
}

function buildValuationOption(rows: JsonRecord[]): EChartsOption {
    const labels = rows.map((row) => displayText(getFirstValue(row, ["period", "quarter", "year", "label", "date"])))
    return {
        tooltip: { trigger: "axis", confine: true },
        legend: { top: 0, textStyle: { color: "#475569" } },
        grid: { left: 48, right: 48, top: 42, bottom: 34 },
        xAxis: { type: "category", data: labels, axisLabel: { color: "#64748b" } },
        yAxis: [
            { type: "value", name: "P/E, P/B", axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#e5e7eb" } } },
            { type: "value", name: "ROE, ROA", axisLabel: { color: "#64748b" }, splitLine: { show: false } },
        ],
        series: [
            { name: "P/E", type: "line", smooth: true, data: rows.map((row) => toNumber(getFirstValue(row, ["pe", "p_e", "trailing_pe"]))), lineStyle: { color: "#2563eb" } },
            { name: "P/B", type: "line", smooth: true, data: rows.map((row) => toNumber(getFirstValue(row, ["pb", "p_b"]))), lineStyle: { color: "#0f766e" } },
            { name: "ROE", type: "bar", yAxisIndex: 1, data: rows.map((row) => toNumber(getFirstValue(row, ["roe"]))), itemStyle: { color: "rgba(22,163,74,0.48)", borderRadius: [5, 5, 0, 0] } },
            { name: "ROA", type: "bar", yAxisIndex: 1, data: rows.map((row) => toNumber(getFirstValue(row, ["roa"]))), itemStyle: { color: "rgba(245,158,11,0.48)", borderRadius: [5, 5, 0, 0] } },
        ],
    }
}

function buildPeerOption(rows: JsonRecord[], metricKeys: readonly string[], title: string): EChartsOption {
    return {
        tooltip: { trigger: "axis", confine: true },
        grid: { left: 46, right: 18, top: 26, bottom: 34 },
        xAxis: {
            type: "category",
            data: rows.map((row) => displayText(getFirstValue(row, ["symbol", "ticker", "code"]))),
            axisLabel: { color: "#64748b" },
        },
        yAxis: {
            type: "value",
            name: title,
            axisLabel: { color: "#64748b" },
            splitLine: { lineStyle: { color: "#e5e7eb" } },
        },
        series: [
            {
                type: "bar",
                data: rows.map((row) => toNumber(getFirstValue(row, metricKeys))),
                itemStyle: { color: "#2563eb", borderRadius: [5, 5, 0, 0] },
                barMaxWidth: 38,
            },
        ],
    }
}

function AnalysisStatusBadge({ status }: { status?: string }) {
    return <span className={`ai-report-status ai-report-status--${statusTone(status)}`}>{displayText(status, UNVERIFIED)}</span>
}

function ReportDisplayStatusBadge({ status }: { status: ReportDisplayStatus }) {
    return (
        <span
            className={`ai-report-display-status ai-report-display-status--${status.tone}`}
            title={status.description}
        >
            {status.label}
        </span>
    )
}

function Section({
    id,
    title,
    icon,
    children,
    subtitle,
}: {
    id: string
    title: string
    icon?: ReactNode
    subtitle?: string
    children: ReactNode
}) {
    return (
        <section id={id} className="ai-report-section">
            <div className="ai-report-section__heading">
                <div>
                    <h2>
                        {icon}
                        {title}
                    </h2>
                    {subtitle ? <p>{subtitle}</p> : null}
                </div>
            </div>
            {children}
        </section>
    )
}

function EmptyState({
    message = "Không đủ dữ liệu để dựng biểu đồ này.",
    compact = false,
}: {
    message?: string
    compact?: boolean
}) {
    return (
        <div className={`ai-report-empty ${compact ? "ai-report-empty--compact" : ""}`}>
            <AlertTriangle className="size-4" />
            <span>{message}</span>
        </div>
    )
}

function ChartCard({
    title,
    option,
    hasData,
}: {
    title: string
    option: EChartsOption
    hasData: boolean
}) {
    return (
        <div className="ai-report-chart-card">
            <div className="ai-report-chart-card__title">{title}</div>
            {hasData ? (
                <ReactECharts option={option} className="ai-report-chart" notMerge lazyUpdate />
            ) : (
                <EmptyState />
            )}
        </div>
    )
}

function KeyValueGrid({ rows }: { rows: Array<[string, unknown]> }) {
    const visibleRows = rows.filter(([, value]) => value !== undefined && value !== null && value !== "")

    if (!visibleRows.length) {
        return <EmptyState message={EMPTY_MESSAGE} compact />
    }

    return (
        <div className="ai-report-kv-grid">
            {visibleRows.map(([label, value]) => (
                <div key={label} className="ai-report-kv">
                    <span>{label}</span>
                    <strong>{formatCell(value)}</strong>
                </div>
            ))}
        </div>
    )
}

function TextList({ items, empty = FALLBACK }: { items: string[]; empty?: string }) {
    if (!items.length) return <EmptyState message={empty} compact />
    return (
        <ul className="ai-report-list">
            {items.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
            ))}
        </ul>
    )
}

function AiAnalysisForm({
    form,
    hasAuthToken,
    watchlistStocks,
    watchlistLoading,
    watchlistError,
    selectedStock,
    isLoading,
    isCollapsed,
    endpoint,
    watchlistsEndpoint,
    canAnalyse,
    disableReason,
    onToggleCollapsed,
    onRefreshWatchlists,
    onSelectStock,
    onFieldChange,
    onSubmit,
}: {
    form: AnalysisFormState
    hasAuthToken: boolean
    watchlistStocks: WatchlistStock[]
    watchlistLoading: boolean
    watchlistError: AnalysisErrorState | null
    selectedStock: WatchlistStock | null
    isLoading: boolean
    isCollapsed: boolean
    endpoint: string
    watchlistsEndpoint: string
    canAnalyse: boolean
    disableReason?: string
    onToggleCollapsed: () => void
    onRefreshWatchlists: () => void
    onSelectStock: (stock: WatchlistStock) => void
    onFieldChange: <K extends keyof AnalysisFormState>(field: K, value: AnalysisFormState[K]) => void
    onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
    const models = MODEL_OPTIONS[form.provider]

    if (isCollapsed) {
        return (
            <form className="ai-analysis-form ai-analysis-form--collapsed" onSubmit={onSubmit}>
                <div>
                    <span>Phân tích hiện tại</span>
                    <strong>
                        {selectedStock ? `${selectedStock.symbol} / ${selectedStock.exchange || "HOSE"}` : "Chưa chọn mã"}
                    </strong>
                    <small>
                        {getStockCompanyName(selectedStock)} · {form.provider} · {form.model}
                    </small>
                </div>
                <div className="ai-analysis-form__collapsed-actions">
                    <Button type="submit" size="sm" disabled={!canAnalyse || isLoading} title={disableReason}>
                        {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                        Phân tích lại mã này
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={onToggleCollapsed}>
                        Chọn mã khác
                    </Button>
                </div>
            </form>
        )
    }

    return (
        <form className="ai-analysis-form" onSubmit={onSubmit}>
            <div className="ai-analysis-form__header">
                <div>
                    <h1>AI phân tích cổ phiếu</h1>
                    <p>Chỉ phân tích mã đã có trong danh mục theo dõi của phiên đăng nhập hiện tại.</p>
                </div>
                <Badge variant="outline" className="ai-analysis-form__endpoint">
                    POST {endpoint}
                </Badge>
            </div>

            <div className="ai-analysis-flow">
                <section className={`ai-analysis-step ai-analysis-step--auth ${hasAuthToken ? "is-ok" : "is-blocked"}`}>
                    <div className="ai-analysis-step__heading">
                        <span>Bước 1</span>
                        <h2>Trạng thái xác thực</h2>
                    </div>
                    <p>
                        {hasAuthToken
                            ? "Đã phát hiện phiên đăng nhập."
                            : "Bạn cần đăng nhập để tải danh mục theo dõi và phân tích cổ phiếu."}
                    </p>
                    <small>Token được đọc từ auth store/localStorage hiện tại và không hiển thị trên giao diện.</small>
                </section>

                <section className="ai-analysis-step">
                    <div className="ai-analysis-step__heading ai-analysis-step__heading--row">
                        <div>
                            <span>Bước 2</span>
                            <h2>Chọn mã từ danh mục theo dõi</h2>
                        </div>
                        <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={onRefreshWatchlists}
                            disabled={watchlistLoading || isLoading || !hasAuthToken}
                        >
                            {watchlistLoading ? (
                                <Loader2 className="size-3 animate-spin" />
                            ) : (
                                <RefreshCw className="size-3" />
                            )}
                            {watchlistStocks.length ? "Tải lại danh mục" : "Tải danh mục"}
                        </Button>
                    </div>
                    <Badge variant="outline" className="ai-analysis-form__endpoint">
                        GET {watchlistsEndpoint}
                    </Badge>

                    {watchlistLoading ? (
                        <div className="ai-analysis-watchlist-skeleton">
                            <span />
                            <span />
                            <span />
                        </div>
                    ) : watchlistError ? (
                        <div className="ai-analysis-inline-error">
                            <AlertTriangle className="size-4" />
                            <div>
                                <strong>{watchlistError.message}</strong>
                                <small>
                                    Authorization header: {watchlistError.details?.hasAuthorizationHeader ? "yes" : "no"}
                                </small>
                            </div>
                        </div>
                    ) : watchlistStocks.length === 0 ? (
                        <div className="ai-analysis-watchlist-empty">
                            Chưa tìm thấy mã cổ phiếu nào trong danh mục theo dõi.
                        </div>
                    ) : (
                        <div className="ai-analysis-watchlist-grid" role="radiogroup" aria-label="Chọn mã từ danh mục theo dõi">
                            {watchlistStocks.map((stock) => {
                                const stockKey = getWatchlistStockKey(stock)
                                const selected = selectedStock ? getWatchlistStockKey(selectedStock) === stockKey : false
                                const change = stock.changePercent
                                const changeClass =
                                    change === undefined ? "is-neutral" : change >= 0 ? "is-positive" : "is-negative"

                                return (
                                    <button
                                        key={stockKey}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        className={`ai-analysis-stock-card ${selected ? "is-selected" : ""}`}
                                        onClick={() => onSelectStock(stock)}
                                        disabled={isLoading}
                                    >
                                        <div className="ai-analysis-stock-card__top">
                                            <strong>{stock.symbol}</strong>
                                            <Badge variant="outline">{stock.exchange || "HOSE"}</Badge>
                                        </div>
                                        <span>{getStockCompanyName(stock)}</span>
                                        <div className="ai-analysis-stock-card__meta">
                                            <small>Giá: {formatCell(stock.price)}</small>
                                            <small className={changeClass}>
                                                {change === undefined ? "Change: --" : `Change: ${formatNumber(change, 2)}%`}
                                            </small>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </section>

                <section className="ai-analysis-step">
                    <div className="ai-analysis-step__heading">
                        <span>Bước 3</span>
                        <h2>Cấu hình AI</h2>
                    </div>

            <div className="ai-analysis-form__grid">
                <label>
                    <span>Provider</span>
                    <select
                        value={form.provider}
                        onChange={(event) => {
                            const nextProvider = event.target.value as AnalysisFormState["provider"]
                            const currentDefault = PROVIDER_DEFAULT_MODELS[form.provider]
                            const nextDefault = PROVIDER_DEFAULT_MODELS[nextProvider]
                            onFieldChange("provider", nextProvider)
                            if (!form.model.trim() || form.model === currentDefault) {
                                onFieldChange("model", nextDefault)
                            }
                        }}
                        disabled={isLoading}
                    >
                        <option value="gemini">gemini (ưu tiên cho dài hạn)</option>
                        <option value="openai">openai</option>
                    </select>
                </label>

                <label>
                    <span>Model</span>
                    <input
                        value={form.model}
                        list="ai-analysis-models"
                        onChange={(event) => onFieldChange("model", event.target.value)}
                        disabled={isLoading}
                        placeholder={PROVIDER_DEFAULT_MODELS[form.provider]}
                    />
                    <datalist id="ai-analysis-models">
                        {models.map((model) => (
                            <option key={model} value={model} />
                        ))}
                    </datalist>
                </label>

                <label>
                    <span>Ngôn ngữ</span>
                    <select
                        value={form.language}
                        onChange={(event) => onFieldChange("language", event.target.value)}
                        disabled={isLoading}
                    >
                        <option value="vi">vi</option>
                        <option value="en">en</option>
                    </select>
                </label>

                <label>
                    <span>Khẩu vị rủi ro</span>
                    <select
                        value={form.riskProfile}
                        onChange={(event) => onFieldChange("riskProfile", event.target.value as AiRiskProfile)}
                        disabled={isLoading}
                    >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                    </select>
                </label>

                <label>
                    <span>Thời gian nắm giữ</span>
                    <select
                        value={form.timeHorizon}
                        onChange={(event) => onFieldChange("timeHorizon", event.target.value as AiTimeHorizon)}
                        disabled={isLoading}
                    >
                        <option value="short_term">short_term</option>
                        <option value="medium_term">medium_term</option>
                        <option value="long_term">long_term</option>
                    </select>
                </label>

                <label className="ai-analysis-form__checkbox">
                    <input
                        type="checkbox"
                        checked={form.includeExternalResearch}
                        onChange={(event) => onFieldChange("includeExternalResearch", event.target.checked)}
                        disabled={isLoading}
                    />
                    <span>Bao gồm nghiên cứu/tin tức bên ngoài</span>
                </label>

                <label>
                    <span>Vốn VND</span>
                    <input
                        type="number"
                        min={0}
                        value={form.capitalVnd}
                        onChange={(event) => onFieldChange("capitalVnd", Number(event.target.value))}
                        disabled={isLoading}
                    />
                </label>

                <label>
                    <span>Rủi ro mỗi lệnh (%)</span>
                    <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={form.riskPerTradePct}
                        onChange={(event) => onFieldChange("riskPerTradePct", Number(event.target.value))}
                        disabled={isLoading}
                    />
                </label>

                <label>
                    <span>Tỷ trọng tối đa (%)</span>
                    <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={form.maxPositionPct}
                        onChange={(event) => onFieldChange("maxPositionPct", Number(event.target.value))}
                        disabled={isLoading}
                    />
                </label>
            </div>
                </section>
            </div>

            <div className="ai-analysis-form__footer">
                <p>
                    Bước 4: {selectedStock
                        ? `Sẽ phân tích ${selectedStock.symbol} / ${selectedStock.exchange || "HOSE"} từ danh mục theo dõi.`
                        : "Vui lòng chọn một mã trong danh mục theo dõi trước khi phân tích."}{" "}
                    renderMarkdown=false và renderHtml=false được gửi mặc định.
                </p>
                <Button type="submit" disabled={!canAnalyse || isLoading} size="sm" title={disableReason}>
                    {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    {isLoading ? "Đang phân tích..." : "Phân tích mã đã chọn"}
                </Button>
            </div>
            {disableReason && !canAnalyse ? <div className="ai-analysis-disable-reason">{disableReason}</div> : null}
        </form>
    )
}

function AiAnalysisLoading({
    request,
    currentStep,
    onCancel,
}: {
    request: AnalyseOneRequest
    currentStep: number
    onCancel: () => void
}) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const activeStep = LOADING_STEPS[Math.min(currentStep, LOADING_STEPS.length - 1)]
    const waitingMessage =
        elapsedSeconds >= 90
            ? LONG_ANALYSIS_90S_MESSAGE
            : elapsedSeconds >= 30
              ? LONG_ANALYSIS_30S_MESSAGE
              : LONG_ANALYSIS_NOTE

    useEffect(() => {
        const timer = window.setInterval(() => {
            setElapsedSeconds((current) => current + 1)
        }, 1000)

        return () => window.clearInterval(timer)
    }, [])

    return (
        <section className="ai-analysis-loading">
            <div className="ai-analysis-loading__intro">
                <div>
                    <span>Đang phân tích</span>
                    <strong>
                        {request.symbol} / {request.scopeExchange}
                    </strong>
                    <small>
                        Cấu hình: {request.provider} · {request.model}
                    </small>
                    <small>{LONG_ANALYSIS_NOTE}</small>
                </div>
                <Button type="button" size="xs" variant="outline" onClick={onCancel}>
                    Hủy phân tích
                </Button>
            </div>

            <div className="ai-analysis-loading__spinner">
                <Loader2 className="size-6 animate-spin" />
                <div>
                    <span>Bước hiện tại</span>
                    <strong>{activeStep.label}</strong>
                    <small>{activeStep.description}</small>
                </div>
                <div className="ai-analysis-loading__elapsed">
                    <span>Đã xử lý</span>
                    <strong>{formatElapsedTime(elapsedSeconds)}</strong>
                </div>
            </div>

            <div className="ai-analysis-loading__wait-note" aria-live="polite">
                {waitingMessage}
            </div>

            <div className="ai-analysis-loading__steps">
                {LOADING_STEPS.map((step, index) => (
                    <div
                        key={step.label}
                        className={index <= currentStep ? "is-active" : ""}
                    >
                        <span>{index + 1}</span>
                        <div>
                            <strong>{step.label}</strong>
                            <small>{step.description}</small>
                        </div>
                    </div>
                ))}
            </div>

            <div className="ai-analysis-loading__skeleton">
                <span />
                <span />
                <span />
            </div>
        </section>
    )
}

function AnalysisError({ error }: { error: AnalysisErrorState }) {
    return (
        <section className="ai-analysis-error">
            <div>
                <AlertTriangle className="size-5" />
                <div>
                    <strong>{error.message}</strong>
                    <p>Report trước đó vẫn được giữ lại nếu đã có kết quả thành công.</p>
                </div>
            </div>
            {error.details ? (
                <details>
                    <summary>Chi tiết kỹ thuật</summary>
                    <dl>
                        <div>
                            <dt>HTTP status</dt>
                            <dd>{error.details.httpStatus ?? FALLBACK}</dd>
                        </div>
                        <div>
                            <dt>Method</dt>
                            <dd>{error.details.method ?? FALLBACK}</dd>
                        </div>
                        <div>
                            <dt>URL</dt>
                            <dd>{error.details.url}</dd>
                        </div>
                        <div>
                            <dt>Authorization header</dt>
                            <dd>{error.details.hasAuthorizationHeader ? "yes" : "no"}</dd>
                        </div>
                        <div>
                            <dt>Message</dt>
                            <dd>{error.details.message ?? FALLBACK}</dd>
                        </div>
                    </dl>
                    <pre>
                        {JSON.stringify(
                            {
                                response: error.details.response,
                                stack: error.details.stack,
                            },
                            null,
                            2
                        ).slice(0, 5000)}
                    </pre>
                </details>
            ) : null}
        </section>
    )
}

function ReportTopbar({
    report,
    onCopyReportId,
    copyState,
}: {
    report: AiReportData
    onCopyReportId: () => void
    copyState: string
}) {
    const displayStatus = deriveReportDisplayStatus(report)
    const reportId = report.report_id?.trim()

    return (
        <div className="ai-report-topbar">
            <div>
                <span>AI Stock Report</span>
                <strong>
                    {displayText(report.symbol)} · {displayText(report.scope_exchange)}
                </strong>
            </div>
            <div className="ai-report-topbar__meta">
                <span className="ai-report-topbar__timestamp">{formatDate(report.generated_at)}</span>
                <ReportDisplayStatusBadge status={displayStatus} />
                <div className="ai-report-copy-control" title={reportId ? `Mã báo cáo: ${reportId}` : "Chưa có mã báo cáo"}>
                    <span className="ai-report-copy-control__id">
                        {reportId ? `ID: ${formatReportId(reportId)}` : "Chưa có mã báo cáo"}
                    </span>
                    <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="ai-report-copy-control__button"
                        onClick={onCopyReportId}
                        disabled={!reportId}
                        aria-label="Sao chép mã báo cáo"
                    >
                        <Copy className="size-3" />
                        {copyState || "Sao chép ID"}
                    </Button>
                </div>
            </div>
        </div>
    )
}

function ReportSidebar() {
    return (
        <aside className="ai-report-sidebar">
            <span>Mục lục</span>
            <nav>
                {REPORT_SECTIONS.map(([id, label]) => (
                    <a key={id} href={`#${id}`}>
                        {label}
                    </a>
                ))}
            </nav>
        </aside>
    )
}

function SummaryStrip({ report }: { report: AiReportData }) {
    const kpis = getSummaryKpis(report)

    return (
        <div id="summary-strip" className="ai-report-summary-strip">
            {kpis.map((item) => (
                <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{formatKpiValue(item.value, item.kind)}</strong>
                </div>
            ))}
        </div>
    )
}

function CoverSection({ report }: { report: AiReportData }) {
    const provider = report.provider
    const summary = report.summary
    return (
        <Section id="cover" title="Trang bìa" icon={<FileText className="size-5" />}>
            <div className="ai-report-cover">
                <div>
                    <span>Báo cáo AI phân tích cổ phiếu</span>
                    <h1>{displayText(report.symbol)} - {displayText(report.company)}</h1>
                    <p>{summary?.disclaimer || DISCLAIMER}</p>
                </div>
                <KeyValueGrid
                    rows={[
                        ["Report ID", report.report_id],
                        ["Generated at", formatDate(report.generated_at)],
                        ["Exchange", report.scope_exchange],
                        ["Language", report.language],
                        ["Provider", provider?.name],
                        ["Model", provider?.model],
                        ["Latency", provider?.latency_ms ? `${formatNumber(provider.latency_ms, 0)} ms` : undefined],
                    ]}
                />
            </div>
        </Section>
    )
}

function QuickOverviewSection({ report }: { report: AiReportData }) {
    const kpis = getSummaryKpis(report)
    const latestMarket = getLatestMarket(report)
    const momentum = asRecord(report.summary?.momentum)

    return (
        <Section id="quick-overview" title="Tổng quan nhanh" icon={<Sparkles className="size-5" />}>
            <div className="ai-report-kpi-grid">
                {kpis.map((item) => (
                    <div key={item.label} className="ai-report-kpi">
                        <span>{item.label}</span>
                        <strong>{formatKpiValue(item.value, item.kind)}</strong>
                    </div>
                ))}
            </div>
            <article className="ai-report-callout">
                <strong>Ghi chú đọc nhanh</strong>
                <p>
                    Đọc các KPI này cùng BCTC, bối cảnh ngành và nguồn công bố gốc. Đây là tín hiệu định lượng
                    tham khảo, không thay thế cho kiểm chứng dữ liệu trước khi ra quyết định.
                </p>
                <KeyValueGrid
                    rows={[
                        ["Khối lượng", getFirstValue(latestMarket, ["volume", "total_volume"])],
                        ["Vốn hóa", getFirstValue(latestMarket, ["market_cap", "marketCap"])],
                        ["Xu hướng", getFirstValue(momentum, ["trend", "signal", "summary"])],
                    ]}
                />
            </article>
        </Section>
    )
}

function ExecutiveSummarySection({ report }: { report: AiReportData }) {
    const presentation = getPresentation(report)
    const executive = asRecord(presentation?.executive_summary)
    const systemDecision = getSystemDecision(report)
    const totalScore = getTotalScore(report)
    const status = getDecisionStatus(report)
    const riskLabel = getRiskLabel(report)
    const fallbackThesis = totalScore !== undefined
        ? `Hệ thống đang đánh giá mã ở mức ${scoreLabel(totalScore)} với điểm tổng ${formatNumber(totalScore, 0)}/100. Đây là tín hiệu định lượng tham khảo, cần đối chiếu thêm với BCTC, bối cảnh ngành và nguồn công bố gốc.`
        : `Hệ thống đang đánh giá mã ở trạng thái ${status}. Đây là tín hiệu định lượng tham khảo, cần đối chiếu thêm với BCTC, bối cảnh ngành và nguồn công bố gốc.`
    const reasoning = getFirstValue(systemDecision, ["reasoning", "reasons", "drivers"])
    const summaryText =
        toText(getFirstValue(executive, ["main_thesis", "thesis", "summary"])) ??
        toText(getFirstValue(systemDecision, ["thesis", "decision_reason", "summary", "rationale"])) ??
        (Array.isArray(reasoning) ? toText(reasoning[0]) : toText(reasoning)) ??
        fallbackThesis
    const checks = dedupeTextArray(
        toTextArray(getFirstValue(executive, ["checks", "to_verify", "verification", "watch_items"])).concat(
            toTextArray(getFirstValue(systemDecision, ["checks", "to_verify", "blockers", "constraints"]))
        ),
        6
    )
    const positives = dedupeTextArray(
        toTextArray(getFirstValue(executive, ["positives", "positive_points", "strengths"])).concat(report.summary?.strengths ?? []),
        6
    )
    const risks = dedupeTextArray(
        toTextArray(getFirstValue(executive, ["risks", "risk_points", "weaknesses"])).concat(
            report.summary?.weaknesses ?? [],
            report.summary?.warnings ?? []
        ),
        8
    )

    return (
        <Section id="executive-summary" title="Tóm tắt điều hành" icon={<ClipboardList className="size-5" />}>
            <div className="ai-report-two-col">
                <article className="ai-report-card">
                    <h3>Kết luận nhanh</h3>
                    <DataTable
                        title="Tóm tắt quyết định"
                        rows={[
                            { field: "Trạng thái", value: status },
                            { field: "Luận điểm chính", value: summaryText },
                            { field: "Tỷ lệ tin cậy", value: `${formatConfidence(getDataConfidenceValue(report))} (${riskLabel})` },
                        ]}
                        columns={[
                            ["Trường", ["field"]],
                            ["Giá trị", ["value"]],
                        ]}
                    />
                </article>
                <article className="ai-report-card">
                    <h3>Điều cần kiểm tra</h3>
                    <TextList
                        items={checks.length ? checks : [
                            "Đối chiếu số liệu giá, thanh khoản và định giá với nguồn dữ liệu gốc.",
                            "Kiểm tra BCTC gần nhất, đặc biệt là lợi nhuận sau thuế, dòng tiền và chất lượng tài sản.",
                            "Mở URL tin tức/nghiên cứu gần đây để kiểm tra ngày công bố và phạm vi tác động.",
                            "Đánh giá lại bối cảnh VNINDEX/nhóm ngành nếu thị trường chuyển sang trạng thái rủi ro cao.",
                        ]}
                    />
                </article>
            </div>
            <div className="ai-report-two-col ai-report-mt">
                <article className="ai-report-card">
                    <h3>Điểm tích cực</h3>
                    <TextList items={positives} empty="Chưa có điểm tích cực được xác định." />
                </article>
                <article className="ai-report-card">
                    <h3>Rủi ro chính</h3>
                    <TextList items={risks} empty="Chưa có rủi ro chính được xác định." />
                </article>
            </div>
        </Section>
    )
}

function BusinessOverviewSection({ report }: { report: AiReportData }) {
    const overview = getBusinessOverview(report)
    const [showAllLeadership, setShowAllLeadership] = useState(false)
    const [showAllOwners, setShowAllOwners] = useState(false)
    const leadership = extractRows(overview, ["leadership", "leaders", "management", "board"])
    const ownership = extractRows(overview, ["ownership", "shareholders", "major_shareholders"])
    const drivers = dedupeTextArray(toTextArray(getFirstValue(overview, ["drivers", "business_drivers", "growth_drivers", "watch_items"])), 8)
    const industry = getFirstValue(overview, ["industry", "sector", "group", "industry_group"])
    const industryRows = [
        { field: "Nhóm ngành", value: industry },
        { field: "Ngành chi tiết", value: getFirstValue(overview, ["sub_industry", "industry_detail", "industry_name"]) },
        { field: "Nguồn", value: getFirstValue(overview, ["source", "source_note"]) },
    ]

    return (
        <Section id="business-overview" title="Tổng quan doanh nghiệp" icon={<Building2 className="size-5" />}>
            <p className="ai-report-section-lead">
                {displayText(
                    getFirstValue(overview, ["description", "overview", "business_description"]),
                    `${displayText(report.company)} được trình bày theo dữ liệu doanh nghiệp hiện có. Thông tin ngành, lãnh đạo và sở hữu cần được đối chiếu với nguồn công khai trước khi dùng cho phân tích sâu.`
                )}
            </p>

            <DataTable
                title="Doanh nghiệp"
                rows={[
                    { field: "Doanh nghiệp", value: getFirstValue(overview, ["company", "company_name", "name"]) ?? report.company },
                    { field: "Sàn", value: getFirstValue(overview, ["exchange", "scope_exchange"]) ?? report.scope_exchange },
                    { field: "Nhóm ngành", value: industry },
                    { field: "Mô tả ngắn", value: getFirstValue(overview, ["short_description", "business_line", "description"]) },
                    { field: "Nguồn", value: getFirstValue(overview, ["source", "source_note"]) },
                ]}
                columns={[
                    ["Nội dung", ["field"]],
                    ["Giá trị", ["value"]],
                ]}
            />

            <div className="ai-report-two-col">
                <DataTable
                    title="Ban lãnh đạo"
                    rows={showAllLeadership ? leadership : leadership.slice(0, 5)}
                    columns={[
                        ["Họ tên", ["name", "full_name"]],
                        ["Chức vụ", ["position", "title", "role"]],
                        ["Số cổ phiếu", ["shares", "share_count", "stock_count", "volume"]],
                        ["Tỷ lệ sở hữu", ["ownership_pct", "ownership_percent", "ratio"]],
                        ["Ghi chú/Nguồn", ["note", "source"]],
                    ]}
                    empty="Chưa trích xuất được danh sách ban lãnh đạo từ nguồn công khai trong lần chạy này."
                />
                <DataTable
                    title="Cổ đông lớn"
                    rows={showAllOwners ? ownership : ownership.slice(0, 5)}
                    columns={[
                        ["Cổ đông / Tổ chức / Cá nhân", ["shareholder", "name", "holder"]],
                        ["Số cổ phiếu", ["shares", "share_count", "volume"]],
                        ["Tỷ lệ sở hữu", ["ownership_pct", "ownership_percent", "ratio"]],
                        ["Ghi chú/Nguồn", ["note", "source", "updated_at", "date"]],
                    ]}
                    empty="Chưa trích xuất được danh sách cổ đông lớn từ nguồn công khai trong lần chạy này."
                />
            </div>
            <div className="ai-report-toggle-row">
                {leadership.length > 5 ? (
                    <Button type="button" size="xs" variant="outline" onClick={() => setShowAllLeadership((current) => !current)}>
                        {showAllLeadership ? "Thu gọn lãnh đạo" : "Xem thêm lãnh đạo"}
                    </Button>
                ) : null}
                {ownership.length > 5 ? (
                    <Button type="button" size="xs" variant="outline" onClick={() => setShowAllOwners((current) => !current)}>
                        {showAllOwners ? "Thu gọn sở hữu" : "Xem thêm sở hữu"}
                    </Button>
                ) : null}
            </div>
            <div className="ai-report-two-col">
                <DataTable
                    title="Nhóm ngành tham chiếu"
                    rows={industryRows}
                    columns={[
                        ["Nội dung", ["field"]],
                        ["Giá trị", ["value"]],
                    ]}
                />
                <article className="ai-report-card">
                    <h3>Bối cảnh cần theo dõi</h3>
                    <TextList
                        items={drivers.length ? drivers : [
                            "Tăng trưởng doanh thu/lợi nhuận và chất lượng lợi nhuận trong kỳ BCTC gần nhất.",
                            "Thanh khoản, động lượng giá và phản ứng với bối cảnh VNINDEX/nhóm ngành.",
                            "Tin tức gần đây cần được đọc cùng ngày đăng và nguồn gốc để đánh giá catalyst.",
                        ]}
                    />
                </article>
            </div>
        </Section>
    )
}

function MarketContextSection({ report }: { report: AiReportData }) {
    const presentation = getPresentation(report)
    const marketView = asRecord(presentation?.market_context_view)
    const hoseContext = asRecord(report.summary?.hose_market_context)
    const generalContext = asRecord(report.summary?.market_general_context)
    const market = marketView ?? hoseContext ?? generalContext
    const healthScore = toNumber(
        getFirstValue(marketView, ["health_score", "market_health_score", "score"]) ??
            getFirstValue(hoseContext, ["health_score", "score"])
    )
    const status = toText(getFirstValue(market, ["status", "market_status", "label", "state"])) ?? scoreLabel(healthScore)
    const marketKpis: Array<{ label: string; value: unknown; kind?: Parameters<typeof formatKpiValue>[1] }> = [
        { label: "Chỉ số", value: getFirstValue(market, ["vnindex", "index", "close", "index_value"]) },
        { label: "Biến động", value: getFirstValue(market, ["change", "change_percent", "pct_change"]), kind: "percent" },
        { label: "Thanh khoản", value: getFirstValue(market, ["liquidity", "market_liquidity", "volume"]) },
        { label: "Giá trị giao dịch", value: getFirstValue(market, ["trading_value", "value", "turnover"]) },
        { label: "Trạng thái", value: status },
        { label: "Điểm sức khỏe thị trường", value: healthScore, kind: "score" },
    ]

    return (
        <Section id="market-context" title="Bối cảnh VNINDEX/HoSE" icon={<Landmark className="size-5" />}>
            <p className="ai-report-section-lead">
                {displayText(getFirstValue(market, ["summary", "commentary", "context", "overview"]))}
            </p>
            <div className="ai-report-kpi-grid ai-report-kpi-grid--market">
                {marketKpis.map((item) => (
                    <div key={item.label} className="ai-report-kpi">
                        <span>{item.label}</span>
                        <strong>{formatKpiValue(item.value, item.kind)}</strong>
                    </div>
                ))}
            </div>

            <article className="ai-report-card ai-report-market-health-card">
                <div className="ai-report-market-health-head">
                    <div>
                        <h3>Thước đo sức khỏe thị trường</h3>
                        <p>0 là thận trọng hơn, 100 là tích cực hơn.</p>
                    </div>
                    <span className={`ai-report-status ai-report-status--${statusTone(status)}`}>{status}</span>
                </div>
                <div className="ai-report-market-health-score">
                    <strong>{healthScore === undefined ? UNVERIFIED : `${formatNumber(healthScore, 0)}/100`}</strong>
                    <span>{displayText(getFirstValue(market, ["health_comment", "commentary", "summary"]))}</span>
                </div>
                <div className="ai-report-market-health-track">
                    <span className="zone zone-risk" />
                    <span className="zone zone-neutral" />
                    <span className="zone zone-positive" />
                    <span
                        className="marker"
                        style={{ left: `${healthScore === undefined ? 0 : Math.max(0, Math.min(100, healthScore))}%` }}
                    />
                </div>
                <div className="ai-report-market-health-labels">
                    <span>Thận trọng</span>
                    <span>Trung tính</span>
                    <span>Tích cực</span>
                </div>
            </article>
        </Section>
    )
}

function StockQualityDashboardSection({ report }: { report: AiReportData }) {
    const scoreCards = getScoreCards(report)
    const latestMarket = getLatestMarket(report)
    const dashboardKpis: Array<{ label: string; value: unknown; kind?: Parameters<typeof formatKpiValue>[1] }> = [
        { label: "Giá", value: getFirstValue(latestMarket, ["price", "close", "close_price", "latest_price"]), kind: "price" },
        { label: "Khối lượng", value: getFirstValue(latestMarket, ["volume", "total_volume"]) },
        { label: "EPS", value: getFirstValue(latestMarket, ["eps", "eps_4q"]) },
        { label: "P/E", value: getFirstValue(latestMarket, ["pe", "p_e", "trailing_pe"]), kind: "ratio" },
        { label: "P/B", value: getFirstValue(latestMarket, ["pb", "p_b"]), kind: "ratio" },
        { label: "ROE", value: getFirstValue(latestMarket, ["roe"]), kind: "percent" },
        {
            label: "Momentum",
            value: toNumber(getFirstValue(getScores(report), ["momentum_score"])) ??
                toNumber(getFirstValue(asRecord(report.summary?.momentum), ["score", "momentum_score"])),
        },
        { label: "Điểm tổng", value: getTotalScore(report), kind: "score" },
    ]

    return (
        <Section id="stock-quality-dashboard" title="Dashboard chất lượng cổ phiếu" icon={<BarChart3 className="size-5" />}>
            <div className="ai-report-kpi-grid">
                {dashboardKpis.map((item) => (
                    <div key={item.label} className="ai-report-kpi">
                        <span>{item.label}</span>
                        <strong>{formatKpiValue(item.value, item.kind)}</strong>
                    </div>
                ))}
            </div>
            <div className="ai-report-score-grid">
                {scoreCards.length ? (
                    scoreCards.map((card) => (
                        <div key={card.key} className="ai-report-score-card">
                            <header>
                                <span>{card.label}</span>
                                <strong>
                                    {card.value === undefined
                                        ? FALLBACK
                                        : card.key.toLowerCase().includes("confidence") || card.label.toLowerCase().includes("tin cậy")
                                          ? formatConfidence(card.value)
                                          : formatNumber(card.value, 0)}
                                </strong>
                            </header>
                            <div className="ai-report-score-meter">
                                <span style={{ width: `${card.value === undefined ? 0 : Math.max(0, Math.min(100, card.value))}%` }} />
                            </div>
                            <p><span className="pill">{card.rating ?? scoreLabel(card.value)}</span></p>
                            {card.detail ? <p>{card.detail}</p> : null}
                            {card.dataUsed ? <small>Dữ liệu dùng: {card.dataUsed}</small> : null}
                        </div>
                    ))
                ) : (
                    <EmptyState message="Chưa có điểm chất lượng." compact />
                )}
            </div>
            <ChartCard
                title="Biểu đồ điểm chất lượng"
                option={buildScoreOption(scoreCards)}
                hasData={scoreCards.filter((card) => card.value !== undefined).length >= 2}
            />
        </Section>
    )
}

function FinancialStatementSection({ report }: { report: AiReportData }) {
    const periods = getFinancialPeriods(report)
    const latest = periods[0] ?? periods.at(-1)
    const prior = periods[1]
    const latestPeriod = displayText(getFirstValue(latest, ["period", "quarter", "year", "label", "date"]), "kỳ gần nhất")
    const profitAfterTax = toNumber(getFirstValue(latest, ["profit_after_tax", "pat", "net_profit"]))
    const priorProfitAfterTax = toNumber(getFirstValue(prior, ["profit_after_tax", "pat", "net_profit"]))
    const profitChange = profitAfterTax !== undefined && priorProfitAfterTax
        ? ((profitAfterTax - priorProfitAfterTax) / Math.abs(priorProfitAfterTax)) * 100
        : undefined

    return (
        <Section id="financial-statement-analysis" title="Phân tích tài chính" icon={<Database className="size-5" />}>
            <p className="ai-report-section-lead">
                {periods.length
                    ? `Báo cáo đang dùng ${periods.length} kỳ tài chính có trong dữ liệu đã xác thực. ${latestPeriod} ghi nhận LNST khoảng ${formatCompact(profitAfterTax)}${profitChange === undefined ? "." : `, thay đổi khoảng ${formatPercentValue(profitChange)} so với kỳ liền trước.`}`
                    : "Chưa có dữ liệu BCTC đủ để lập bảng."}
            </p>
            <div className="ai-report-two-col">
                <ChartCard
                    title="Kết quả kinh doanh"
                    option={buildFinancialResultOption(periods)}
                    hasData={periods.length >= 2}
                />
                <ChartCard
                    title="Bảng cân đối"
                    option={buildBalanceOption(periods)}
                    hasData={periods.length >= 2}
                />
            </div>
            <DataTable
                title="Bảng tài chính 3 quý"
                rows={periods}
                columns={FINANCIAL_COLUMNS}
                empty="Chưa có dữ liệu BCTC đủ để lập bảng."
                wide
            />
            <article className="ai-report-card ai-report-mt">
                <h3>Sức khỏe bảng cân đối kỳ gần nhất</h3>
                <KeyValueGrid
                    rows={[
                        ["Tổng tài sản", getFirstValue(latest, ["total_assets", "assets"])],
                        ["Cho vay khách hàng", getFirstValue(latest, ["customer_loans", "loans", "loan_customers"])],
                        ["Tiền gửi khách hàng", getFirstValue(latest, ["customer_deposits", "deposits"])],
                        ["Vốn chủ sở hữu", getFirstValue(latest, ["equity", "owner_equity", "shareholder_equity"])],
                        ["P/E", getFirstValue(latest, ["pe", "p_e", "trailing_pe"])],
                        ["P/B", getFirstValue(latest, ["pb", "p_b"])],
                        ["ROE", getFirstValue(latest, ["roe"])],
                        ["ROA", getFirstValue(latest, ["roa"])],
                    ]}
                />
            </article>
        </Section>
    )
}

function ValuationSection({ report }: { report: AiReportData }) {
    const periods = getFinancialPeriods(report)
    const latest = periods[0] ?? periods.at(-1)
    const latestMarket = getLatestMarket(report)
    const scores = getScores(report)
    const valuationScore = toNumber(getFirstValue(scores, ["valuation_score", "valuation", "valuationScore"]))
    const valuationRows = [
        { field: "EPS", value: getFirstValue(latestMarket, ["eps", "eps_4q"]) ?? getFirstValue(latest, ["eps", "eps_4q"]) },
        { field: "P/E", value: getFirstValue(latestMarket, ["pe", "p_e", "trailing_pe"]) ?? getFirstValue(latest, ["pe", "p_e", "trailing_pe"]) },
        { field: "Forward P/E", value: getFirstValue(latestMarket, ["forward_pe", "forwardPE"]) ?? getFirstValue(latest, ["forward_pe", "forwardPE"]) },
        { field: "P/B", value: getFirstValue(latestMarket, ["pb", "p_b"]) ?? getFirstValue(latest, ["pb", "p_b"]) },
        { field: "BVPS", value: getFirstValue(latestMarket, ["bvps", "book_value_per_share"]) ?? getFirstValue(latest, ["bvps", "book_value_per_share"]) },
        { field: "ROE", value: getFirstValue(latestMarket, ["roe"]) ?? getFirstValue(latest, ["roe"]) },
        { field: "Điểm định giá", value: valuationScore },
    ]

    return (
        <Section id="valuation" title="Định giá" icon={<Scale className="size-5" />}>
            <p className="ai-report-section-lead">
                P/E, P/B, EPS và ROE cần được đọc cùng chất lượng lợi nhuận, đặc thù ngành và độ tin cậy dữ liệu.
                Nếu chỉ số định giá có vẻ bất thường, hãy xem đây là điểm cần kiểm chứng dữ liệu trước khi diễn giải.
            </p>
            <DataTable
                title="Bảng định giá"
                rows={valuationRows}
                columns={[
                    ["Trường", ["field"]],
                    ["Giá trị", ["value"]],
                ]}
            />
            <ChartCard
                title="P/E, P/B, ROE, ROA"
                option={buildValuationOption(periods)}
                hasData={periods.length >= 2}
            />
        </Section>
    )
}

function PeerComparisonSection({ report }: { report: AiReportData }) {
    const peers = getPeers(report)
    const candidates = asRecordArray(report.summary?.same_industry_recommendation?.candidates)
    const presentation = getPresentation(report)
    const referenceCandidates = asRecordArray(presentation?.reference_candidates)
    const recommendationRows = referenceCandidates.length ? referenceCandidates : candidates
    const business = getBusinessOverview(report)

    return (
        <Section id="peer-comparison" title="So sánh peer cùng ngành" icon={<Scale className="size-5" />}>
            <p className="ai-report-section-lead">
                Bảng peer dùng để so sánh tương quan quy mô, định giá, hiệu quả sinh lời và thanh khoản. Đây là danh sách
                tham khảo để theo dõi, không phải khuyến nghị mua/bán cá nhân hóa.
            </p>
            <details className="ai-report-metric-explain">
                <summary>Cách đọc bảng peer</summary>
                <p>
                    P/E phản ánh mức giá thị trường trả cho mỗi đồng lợi nhuận. P/B so sánh giá thị trường với giá trị
                    sổ sách. ROE đọc hiệu quả sinh lời trên vốn chủ. Vốn hóa và thanh khoản giúp đánh giá quy mô và khả
                    năng giao dịch.
                </p>
            </details>
            <DataTable
                title="Ngành"
                rows={[
                    { field: "Ngành cấp cao", value: getFirstValue(business, ["sector", "industry_level_1"]) },
                    { field: "Nhóm ngành", value: getFirstValue(business, ["industry", "group", "industry_group"]) },
                    { field: "Ngành chi tiết", value: getFirstValue(business, ["sub_industry", "industry_detail"]) },
                    { field: "Nguồn", value: getFirstValue(business, ["source", "source_note"]) },
                ]}
                columns={[
                    ["Nội dung", ["field"]],
                    ["Giá trị", ["value"]],
                ]}
            />
            <div className="ai-report-three-col">
                <ChartCard
                    title="Vốn hóa"
                    option={buildPeerOption(peers, ["market_cap", "marketCap", "capitalization"], "Vốn hóa")}
                    hasData={peers.length >= 2}
                />
                <ChartCard
                    title="P/E"
                    option={buildPeerOption(peers, ["pe", "p_e", "trailing_pe"], "P/E")}
                    hasData={peers.length >= 2}
                />
                <ChartCard
                    title="ROE"
                    option={buildPeerOption(peers, ["roe"], "ROE")}
                    hasData={peers.length >= 2}
                />
            </div>
            <DataTable
                title="Peer table"
                rows={peers}
                columns={[
                    ["Mã", ["symbol", "ticker", "code"]],
                    ["Doanh nghiệp", ["company", "company_name", "name"]],
                    ["Giá", ["price", "close", "close_price"]],
                    ["% 1D", ["change_percent", "pct_change", "changePercent"]],
                    ["GT giao dịch", ["trading_value", "value", "turnover"]],
                    ["Vốn hóa", ["market_cap", "marketCap", "capitalization"]],
                    ["EPS 4Q", ["eps_4q", "eps"]],
                    ["P/E", ["pe", "p_e"]],
                    ["P/B", ["pb", "p_b"]],
                    ["ROE", ["roe"]],
                    ["Tín hiệu", ["signal", "rating"]],
                    ["Nhận xét", ["comment", "note", "summary"]],
                ]}
                empty="Chưa đủ dữ liệu xác thực để lập bảng peer định lượng đáng tin cậy."
                wide
            />
            <h3 className="ai-report-subheading">Mã tham khảo cùng nhóm/ngành</h3>
            {recommendationRows.length ? (
                <div className="ai-report-peer-card-grid">
                    {recommendationRows.slice(0, 6).map((row, index) => (
                        <article key={`${displayText(getFirstValue(row, ["symbol", "ticker", "code"]), `peer-${index}`)}-${index}`} className="ai-report-peer-card">
                            <h3>
                                {displayText(getFirstValue(row, ["symbol", "ticker", "code"]))} — {displayText(getFirstValue(row, ["risk_label", "risk", "label"]), "Theo dõi")}
                            </h3>
                            <p><strong>{displayText(getFirstValue(row, ["company", "company_name", "name"]))}</strong></p>
                            <p><strong>Vì sao:</strong> {displayText(getFirstValue(row, ["reason", "rationale", "note"]))}</p>
                            <p><strong>Điểm mạnh:</strong> {formatInlineValue(getFirstValue(row, ["strengths", "pros", "available_strengths"]))}</p>
                            <p><strong>Cần kiểm tra:</strong> {formatInlineValue(getFirstValue(row, ["risks", "checks", "missing_data", "what_to_verify"]))}</p>
                            <p><strong>Dữ liệu đã có:</strong> {formatInlineValue(getFirstValue(row, ["available_data", "data_available"]))}</p>
                            <p><strong>Dữ liệu còn thiếu:</strong> {formatInlineValue(getFirstValue(row, ["missing", "missing_data", "data_missing"]))}</p>
                            <p className="muted">
                                Tỷ lệ tin cậy: {formatConfidence(getFirstValue(row, ["confidence", "confidence_score"]))} · Nguồn: {cleanSourceLabel(toText(getFirstValue(row, ["source", "provider"])))}
                            </p>
                        </article>
                    ))}
                </div>
            ) : (
                <EmptyState message="Chưa có mã tham khảo cùng nhóm/ngành." compact />
            )}
        </Section>
    )
}

function ExternalResearchSection({ report }: { report: AiReportData }) {
    const researchCards = getResearchCards(report)
    const groups = [
        "Rủi ro/tín hiệu cần thận trọng",
        "Bối cảnh ngành/thông tin nền",
        "Catalyst tích cực",
        "Mục cần kiểm chứng",
    ]
    const grouped = groups.map((group) => ({
        group,
        items: researchCards.filter((item) => normalizeResearchGroup(item.group ?? item.tone) === group),
    }))
    const riskCount = grouped.find((item) => item.group === "Rủi ro/tín hiệu cần thận trọng")?.items.length ?? 0
    const backgroundCount = grouped.find((item) => item.group === "Bối cảnh ngành/thông tin nền")?.items.length ?? 0
    const catalystCount = grouped.find((item) => item.group === "Catalyst tích cực")?.items.length ?? 0
    const verifyCount = grouped.find((item) => item.group === "Mục cần kiểm chứng")?.items.length ?? 0

    return (
        <Section id="external-research" title="Tin tức và dữ liệu bên ngoài" icon={<Newspaper className="size-5" />}>
            {researchCards.length ? (
                <>
                    <div className="ai-report-callout">
                        <p>
                            Tin tức được phân loại thành {catalystCount} catalyst tích cực, {riskCount} tín hiệu rủi ro,
                            {" "}{backgroundCount} thông tin nền và {verifyCount} mục cần kiểm chứng. Các mục này chỉ là
                            bằng chứng ngữ cảnh; báo cáo không dùng chúng để tạo số liệu tài chính mới.
                        </p>
                        <p className="muted">Cần mở URL gốc để kiểm chứng trước khi ra quyết định.</p>
                    </div>
                    {grouped.filter((bucket) => bucket.items.length).map((bucket) => (
                        <div key={bucket.group} className="ai-report-research-group">
                            <h3>{bucket.group}</h3>
                            <div className="ai-report-news-grid">
                                {bucket.items.map((item, index) => (
                                    <article key={`${item.title}-${index}`} className="ai-report-news-card">
                                        <div>
                                            <h3 className="ai-report-news-card__title">
                                                {item.url ? (
                                                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                                                        {item.title}
                                                    </a>
                                                ) : (
                                                    item.title
                                                )}
                                            </h3>
                                            <p className="muted">
                                                {item.source || FALLBACK} · {item.publishedAt ? formatDate(item.publishedAt) : FALLBACK}
                                            </p>
                                            <div className="ai-report-news-badges">
                                                {item.tone ? <span className="badge">{item.tone}</span> : null}
                                                <span className="badge">{bucket.group.replace("Rủi ro/tín hiệu cần thận trọng", "Thận trọng")}</span>
                                                <span className="badge">{formatConfidence(item.confidence ?? item.relevance)}</span>
                                            </div>
                                            <p className="ai-report-news-card__snippet">{item.summary || FALLBACK}</p>
                                            <p><strong>Tác động có thể có:</strong> {displayText(item.relevance, "Cần đọc cùng bối cảnh giá, thanh khoản và BCTC.")}</p>
                                        </div>
                                        <div className="ai-report-news-card__footer">
                                            <p className="muted">Cần kiểm tra: {item.verify || "Đối chiếu URL gốc, ngày đăng, doanh nghiệp được nhắc tới và số liệu trong bài."}</p>
                                            {item.url ? (
                                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                                    Mở nguồn
                                                </a>
                                            ) : null}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    ))}
                </>
            ) : (
                <EmptyState message="Chưa có tin tức/nghiên cứu bên ngoài cho lần phân tích này." />
            )}
        </Section>
    )
}

function InvestmentMemoSection({ report, request }: { report: AiReportData; request?: AnalyseOneRequest | null }) {
    const plan = asRecord(report.summary?.investment_plan)
    const decision = asRecord(report.summary?.system_decision)
    const sizing = asRecord(getFirstValue(plan, ["position_sizing", "sizing", "risk_management"]))
    const reasons = toTextArray(getFirstValue(decision, ["reasons", "reasoning", "drivers"]))
    const blockers = toTextArray(getFirstValue(decision, ["blockers", "constraints", "risks"]))

    return (
        <Section id="investment-memo" title="Investment memo" icon={<BookOpen className="size-5" />}>
            <div className="ai-report-two-col">
                <article className="ai-report-card">
                    <h3>System decision</h3>
                    <KeyValueGrid
                        rows={[
                            ["Decision", getFirstValue(decision, ["decision", "action", "rating"])],
                            ["Confidence", getFirstValue(decision, ["confidence", "confidence_score"])],
                            ["Capital", getFirstValue(sizing, ["capital_vnd", "capitalVnd"]) ?? request?.options.capitalVnd],
                            ["Risk/trade", getFirstValue(sizing, ["risk_per_trade_pct", "riskPerTradePct"]) ?? request?.options.riskPerTradePct],
                            ["Max position", getFirstValue(sizing, ["max_position_pct", "maxPositionPct"]) ?? request?.options.maxPositionPct],
                        ]}
                    />
                </article>
                <article className="ai-report-card">
                    <h3>Lý do và blockers</h3>
                    <h4>Lý do</h4>
                    <TextList items={reasons} empty="Chưa có lý do." />
                    <h4>Blockers</h4>
                    <TextList items={blockers} empty="Chưa có blocker rõ ràng." />
                </article>
            </div>
        </Section>
    )
}

function ActionPlanSection({ report }: { report: AiReportData }) {
    const plan = asRecord(report.summary?.investment_plan)
    const rows =
        asRecordArray(getFirstValue(plan, ["actions", "action_table", "plan_rows", "steps"])) ||
        []

    return (
        <Section id="action-plan" title="Kế hoạch hành động" icon={<Target className="size-5" />}>
            <DataTable
                title="Action table"
                rows={rows}
                columns={[
                    ["Hành động", ["action", "name", "step"]],
                    ["Điều kiện", ["condition", "trigger", "rule"]],
                    ["Vùng giá", ["price_zone", "price", "range"]],
                    ["Tỷ trọng", ["position_pct", "position", "weight"]],
                    ["Dừng lỗ", ["stop_loss", "stop"]],
                    ["Ghi chú", ["note", "comment", "rationale"]],
                ]}
                empty="Chưa có kế hoạch hành động dạng bảng."
            />
        </Section>
    )
}

function StrengthsSection({ report }: { report: AiReportData }) {
    return (
        <Section id="strengths" title="Điểm mạnh" icon={<CheckCircle2 className="size-5" />}>
            <TextList items={report.summary?.strengths ?? []} empty="Chưa có điểm mạnh được xác định." />
        </Section>
    )
}

function RisksSection({ report }: { report: AiReportData }) {
    const risks = [...(report.summary?.weaknesses ?? []), ...(report.summary?.warnings ?? [])]
    return (
        <Section id="weaknesses-risks" title="Rủi ro" icon={<ShieldAlert className="size-5" />}>
            <TextList items={risks} empty="Chưa có rủi ro/cảnh báo được xác định." />
        </Section>
    )
}

function ScenarioSection({ report }: { report: AiReportData }) {
    const presentation = asRecord(report.summary?.report_presentation)
    const plan = asRecord(report.summary?.investment_plan)
    const planRows = asRecordArray(getFirstValue(plan, ["scenarios", "scenario_table"]))
    const presentationRows = asRecordArray(presentation?.scenarios)
    const rows = planRows.length ? planRows : presentationRows

    return (
        <Section id="scenario-matrix" title="Kịch bản" icon={<BarChart3 className="size-5" />}>
            <DataTable
                title="Scenario table"
                rows={rows}
                columns={[
                    ["Kịch bản", ["scenario", "name", "case"]],
                    ["Xác suất", ["probability", "prob", "weight"]],
                    ["Điều kiện", ["condition", "trigger"]],
                    ["Hành động", ["action", "plan"]],
                    ["Ghi chú", ["note", "summary"]],
                ]}
                empty="Chưa có dữ liệu kịch bản."
            />
        </Section>
    )
}

function ChecklistSection({ report }: { report: AiReportData }) {
    const presentation = asRecord(report.summary?.report_presentation)
    const plan = asRecord(report.summary?.investment_plan)
    const planChecklist = toTextArray(getFirstValue(plan, ["checklist", "checks"]))
    const presentationChecklist = toTextArray(presentation?.checklist)
    const checklist = planChecklist.length ? planChecklist : presentationChecklist

    return (
        <Section id="checklist" title="Checklist" icon={<ClipboardList className="size-5" />}>
            <TextList items={checklist} empty="Chưa có checklist cho lần phân tích này." />
        </Section>
    )
}

function MetricDictionarySection() {
    return (
        <Section id="metric-dictionary" title="Từ điển chỉ số" icon={<BookOpen className="size-5" />}>
            <DataTable
                title="Metric dictionary"
                rows={[
                    { metric: "P/E", meaning: "Giá trên lợi nhuận mỗi cổ phiếu", note: "Dùng để so sánh định giá tương đối." },
                    { metric: "P/B", meaning: "Giá trên giá trị sổ sách", note: "Quan trọng với ngân hàng và tài chính." },
                    { metric: "ROE", meaning: "Lợi nhuận trên vốn chủ", note: "Đo hiệu quả sinh lời trên vốn." },
                    { metric: "ROA", meaning: "Lợi nhuận trên tổng tài sản", note: "Đo hiệu quả sinh lời trên tài sản." },
                    { metric: "NIM", meaning: "Biên lãi ròng", note: "Chỉ số cốt lõi với ngân hàng." },
                    { metric: "NPL", meaning: "Tỷ lệ nợ xấu", note: "Rủi ro chất lượng tài sản." },
                ]}
                columns={[
                    ["Chỉ số", ["metric"]],
                    ["Ý nghĩa", ["meaning"]],
                    ["Ghi chú", ["note"]],
                ]}
            />
        </Section>
    )
}

function DataCoverageSection({ report }: { report: AiReportData }) {
    const presentation = getPresentation(report)
    const rows = asRecordArray(presentation?.coverage_rows)
    const coverage = asRecord(report.summary?.data_coverage)
    const warnings = dedupeTextArray(report.summary?.warnings ?? [], 12)
    const fallbackCards = [
        {
            name: "Giá và thanh khoản",
            status: displayText(getFirstValue(coverage, ["latest_market", "market", "price_status"]) ?? (getLatestMarket(report) ? "Đã có" : "Chưa đủ")),
            detail: "Dữ liệu phiên gần nhất",
        },
        {
            name: "Chuỗi giá",
            status: getPriceHistory(report).length >= 2 ? "Đã có" : "Chưa đủ",
            detail: `${getPriceHistory(report).length} điểm dữ liệu`,
        },
        {
            name: "Báo cáo tài chính",
            status: getFinancialPeriods(report).length ? "Đã có" : "Chưa đủ",
            detail: `${getFinancialPeriods(report).length} kỳ BCTC`,
        },
        {
            name: "Bối cảnh thị trường",
            status: report.summary?.hose_market_context || report.summary?.market_general_context ? "Đã có" : "Chưa đủ",
            detail: "VNINDEX/HoSE và thanh khoản thị trường",
        },
        {
            name: "So sánh cùng ngành",
            status: getPeers(report).length ? "Đã có" : "Chưa đủ",
            detail: `${getPeers(report).length} peer định lượng`,
        },
        {
            name: "Tin tức/nghiên cứu",
            status: getResearchCards(report).length ? "Đã có" : "Chưa đủ",
            detail: `${getResearchCards(report).length} nguồn phù hợp`,
        },
    ]
    const coverageCards = rows.length
        ? rows.map((row) => ({
              name: displayText(getFirstValue(row, ["name", "dataset", "source"])),
              status: displayText(getFirstValue(row, ["status"])),
              detail: displayText(getFirstValue(row, ["detail", "note", "description", "coverage"])),
          }))
        : fallbackCards

    return (
        <Section id="data-coverage" title="Độ phủ dữ liệu" icon={<Database className="size-5" />}>
            <p className="ai-report-section-lead">
                Phần này tóm tắt mức độ sẵn sàng của dữ liệu theo ngôn ngữ phân tích. Các chi tiết vận hành thô
                không được đưa vào bản báo cáo người dùng.
            </p>
            {warnings.length ? (
                <article className="ai-report-card">
                    <h3>Ghi chú người đọc</h3>
                    <TextList items={warnings} />
                </article>
            ) : null}
            <div className="ai-report-coverage-grid">
                {coverageCards.map((card, index) => (
                    <article key={`${card.name}-${index}`} className="ai-report-coverage-card">
                        <span className="pill">{card.status}</span>
                        <h3>{card.name}</h3>
                        <p>{card.detail}</p>
                    </article>
                ))}
            </div>
        </Section>
    )
}

function DataSourcesSection({ sources }: { sources?: AiReportDataSource[] }) {
    const rows = (sources?.filter(Boolean) ?? []).filter((source) => {
        const haystack = `${source.name ?? ""} ${source.type ?? ""} ${source.detail ?? ""}`.toLowerCase()
        return !haystack.includes("markdown") && !haystack.includes("html") && !haystack.includes(".md") && !haystack.includes(".html")
    })

    return (
        <Section id="data-sources" title="Nguồn đã sử dụng" icon={<Database className="size-5" />}>
            {rows.length ? (
                <div className="ai-report-source-list">
                    {rows.map((source, index) => (
                        <div key={`${source.name}-${index}`} className="ai-report-source-row">
                            <span>{cleanSourceLabel(toText(source.name))}</span>
                            <strong><AnalysisStatusBadge status={source.status} /></strong>
                            <small>{displayText(source.detail || source.type)}</small>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState message="Chưa có nguồn dữ liệu phù hợp để hiển thị." compact />
            )}
        </Section>
    )
}

function DataTable({
    title,
    rows,
    columns,
    empty = FALLBACK,
    wide = false,
}: {
    title: string
    rows: JsonRecord[]
    columns: ReadonlyArray<readonly [string, readonly string[]]>
    empty?: string
    wide?: boolean
}) {
    return (
        <div className="ai-report-table-card">
            <h3>{title}</h3>
            {rows.length ? (
                <div className="ai-report-table-wrap">
                    <table className={`ai-report-table ${wide ? "ai-report-table--wide" : ""}`}>
                        <thead>
                            <tr>
                                {columns.map(([label]) => (
                                    <th key={label}>{label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {columns.map(([label, keys]) => (
                                        <td key={label}>{formatCell(getFirstValue(row, keys))}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState message={empty} compact />
            )}
        </div>
    )
}

function AiReportLayout({
    report,
    request,
    onCopyReportId,
    copyState,
}: {
    report: AiReportData
    request?: AnalyseOneRequest | null
    onCopyReportId: () => void
    copyState: string
}) {
    const priceHistory = getPriceHistory(report)
    const [activeTab, setActiveTab] = useState<ReportTab>("ai-report")
    const [visitedTabs, setVisitedTabs] = useState({ visualization: false, "data-formulator": false })

    const handleTabChange = (tab: ReportTab) => {
        setActiveTab(tab)
        if (tab === "visualization" || tab === "data-formulator") {
            setVisitedTabs((current) => ({ ...current, [tab]: true }))
        }
    }

    return (
        <div className="ai-report">
            <ReportTopbar report={report} onCopyReportId={onCopyReportId} copyState={copyState} />
            <div className={`ai-report__body ${activeTab === "ai-report" ? "" : "ai-report__body--single"}`}>
                {activeTab === "ai-report" ? <ReportSidebar /> : null}
                <main className="ai-report__content">
                    <SummaryStrip report={report} />

                    <div className="ai-report-tabs" role="tablist" aria-label="Các tab báo cáo AI">
                        <button
                            id="ai-report-tab"
                            type="button"
                            role="tab"
                            aria-controls="ai-report-panel"
                            aria-label="Mở tab Báo cáo AI"
                            aria-selected={activeTab === "ai-report"}
                            className={`ai-report-tab ${activeTab === "ai-report" ? "is-active" : ""}`}
                            onClick={() => handleTabChange("ai-report")}
                        >
                            Báo cáo AI
                        </button>
                        <button
                            id="visualization-tab"
                            type="button"
                            role="tab"
                            aria-controls="visualization-panel"
                            aria-label="Mở tab Biểu đồ trực quan"
                            aria-selected={activeTab === "visualization"}
                            className={`ai-report-tab ${activeTab === "visualization" ? "is-active" : ""}`}
                            onClick={() => handleTabChange("visualization")}
                        >
                            Biểu đồ trực quan
                        </button>
                        <button
                            id="data-formulator-tab"
                            type="button"
                            role="tab"
                            aria-controls="data-formulator-panel"
                            aria-label="Mở tab Data Formulator"
                            aria-selected={activeTab === "data-formulator"}
                            className={`ai-report-tab ${activeTab === "data-formulator" ? "is-active" : ""}`}
                            onClick={() => handleTabChange("data-formulator")}
                        >
                            Data Formulator
                        </button>
                    </div>

                    <div id="ai-report-tab-panels">
                        {activeTab === "ai-report" && (
                            <div id="ai-report-panel" role="tabpanel" aria-labelledby="ai-report-tab" data-panel="ai-report">
                                <CoverSection report={report} />
                                <QuickOverviewSection report={report} />
                                <ExecutiveSummarySection report={report} />
                                <BusinessOverviewSection report={report} />
                                <MarketContextSection report={report} />
                                <StockQualityDashboardSection report={report} />
                                <Section id="price-trend" title="Diễn biến giá" icon={<BarChart3 className="size-5" />}>
                                    <ChartCard
                                        title="Close price và volume"
                                        option={buildPriceOption(priceHistory)}
                                        hasData={priceHistory.length >= 2}
                                    />
                                </Section>
                                <FinancialStatementSection report={report} />
                                <ValuationSection report={report} />
                                <PeerComparisonSection report={report} />
                                <ExternalResearchSection report={report} />
                                <InvestmentMemoSection report={report} request={request} />
                                <ActionPlanSection report={report} />
                                <StrengthsSection report={report} />
                                <RisksSection report={report} />
                                <ScenarioSection report={report} />
                                <ChecklistSection report={report} />
                                <MetricDictionarySection />
                                <DataCoverageSection report={report} />
                                <DataSourcesSection sources={report.data_sources} />
                                <div className="ai-report-disclaimer">{report.summary?.disclaimer || DISCLAIMER}</div>
                            </div>
                        )}

                        {(activeTab === "visualization" || visitedTabs.visualization) && (
                            <div id="visualization-panel" role="tabpanel" aria-labelledby="visualization-tab" data-panel="visualization" hidden={activeTab !== "visualization"}>
                                <VisualizationTab report={report} request={request} />
                            </div>
                        )}

                        {(activeTab === "data-formulator" || visitedTabs["data-formulator"]) && (
                            <div id="data-formulator-panel" role="tabpanel" aria-labelledby="data-formulator-tab" data-panel="data-formulator" hidden={activeTab !== "data-formulator"}>
                                <DataFormulatorPanel report={report} request={request} />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}

type AiReportTemplateInput = AiReportData | AnalyseOneResponse

function getReportDataFromTemplateInput(report: AiReportTemplateInput): AiReportData | null {
    if (isRecord(report) && "data" in report) {
        return isRecord(report.data) ? (report.data as AiReportData) : null
    }

    return isRecord(report) ? (report as AiReportData) : null
}

export function AiReportTemplate({
    report,
    request,
}: {
    report: AiReportTemplateInput
    request?: AnalyseOneRequest | null
}) {
    const reportData = getReportDataFromTemplateInput(report)
    const [copyState, setCopyState] = useState("")

    useEffect(() => {
        if (!copyState) return undefined
        const timer = window.setTimeout(() => setCopyState(""), 1800)
        return () => window.clearTimeout(timer)
    }, [copyState])

    const handleCopyReportId = () => {
        const reportId = reportData?.report_id
        if (!reportId) {
            setCopyState("Chưa có mã báo cáo")
            return
        }

        if (navigator.clipboard) {
            void navigator.clipboard.writeText(reportId).then(
                () => setCopyState("Đã sao chép mã báo cáo"),
                () => setCopyState("Không sao chép được mã báo cáo")
            )
            return
        }

        try {
            const textarea = document.createElement("textarea")
            textarea.value = reportId
            textarea.setAttribute("readonly", "true")
            textarea.style.position = "fixed"
            textarea.style.left = "-9999px"
            document.body.appendChild(textarea)
            textarea.select()
            const copied = document.execCommand("copy")
            document.body.removeChild(textarea)
            setCopyState(copied ? "Đã sao chép mã báo cáo" : "Không sao chép được mã báo cáo")
        } catch {
            setCopyState("Không sao chép được mã báo cáo")
        }
    }

    if (!reportData) {
        return <EmptyState message="Không thể render báo cáo vì dữ liệu report không hợp lệ." />
    }

    return (
        <AiReportLayout
            report={reportData}
            request={request}
            onCopyReportId={handleCopyReportId}
            copyState={copyState}
        />
    )
}

export default function StockAnalysisPage() {
    const auth = useAuth()
    const navigate = useNavigate()
    const endpoint = getAnalyseOneUrl()
    const watchlistsEndpoint = getWatchlistsUrl()
    const abortControllerRef = useRef<AbortController | null>(null)
    const downloadedReportIdsRef = useRef<Set<string>>(new Set())
    const [form, setForm] = useState<AnalysisFormState>(DEFAULT_FORM)
    const [authToken, setAuthToken] = useState<string | null>(() => getCurrentAccessToken())
    const [watchlistStocks, setWatchlistStocks] = useState<WatchlistStock[]>([])
    const [watchlistLoading, setWatchlistLoading] = useState(false)
    const [watchlistError, setWatchlistError] = useState<AnalysisErrorState | null>(null)
    const [selectedStock, setSelectedStock] = useState<WatchlistStock | null>(null)
    const [report, setReport] = useState<AiReportData | null>(null)
    const [lastRequest, setLastRequest] = useState<AnalyseOneRequest | null>(null)
    const [error, setError] = useState<AnalysisErrorState | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [loadingStep, setLoadingStep] = useState(0)
    const [isFormCollapsed, setIsFormCollapsed] = useState(false)
    const [historySavedId, setHistorySavedId] = useState<string | null>(null)

    const syncAuthToken = useCallback(() => {
        const nextToken = getCurrentAccessToken() ?? normalizeAuthToken(auth.accessToken)
        setAuthToken(nextToken)
        return nextToken
    }, [auth.accessToken])

    const loadWatchlists = useCallback(async () => {
        const token = syncAuthToken()

        if (!token) {
            setWatchlistStocks([])
            setSelectedStock(null)
            setWatchlistError({
                message: "Bạn cần đăng nhập để tải danh mục theo dõi và phân tích cổ phiếu.",
                details: {
                    url: watchlistsEndpoint,
                    method: "GET",
                    hasAuthorizationHeader: false,
                    message: "Missing auth token",
                },
            })
            return
        }

        setWatchlistLoading(true)
        setWatchlistError(null)

        try {
            const stocks = await getWatchlistStocks()
            setWatchlistStocks(stocks)
            setSelectedStock((current) => (isStockInWatchlist(current, stocks) ? current : null))
        } catch (err) {
            if (err instanceof WatchlistServiceError) {
                setWatchlistError({
                    message: err.message,
                    details: err.technicalDetails,
                })
                return
            }

            setWatchlistError({
                message: "Không tải được danh mục theo dõi từ hệ thống.",
                details: {
                    url: watchlistsEndpoint,
                    method: "GET",
                    hasAuthorizationHeader: Boolean(token),
                    message: err instanceof Error ? err.message : String(err),
                    stack: err instanceof Error ? err.stack : undefined,
                },
            })
        } finally {
            setWatchlistLoading(false)
        }
    }, [syncAuthToken, watchlistsEndpoint])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadWatchlists()
        }, 0)
        return () => window.clearTimeout(timer)
    }, [loadWatchlists])

    useEffect(() => {
        if (!isLoading) return undefined
        const timer = window.setInterval(() => {
            setLoadingStep((current) => Math.min(current + 1, LOADING_STEPS.length - 1))
        }, ANALYSIS_STEP_ADVANCE_MS)
        return () => window.clearInterval(timer)
    }, [isLoading])

    const hasAuthToken = Boolean(authToken)
    const selectedStockIsAllowed = useMemo(
        () => isStockInWatchlist(selectedStock, watchlistStocks),
        [selectedStock, watchlistStocks]
    )
    const disableReason = useMemo(() => {
        if (!hasAuthToken) return "Bạn cần đăng nhập để tải danh mục theo dõi và phân tích cổ phiếu."
        if (watchlistLoading) return "Đang tải danh mục theo dõi, vui lòng chờ."
        if (watchlistError) return "Không tải được danh mục theo dõi từ hệ thống."
        if (!selectedStock) return "Vui lòng chọn một mã trong danh mục theo dõi trước khi phân tích."
        if (!selectedStockIsAllowed) return "Mã này không nằm trong danh mục theo dõi nên không thể phân tích."
        if (!form.provider.trim()) return "Vui lòng chọn provider AI."
        if (!form.model.trim()) return "Vui lòng nhập hoặc chọn model AI."
        if (isLoading) return "Đang phân tích, vui lòng chờ."
        return undefined
    }, [
        form.model,
        form.provider,
        hasAuthToken,
        isLoading,
        selectedStock,
        selectedStockIsAllowed,
        watchlistError,
        watchlistLoading,
    ])
    const canAnalyse = !disableReason
    const handleFieldChange = <K extends keyof AnalysisFormState>(
        field: K,
        value: AnalysisFormState[K]
    ) => {
        setForm((current) => {
            const next = { ...current, [field]: value }
            if (field === "timeHorizon" && (value === "long_term" || value === "long")) {
                next.provider = "gemini"
                next.model = GEMINI_PREFERRED_MODEL
            }
            return next
        })
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const token = syncAuthToken()
        const model = form.model.trim()

        if (!token) {
            setError({
                message: "Bạn cần đăng nhập để tải danh mục theo dõi và phân tích cổ phiếu.",
                details: {
                    url: endpoint,
                    method: "POST",
                    hasAuthorizationHeader: false,
                    message: "Missing auth token",
                },
            })
            return
        }

        if (!selectedStock) {
            setError({ message: "Vui lòng chọn một mã trong danh mục theo dõi trước khi phân tích." })
            return
        }

        if (!isStockInWatchlist(selectedStock, watchlistStocks)) {
            setError({ message: "Mã này không nằm trong danh mục theo dõi nên không thể phân tích." })
            return
        }

        if (!model) {
            setError({ message: "Vui lòng nhập hoặc chọn model AI." })
            return
        }

        const request = buildRequest({ ...form, model }, selectedStock)
        const controller = new AbortController()
        abortControllerRef.current?.abort()
        abortControllerRef.current = controller

        setForm((current) => ({ ...current, model }))
        setLastRequest(request)
        setError(null)
        setHistorySavedId(null)
        setIsLoading(true)
        setLoadingStep(0)

        try {
            const response = await analyseOneStock(request, controller.signal)
            const nextReport = response.data ?? null
            setReport(nextReport)
            setHistorySavedId(nextReport?.history_id?.trim() || null)
            if (nextReport?.history_id?.trim()) {
                invalidateAiReportHistoryCache()
            }
            setIsFormCollapsed(true)
            // Auto-download visualization export package once after a successful analysis if enabled
            if (nextReport && nextReport.report_id && autoDownloadVisualizationExport) {
                const reportId = nextReport.report_id.trim()
                if (!downloadedReportIdsRef.current.has(reportId)) {
                    ;(async () => {
                        try {
                            const resp = await fetchVisualizationJson(request ?? undefined, nextReport?.history_id ?? undefined)
                            const dataset = resp.data
                            if (dataset) {
                                try {
                                    const zipBlob = await buildZipExportPackage(dataset, dataset.symbol || nextReport.symbol)
                                    const filename = `${(dataset.symbol || nextReport.symbol || "visualization").replace(/\s+/g, "_")}_${new Date()
                                        .toISOString()
                                        .replace(/[:.]/g, "")}_visualization_export.zip`
                                    downloadBlob(filename, zipBlob)
                                    downloadedReportIdsRef.current.add(reportId)
                                } catch {
                                    // Fallback: download JSON only
                                    const jsonBlob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" })
                                    downloadBlob(`${(dataset.symbol || nextReport.symbol || "visualization").replace(/\s+/g, "_")}_visualization_data.json`, jsonBlob)
                                    downloadedReportIdsRef.current.add(reportId)
                                }
                            }
                        } catch {
                            // ignore auto-download errors (show nothing); user can download manually in Data Formulator tab
                            // Optionally, we could surface a toast here.
                        }
                    })()
                }
            }
        } catch (err) {
            if (err instanceof AnalyseServiceError && err.kind === "cancelled") {
                setError({
                    message: "Yêu cầu phân tích đã được hủy.",
                    details: err.technicalDetails,
                })
                return
            }

            if (err instanceof AnalyseServiceError) {
                setError({
                    message: err.message,
                    details: err.technicalDetails,
                })
                return
            }

            setError({
                message: "Đã xảy ra lỗi không xác định khi phân tích cổ phiếu.",
                details: {
                    url: endpoint,
                    method: "POST",
                    hasAuthorizationHeader: true,
                    message: err instanceof Error ? err.message : String(err),
                    stack: err instanceof Error ? err.stack : undefined,
                },
            })
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null
            }
            setIsLoading(false)
        }
    }

    const handleCancel = () => {
        abortControllerRef.current?.abort()
    }

    return (
        <div className="ai-analysis-page">
            <Breadcrumb items={["Home", "AI phân tích cổ phiếu"]} />

            <AiAnalysisForm
                form={form}
                hasAuthToken={hasAuthToken}
                watchlistStocks={watchlistStocks}
                watchlistLoading={watchlistLoading}
                watchlistError={watchlistError}
                selectedStock={selectedStock}
                isLoading={isLoading}
                isCollapsed={isFormCollapsed && Boolean(report) && !isLoading}
                endpoint={endpoint}
                watchlistsEndpoint={watchlistsEndpoint}
                canAnalyse={canAnalyse}
                disableReason={disableReason}
                onToggleCollapsed={() => setIsFormCollapsed(false)}
                onRefreshWatchlists={() => void loadWatchlists()}
                onSelectStock={(stock) => {
                    setSelectedStock(stock)
                    setError(null)
                    setHistorySavedId(null)
                    setIsFormCollapsed(false)
                }}
                onFieldChange={handleFieldChange}
                onSubmit={handleSubmit}
            />

            {isLoading && lastRequest ? (
                <AiAnalysisLoading
                    request={lastRequest}
                    currentStep={loadingStep}
                    onCancel={handleCancel}
                />
            ) : null}

            {error ? <AnalysisError error={error} /> : null}

            {historySavedId ? (
                <section className="ai-analysis-history-notice">
                    <CheckCircle2 className="size-5" />
                    <div>
                        <strong>Đã lưu báo cáo vào lịch sử.</strong>
                        <p>Đã lưu vào lịch sử báo cáo</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/stock-analysis/history")}
                    >
                        Xem lịch sử báo cáo
                    </Button>
                </section>
            ) : null}

            {report ? (
                <AiReportTemplate report={report} request={lastRequest} />
            ) : (
                !isLoading && (
                    <section className="ai-analysis-empty">
                        <Sparkles className="size-6" />
                        <div>
                            <strong>Sẵn sàng dựng báo cáo AI từ dữ liệu phân tích</strong>
                            <p>Chọn một mã trong danh mục theo dõi rồi bấm phân tích để xem báo cáo đầy đủ.</p>
                        </div>
                    </section>
                )
            )}

            <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="ai-analysis-scroll-top"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                aria-label="Scroll to top"
            >
                <ArrowUp className="size-4" />
            </Button>
        </div>
    )
}
