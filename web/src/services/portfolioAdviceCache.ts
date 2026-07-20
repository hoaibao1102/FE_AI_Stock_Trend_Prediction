import type { HoldingsAdviceItem, HoldingsItem, PortfolioData } from "@/services/holdings-pnl.service"

const STORAGE_KEY = "portfolio_daily_advice_v1"

export type PortfolioAdviceCacheEntry = {
    adviceDate: string
    symbolsKey: string
    advice: HoldingsAdviceItem[]
    portfolio: PortfolioData | null
    items: HoldingsItem[]
    generatedAt?: string
    dataAsOf?: string
    cachedCount?: number
    generatedCount?: number
    fallbackCount?: number
    savedAt: string
}

function getTodayVn(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date())
}

export function buildPortfolioSymbolsKey(symbols: string[]): string {
    return [...new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean))].sort().join(",")
}

function readAll(): PortfolioAdviceCacheEntry | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as PortfolioAdviceCacheEntry
        if (!parsed?.adviceDate || !Array.isArray(parsed.advice)) return null
        return parsed
    } catch {
        return null
    }
}

export function getPortfolioAdviceCache(symbols: string[]): PortfolioAdviceCacheEntry | null {
    const entry = readAll()
    if (!entry) return null

    const today = getTodayVn()
    const symbolsKey = buildPortfolioSymbolsKey(symbols)

    if (entry.adviceDate !== today || entry.symbolsKey !== symbolsKey) {
        return null
    }

    if (!entry.advice.length) return null

    return entry
}

export function setPortfolioAdviceCache(payload: Omit<PortfolioAdviceCacheEntry, "adviceDate" | "symbolsKey" | "savedAt"> & {
    symbols: string[]
}): void {
    try {
        const entry: PortfolioAdviceCacheEntry = {
            adviceDate: getTodayVn(),
            symbolsKey: buildPortfolioSymbolsKey(payload.symbols),
            advice: payload.advice,
            portfolio: payload.portfolio,
            items: payload.items,
            generatedAt: payload.generatedAt,
            dataAsOf: payload.dataAsOf,
            cachedCount: payload.cachedCount,
            generatedCount: payload.generatedCount,
            fallbackCount: payload.fallbackCount,
            savedAt: new Date().toISOString(),
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
    } catch {
        // sessionStorage full or unavailable — ignore
    }
}

export function clearPortfolioAdviceCache(): void {
    try {
        sessionStorage.removeItem(STORAGE_KEY)
    } catch {
        // ignore
    }
}
