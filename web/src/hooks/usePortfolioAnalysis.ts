import { useCallback, useState } from "react"
import {
    getHoldingsPnl,
    getHoldingsAdvice,
    type HoldingsItem,
    type HoldingsAdviceItem,
    type PortfolioData,
    PortfolioServiceError,
} from "@/services/holdings-pnl.service"
import {
    enrichHoldingsItem,
    enrichHoldingsItemsWithAllocation,
    buildPortfolioSummaryFromItems,
} from "@/components/holdings/portfolio-metrics"
import {
    clearPortfolioAdviceCache,
    getPortfolioAdviceCache,
    setPortfolioAdviceCache,
} from "@/services/portfolioAdviceCache"

export type MergedHoldingItem = HoldingsItem & {
    advice: HoldingsAdviceItem | null
    adviceLoading?: boolean
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

function buildItemsFromPnl(pnlItems: HoldingsItem[]): HoldingsItem[] {
    return enrichHoldingsItemsWithAllocation(
        pnlItems
            .filter(item => item.symbol)
            .map(item => enrichHoldingsItem(item)),
    )
}

/**
 * - Tier 1: P&L API only (single round-trip)
 * - Tier 2: AI advice — skip if client + server daily cache hit
 */
export function usePortfolioAnalysis(): UsePortfolioAnalysisResult {
    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
    const [pnlItems, setPnlItems] = useState<HoldingsItem[]>([])
    const [adviceData, setAdviceData] = useState<HoldingsAdviceItem[]>([])
    const [adviceLoadingSymbols, setAdviceLoadingSymbols] = useState<Set<string>>(new Set())

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
        const forceRefresh = options?.forceRefresh ?? false
        if (forceRefresh) {
            clearPortfolioAdviceCache()
        }

        setPnlError(null)
        setAiError(null)

        let mergedItems: HoldingsItem[] = []
        let portfolioSummary: PortfolioData | null = null
        let generatedAtValue: string | undefined
        let dataAsOfValue: string | undefined

        setPnlLoading(true)
        try {
            const pnlResult = await getHoldingsPnl()
            mergedItems = buildItemsFromPnl(pnlResult.items)
            portfolioSummary = pnlResult.portfolio ?? buildPortfolioSummaryFromItems(mergedItems)
            generatedAtValue = pnlResult.generated_at
            dataAsOfValue = pnlResult.data_as_of

            setPortfolio(portfolioSummary)
            setPnlItems(mergedItems)
            setGeneratedAt(generatedAtValue)
            setDataAsOf(dataAsOfValue)
        } catch (err) {
            const message =
                err instanceof PortfolioServiceError
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : "Không tải được dữ liệu danh mục"
            setPnlError(message)
            setPnlLoading(false)
            return
        } finally {
            setPnlLoading(false)
        }

        if (!mergedItems.length) {
            setAdviceData([])
            return
        }

        const symbols = mergedItems.map(item => item.symbol!).filter(Boolean)
        const clientCache = !forceRefresh ? getPortfolioAdviceCache(symbols) : null

        if (clientCache) {
            setAdviceData(clientCache.advice)
            setCachedCount(clientCache.cachedCount)
            setGeneratedCount(clientCache.generatedCount ?? 0)
            setFallbackCount(clientCache.fallbackCount ?? 0)
            if (clientCache.generatedAt) setGeneratedAt(clientCache.generatedAt)
            if (clientCache.dataAsOf) setDataAsOf(clientCache.dataAsOf)
            setAdviceLoadingSymbols(new Set())
            setAiLoading(false)
            return
        }

        setAiLoading(true)
        setAdviceLoadingSymbols(new Set(symbols.map(s => s.toUpperCase())))

        try {
            const advice = await getHoldingsAdvice(mergedItems, {
                forceRefresh,
                portfolio: portfolioSummary,
            })

            const adviceItems = advice.advice ?? []
            setAdviceData(adviceItems)
            setCachedCount(advice.cached_count)
            setGeneratedCount(advice.generated_count)
            setFallbackCount(advice.fallback_count)
            if (advice.generated_at) {
                setGeneratedAt(advice.generated_at)
            }

            if (adviceItems.length > 0) {
                setPortfolioAdviceCache({
                    symbols,
                    advice: adviceItems,
                    portfolio: portfolioSummary,
                    items: mergedItems,
                    generatedAt: advice.generated_at ?? generatedAtValue,
                    dataAsOf: dataAsOfValue,
                    cachedCount: advice.cached_count,
                    generatedCount: advice.generated_count,
                    fallbackCount: advice.fallback_count,
                })
            }
        } catch (err) {
            const message =
                err instanceof PortfolioServiceError
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : "Không tải được phân tích AI danh mục"
            setAiError(message)
        } finally {
            setAdviceLoadingSymbols(new Set())
            setAiLoading(false)
        }
    }, [])

    const mergedItems: MergedHoldingItem[] = pnlItems.map(item => {
        const symbolKey = item.symbol?.toUpperCase()
        const adviceItem = adviceData.find(
            a => a.symbol?.toUpperCase() === symbolKey,
        ) ?? null
        return {
            ...item,
            advice: adviceItem,
            adviceLoading: symbolKey ? adviceLoadingSymbols.has(symbolKey) : false,
        }
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
