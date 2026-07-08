import { useCallback, useState } from "react"
import {
    getHoldingsPnl,
    getHoldingsAdvice,
    type HoldingsItem,
    type HoldingsAdviceItem,
    type PortfolioData,
    PortfolioServiceError,
} from "@/services/holdings-pnl.service"

export type MergedHoldingItem = HoldingsItem & {
    advice: HoldingsAdviceItem | null
}

export type UsePortfolioAnalysisResult = {
    portfolio: PortfolioData | null
    items: MergedHoldingItem[]
    pnlLoading: boolean
    aiLoading: boolean
    pnlError: string | null
    aiError: string | null
    generatedAt?: string
    dataAsOf?: string
    cachedCount?: number
    generatedCount?: number
    fallbackCount?: number
    load: (options?: { forceRefresh?: boolean }) => Promise<void>
    isReady: boolean
}

/**
 * 2-Tier portfolio analysis hook
 * - Tier 1: Fetch P&L instantly (< 500ms)
 * - Tier 2: Fetch AI advice async (30-120s or cache < 1s)
 */
export function usePortfolioAnalysis(): UsePortfolioAnalysisResult {
    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
    const [pnlItems, setPnlItems] = useState<HoldingsItem[]>([])
    const [adviceData, setAdviceData] = useState<HoldingsAdviceItem[]>([])

    const [pnlLoading, setPnlLoading] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    const [pnlError, setPnlError] = useState<string | null>(null)
    const [aiError, setAiError] = useState<string | null>(null)

    const [generatedAt, setGeneratedAt] = useState<string>()
    const [dataAsOf, setDataAsOf] = useState<string>()
    const [cachedCount, setCachedCount] = useState<number>()
    const [generatedCount, setGeneratedCount] = useState<number>()
    const [fallbackCount, setFallbackCount] = useState<number>()

    const load = useCallback(async (options?: { forceRefresh?: boolean }) => {
        // ── Tier 1: Load P&L instantly ──────────────────────────────
        setPnlLoading(true)
        setPnlError(null)
        setAdviceData([])
        setAiError(null)

        let pnl
        try {
            pnl = await getHoldingsPnl()
            setPortfolio(pnl.portfolio)
            setPnlItems(pnl.items)
            setGeneratedAt(pnl.generated_at)
            setDataAsOf(pnl.data_as_of)
        } catch (err) {
            const message =
                err instanceof PortfolioServiceError
                    ? err.message
                    : "Không tải được dữ liệu P&L"
            setPnlError(message)
            setPnlLoading(false)
            return // Don't load Tier 2 if Tier 1 fails
        } finally {
            setPnlLoading(false)
        }

        // ── Tier 2: Load AI advice (async) ──────────────────────────
        if (!pnl.items?.length) return

        setAiLoading(true)
        try {
            const advice = await getHoldingsAdvice(pnl.items, {
                forceRefresh: options?.forceRefresh,
            })
            setAdviceData(advice.advice ?? [])
            setGeneratedAt(advice.generated_at)
            setCachedCount(advice.cached_count)
            setGeneratedCount(advice.generated_count)
            setFallbackCount(advice.fallback_count)
        } catch (err) {
            const message =
                err instanceof PortfolioServiceError
                    ? err.message
                    : "Không tải được phân tích AI"
            setAiError(message)
        } finally {
            setAiLoading(false)
        }
    }, [])

    // Merge P&L + Advice per symbol
    const mergedItems: MergedHoldingItem[] = pnlItems.map(item => {
        const adviceItem = adviceData.find(a => a.symbol === item.symbol) ?? null
        return { ...item, advice: adviceItem }
    })

    return {
        portfolio,
        items: mergedItems,
        pnlLoading,
        aiLoading,
        pnlError,
        aiError,
        generatedAt,
        dataAsOf,
        cachedCount,
        generatedCount,
        fallbackCount,
        load,
        isReady: portfolio !== null && pnlItems.length > 0,
    }
}
