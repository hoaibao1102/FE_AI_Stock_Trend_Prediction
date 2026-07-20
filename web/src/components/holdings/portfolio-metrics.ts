import type { HoldingsItem, PortfolioData } from "@/services/holdings-pnl.service"
import type { HoldingItem } from "@/types/holdings"

function round2(value: number) {
    return Math.round(value * 100) / 100
}

function toChartNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (value == null) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

/** Normalize 7D chart points for consistent sparkline rendering. */
export function normalizePrices7d(
    prices?: HoldingsItem["prices_7d"],
): HoldingsItem["prices_7d"] {
    if (!Array.isArray(prices) || prices.length === 0) return []

    const normalized = prices
        .map(point => {
            const close = toChartNumber(point.close)
            if (close == null) return null
            return {
                ...point,
                date: String(point.date ?? ""),
                close,
                open: toChartNumber(point.open) ?? undefined,
                high: toChartNumber(point.high) ?? undefined,
                low: toChartNumber(point.low) ?? undefined,
                volume: toChartNumber(point.volume) ?? undefined,
            }
        })
        .filter((point): point is NonNullable<typeof point> => point != null)

    if (normalized.length === 1) {
        return [normalized[0], { ...normalized[0] }]
    }

    return normalized
}

export type HoldingPnlMetrics = {
    market_value: number | null
    cost: number
    unrealized_pnl: number | null
    unrealized_pnl_pct: number | null
    status: "PROFIT" | "LOSS" | null
}

/** Tính P&L thống nhất từ giá vốn, số lượng và giá thị trường. */
export function computeHoldingPnlMetrics(item: {
    average_cost?: number | null
    quantity?: number | null
    close_price?: number | null
    market_value?: number | null
    cost?: number | null
    unrealized_pnl?: number | null
    unrealized_pnl_pct?: number | null
    status?: string | null
}): HoldingPnlMetrics {
    const quantity = item.quantity ?? 0
    const averageCost = item.average_cost ?? 0
    const cost = item.cost ?? averageCost * quantity
    const closePrice = item.close_price ?? null
    const marketValue =
        item.market_value ??
        (closePrice != null && quantity > 0 ? closePrice * quantity : null)

    let unrealizedPnl = item.unrealized_pnl ?? null
    let unrealizedPnlPct = item.unrealized_pnl_pct ?? null

    if (marketValue != null) {
        if (unrealizedPnl == null) {
            unrealizedPnl = marketValue - cost
        }
        if (unrealizedPnlPct == null && cost > 0) {
            unrealizedPnlPct = (unrealizedPnl / cost) * 100
        } else if (unrealizedPnlPct == null && averageCost > 0 && closePrice != null) {
            unrealizedPnlPct = ((closePrice - averageCost) / averageCost) * 100
        }
    }

    const status: HoldingPnlMetrics["status"] =
        unrealizedPnl != null
            ? unrealizedPnl >= 0
                ? "PROFIT"
                : "LOSS"
            : null

    return {
        market_value: marketValue,
        cost,
        unrealized_pnl: unrealizedPnl != null ? Math.round(unrealizedPnl) : null,
        unrealized_pnl_pct:
            unrealizedPnlPct != null ? round2(unrealizedPnlPct) : null,
        status,
    }
}

export function enrichHoldingsItem(item: HoldingsItem): HoldingsItem {
    const metrics = computeHoldingPnlMetrics(item)
    return {
        ...item,
        market_value: metrics.market_value ?? item.market_value,
        cost: metrics.cost,
        unrealized_pnl: metrics.unrealized_pnl,
        unrealized_pnl_pct: metrics.unrealized_pnl_pct,
        status: metrics.status ?? undefined,
        prices_7d: normalizePrices7d(item.prices_7d),
    }
}

export function enrichHoldingsItemsWithAllocation(items: HoldingsItem[]): HoldingsItem[] {
    const withMetrics = items.map(enrichHoldingsItem)

    let totalMarketValue = 0
    let totalCost = 0

    for (const item of withMetrics) {
        if (item.market_value != null && item.market_value > 0) {
            totalMarketValue += item.market_value
        }
        if (item.cost != null && item.cost > 0) {
            totalCost += item.cost
        }
    }

    const useMarketValueBase = totalMarketValue > 0

    return withMetrics
        .map(item => {
            let allocationPct: number | null = null

            if (useMarketValueBase && item.market_value != null && item.market_value > 0) {
                allocationPct = round2((item.market_value / totalMarketValue) * 100)
            } else if (!useMarketValueBase && totalCost > 0 && item.cost != null && item.cost > 0) {
                allocationPct = round2((item.cost / totalCost) * 100)
            } else if (withMetrics.length === 1) {
                allocationPct = 100
            }

            return {
                ...item,
                allocation_pct: allocationPct,
            }
        })
        .sort((a, b) => (b.allocation_pct ?? 0) - (a.allocation_pct ?? 0))
}

export function buildPortfolioSummaryFromItems(items: HoldingsItem[]): PortfolioData {
    let totalCost = 0
    let totalMarketValue = 0
    let countProfit = 0
    let countLoss = 0
    let countNeutral = 0

    for (const item of items) {
        const metrics = computeHoldingPnlMetrics(item)
        totalCost += metrics.cost

        if (metrics.market_value != null) {
            totalMarketValue += metrics.market_value
            if (metrics.status === "PROFIT") countProfit += 1
            else if (metrics.status === "LOSS") countLoss += 1
            else countNeutral += 1
        } else {
            countNeutral += 1
        }
    }

    const totalUnrealizedPnl = totalMarketValue - totalCost
    const totalUnrealizedPnlPct = totalCost > 0
        ? (totalUnrealizedPnl / totalCost) * 100
        : 0

    return {
        total_cost: Math.round(totalCost),
        total_market_value: Math.round(totalMarketValue),
        total_unrealized_pnl: Math.round(totalUnrealizedPnl),
        total_unrealized_pnl_pct: round2(totalUnrealizedPnlPct),
        count_profit: countProfit,
        count_loss: countLoss,
        position_count: items.length,
        count_neutral: countNeutral,
    }
}

export function getEffectiveMarketValue(
    holding: HoldingItem,
    pnl?: HoldingsItem | null,
): number | null {
    if (pnl?.market_value != null && Number.isFinite(pnl.market_value)) {
        return pnl.market_value
    }

    const price = pnl?.close_price ?? holding.latest_market_price
    if (price == null || !Number.isFinite(price)) {
        return null
    }

    return price * holding.quantity
}

export function getEffectiveCost(holding: HoldingItem, pnl?: HoldingsItem | null): number {
    if (pnl?.cost != null && Number.isFinite(pnl.cost)) {
        return pnl.cost
    }

    return holding.average_cost * holding.quantity
}

export function buildPortfolioAllocationMap(
    holdings: HoldingItem[],
    pnlBySymbol: Record<string, HoldingsItem>,
): Record<string, number | null> {
    const mergedItems: HoldingsItem[] = holdings
        .filter(h => h.stock?.symbol)
        .map(holding => {
            const symbol = holding.stock!.symbol.toUpperCase()
            const pnl = pnlBySymbol[symbol]
            return enrichHoldingsItem({
                symbol,
                average_cost: pnl?.average_cost ?? holding.average_cost,
                quantity: pnl?.quantity ?? holding.quantity,
                close_price: pnl?.close_price ?? holding.latest_market_price ?? undefined,
                market_value: pnl?.market_value,
                cost: pnl?.cost ?? holding.total_cost,
            })
        })

    const allocationMap: Record<string, number | null> = {}
    for (const item of enrichHoldingsItemsWithAllocation(mergedItems)) {
        if (item.symbol) {
            allocationMap[item.symbol.toUpperCase()] = item.allocation_pct ?? null
        }
    }
    return allocationMap
}

export function getAllocationForSymbol(
    symbol: string,
    holdings: HoldingItem[],
    pnlBySymbol: Record<string, HoldingsItem>,
): number | null {
    const map = buildPortfolioAllocationMap(holdings, pnlBySymbol)
    return map[symbol.toUpperCase()] ?? null
}

/**
 * Merge authoritative holdings list with P&L enrichment.
 * Holdings API is source of truth for position count; P&L API enriches market data.
 */
export function mergeHoldingsWithPnl(
    holdings: HoldingItem[],
    pnlItems: HoldingsItem[],
): HoldingsItem[] {
    const pnlBySymbol = new Map(
        pnlItems
            .filter(item => item.symbol)
            .map(item => [item.symbol!.toUpperCase(), item]),
    )
    const seen = new Set<string>()
    const merged: HoldingsItem[] = []

    for (const holding of holdings) {
        const symbol = holding.stock?.symbol?.toUpperCase()
        if (!symbol) continue

        seen.add(symbol)
        const pnl = pnlBySymbol.get(symbol)
        const quantity = pnl?.quantity ?? holding.quantity
        const averageCost = pnl?.average_cost ?? holding.average_cost
        const closePrice = pnl?.close_price ?? holding.latest_market_price ?? undefined

        merged.push(
            enrichHoldingsItem({
                holding_id: holding.holding_id,
                symbol,
                company_name: pnl?.company_name ?? holding.stock?.company_name,
                market: pnl?.market ?? holding.stock?.market ?? undefined,
                average_cost: averageCost,
                quantity,
                holding_date: pnl?.holding_date ?? holding.holding_date,
                close_price: closePrice,
                data_as_of: pnl?.data_as_of,
                market_value: pnl?.market_value,
                cost: pnl?.cost ?? holding.total_cost ?? averageCost * quantity,
                unrealized_pnl: pnl?.unrealized_pnl,
                unrealized_pnl_pct: pnl?.unrealized_pnl_pct,
                status: pnl?.status,
                prices_7d: pnl?.prices_7d,
            }),
        )
    }

    for (const pnl of pnlItems) {
        const symbol = pnl.symbol?.toUpperCase()
        if (!symbol || seen.has(symbol)) continue
        merged.push(enrichHoldingsItem(pnl))
    }

    return enrichHoldingsItemsWithAllocation(merged)
}
