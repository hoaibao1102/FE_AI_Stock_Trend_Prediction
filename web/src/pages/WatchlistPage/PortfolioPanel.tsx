import { useEffect, useState } from "react"
import { Landmark, Loader2, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import {
    formatAverageCost,
    formatMoney,
    formatNumber,
    formatPercent,
    formatPrice,
    formatSignedMoney,
    formatSignedPercent,
    getPnlTone,
} from "@/components/holdings/holdings-format"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { getHoldingsPnl, type HoldingsItem, type PortfolioData } from "@/services/holdings-pnl.service"
import { getMyHoldings, removeHolding } from "@/services/holdings.service"
import {
    buildPortfolioAllocationMap,
    buildPortfolioSummaryFromItems,
    mergeHoldingsWithPnl,
    computeHoldingPnlMetrics,
} from "@/components/holdings/portfolio-metrics"
import { TableEmpty, TableError, TableLoading, placeholder } from "@/shared/components"
import type { HoldingItem } from "@/types/holdings"

type PortfolioPanelProps = {
    refreshKey?: number
    onHoldingsChange?: () => void
}

type RemoveTarget = {
    symbol: string
    companyName?: string
}

function computeFallbackPnl(holding: HoldingItem) {
    const price = holding.latest_market_price
    if (price === null || price === undefined || !Number.isFinite(price)) {
        return { marketValue: null as number | null, unrealizedPnl: null as number | null, unrealizedPnlPct: null as number | null }
    }

    const marketValue = price * holding.quantity
    const cost = holding.average_cost * holding.quantity
    const unrealizedPnl = marketValue - cost
    const unrealizedPnlPct = cost !== 0 ? (unrealizedPnl / cost) * 100 : null

    return { marketValue, unrealizedPnl, unrealizedPnlPct }
}

function formatPositionBreakdown(portfolio: PortfolioData | null) {
    if (!portfolio) return "Active holdings"
    const parts = [
        `${portfolio.count_profit} profit`,
        `${portfolio.count_loss} loss`,
    ]
    if (portfolio.count_neutral && portfolio.count_neutral > 0) {
        parts.push(`${portfolio.count_neutral} chưa có giá`)
    }
    return parts.join(" · ")
}

export default function PortfolioPanel({ refreshKey = 0, onHoldingsChange }: PortfolioPanelProps) {
    const navigate = useNavigate()

    const [holdings, setHoldings] = useState<HoldingItem[]>([])
    const [pnlBySymbol, setPnlBySymbol] = useState<Record<string, HoldingsItem>>({})
    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)

    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pnlWarning, setPnlWarning] = useState<string | null>(null)
    const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null)
    const [isRemoving, setIsRemoving] = useState(false)

    const loadPortfolio = async () => {
        setIsLoading(true)
        setError(null)
        setPnlWarning(null)

        try {
            const holdingsResult = await getMyHoldings({ status: "ACTIVE", limit: 100 })
            setHoldings(holdingsResult.items)

            try {
                const pnlResult = await getHoldingsPnl()
                const merged = mergeHoldingsWithPnl(holdingsResult.items, pnlResult.items)
                const summary = buildPortfolioSummaryFromItems(merged)
                setPortfolio(summary)
                const map: Record<string, HoldingsItem> = {}
                for (const item of merged) {
                    if (item.symbol) {
                        map[item.symbol.toUpperCase()] = item
                    }
                }
                setPnlBySymbol(map)
            } catch (pnlError) {
                setPortfolio(null)
                setPnlBySymbol({})
                setPnlWarning(
                    pnlError instanceof Error
                        ? pnlError.message
                        : "Unable to load portfolio P&L. Showing holdings without market values.",
                )
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to load portfolio")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void loadPortfolio()
    }, [refreshKey])

    const handleConfirmRemove = async () => {
        if (!removeTarget) return

        try {
            setIsRemoving(true)
            await removeHolding(removeTarget.symbol)
            toast.success("Holding removed", {
                description: `${removeTarget.symbol} has been removed from your portfolio.`,
            })
            setRemoveTarget(null)
            await loadPortfolio()
            onHoldingsChange?.()
        } catch (err) {
            toast.error("Unable to remove holding", {
                description: err instanceof Error ? err.message : "Please try again.",
            })
        } finally {
            setIsRemoving(false)
        }
    }

    const allocationBySymbol = buildPortfolioAllocationMap(holdings, pnlBySymbol)

    return (
        <>
            {!isLoading && !error && pnlWarning ? (
                <div className="watchlist__warning">{pnlWarning}</div>
            ) : null}

            {!isLoading && !error && holdings.length > 0 ? (
                <section className="watchlist__summary-grid">
                    <div className="watchlist__summary-card">
                        <span>Total Cost</span>
                        <strong>{formatMoney(portfolio?.total_cost)}</strong>
                    </div>
                    <div className="watchlist__summary-card">
                        <span>Market Value</span>
                        <strong>{formatMoney(portfolio?.total_market_value)}</strong>
                    </div>
                    <div className="watchlist__summary-card">
                        <span>Unrealized P&L</span>
                        <strong className={getPnlTone(portfolio?.total_unrealized_pnl)}>
                            {formatSignedMoney(portfolio?.total_unrealized_pnl)}
                        </strong>
                        <small className={getPnlTone(portfolio?.total_unrealized_pnl_pct)}>
                            {formatSignedPercent(portfolio?.total_unrealized_pnl_pct)}
                        </small>
                    </div>
                    <div className="watchlist__summary-card">
                        <span>Positions</span>
                        <strong>{holdings.length}</strong>
                        <small>
                            {formatPositionBreakdown(portfolio)}
                        </small>
                    </div>
                </section>
            ) : null}

            <section className="watchlist__table-card">
                {isLoading ? (
                    <TableLoading />
                ) : error ? (
                    <TableError message={error} onRetry={() => void loadPortfolio()} />
                ) : holdings.length === 0 ? (
                    <TableEmpty message="Your portfolio is empty. Use Add Position to start tracking a holding without adding it to your watchlist." />
                ) : (
                    <div className="watchlist__table-wrap">
                        <table className="watchlist__table">
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th>Company</th>
                                    <th>Avg Cost</th>
                                    <th>Qty</th>
                                    <th>Market Price</th>
                                    <th>Market Value</th>
                                    <th>Allocation</th>
                                    <th>Unrealized P&L</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdings.map((holding) => {
                                    const symbol = holding.stock?.symbol?.toUpperCase() || "--"
                                    const pnl = pnlBySymbol[symbol]
                                    const fallback = computeFallbackPnl(holding)
                                    const metrics = computeHoldingPnlMetrics({
                                        average_cost: pnl?.average_cost ?? holding.average_cost,
                                        quantity: pnl?.quantity ?? holding.quantity,
                                        close_price: pnl?.close_price ?? holding.latest_market_price,
                                        market_value: pnl?.market_value ?? fallback.marketValue,
                                        cost: pnl?.cost ?? holding.total_cost,
                                        unrealized_pnl: pnl?.unrealized_pnl ?? fallback.unrealizedPnl,
                                        unrealized_pnl_pct: pnl?.unrealized_pnl_pct ?? fallback.unrealizedPnlPct,
                                    })

                                    const marketPrice = pnl?.close_price ?? holding.latest_market_price
                                    const marketValue = metrics.market_value ?? fallback.marketValue
                                    const unrealizedPnl = metrics.unrealized_pnl ?? fallback.unrealizedPnl
                                    const unrealizedPnlPct = metrics.unrealized_pnl_pct ?? fallback.unrealizedPnlPct
                                    const allocationPct = allocationBySymbol[symbol] ?? pnl?.allocation_pct ?? null

                                    return (
                                        <tr key={holding.holding_id}>
                                            <td className="watchlist__symbol-cell">{symbol}</td>
                                            <td>{placeholder(holding.stock?.company_name)}</td>
                                            <td>{formatAverageCost(holding.average_cost)}</td>
                                            <td>{formatNumber(holding.quantity)}</td>
                                            <td>{formatPrice(marketPrice)}</td>
                                            <td>{formatMoney(marketValue)}</td>
                                            <td>{allocationPct != null ? formatPercent(allocationPct) : "--"}</td>
                                            <td>
                                                <div className={getPnlTone(unrealizedPnl)}>
                                                    {formatSignedMoney(unrealizedPnl)}
                                                </div>
                                                <div className={`watchlist__pnl-sub ${getPnlTone(unrealizedPnlPct)}`}>
                                                    {formatSignedPercent(unrealizedPnlPct)}
                                                </div>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="xs"
                                                        onClick={() => navigate(`/stocks/${encodeURIComponent(symbol)}`)}
                                                        disabled={symbol === "--"}
                                                    >
                                                        View Detail
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="xs"
                                                        onClick={() =>
                                                            navigate(
                                                                `/watchlist/${encodeURIComponent(symbol)}/holding?from=portfolio`
                                                            )
                                                        }
                                                        disabled={symbol === "--"}
                                                    >
                                                        <Landmark className="mr-1 size-3" />
                                                        Manage
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                                        onClick={() =>
                                                            setRemoveTarget({
                                                                symbol,
                                                                companyName: holding.stock?.company_name,
                                                            })
                                                        }
                                                        disabled={isRemoving || symbol === "--"}
                                                        aria-label={`Remove ${symbol} holding`}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <Dialog open={Boolean(removeTarget)} onOpenChange={(nextOpen) => !nextOpen && setRemoveTarget(null)}>
                <DialogContent className="max-w-md border-slate-700 bg-[#111827] text-white">
                    <DialogHeader>
                        <DialogTitle>Remove holding</DialogTitle>
                        <DialogDescription>
                            {removeTarget?.symbol}
                            {removeTarget?.companyName ? ` - ${removeTarget.companyName}` : ""} will be removed from
                            your portfolio. The stock can remain on your watchlist.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setRemoveTarget(null)} disabled={isRemoving}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => void handleConfirmRemove()} disabled={isRemoving}>
                            {isRemoving ? (
                                <>
                                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                "Remove Holding"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
