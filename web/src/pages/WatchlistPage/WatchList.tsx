import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, BarChart3, Crown, Landmark, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { formatPrice } from "@/components/holdings/holdings-format"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { getHoldingDetail, HoldingsServiceError } from "@/services/holdings.service"
import type { StockItem } from "@/services/stock.service"
import {
    deleteWatchlistItem,
    getWatchlistData,
    trimWatchlist,
    type WatchlistRawItem,
} from "@/services/watchlist.service"
import AddStockModal from "@/shared/components/AddStockModal"
import {
    Breadcrumb,
    TableEmpty,
    TableError,
    TableLoading,
    formatPercent,
    placeholder,
} from "@/shared/components"
import WatchlistAnalysisModal from "./WatchlistAnalysisModal"
import "@/shared/components/shared-stock.css"
import "./WatchlistPage.css"

function getStockId(raw: WatchlistRawItem): string {
    return String(raw.stock_id || raw.stock?.stock_id || raw.stock?.symbol || raw.stock_code || "")
}

function getStockSymbol(raw: WatchlistRawItem): string {
    return String(raw.stock_code || raw.stock?.symbol || "--")
}

function getStockName(raw: WatchlistRawItem): string {
    return String(raw.stock_name || raw.stock?.company_name || "--")
}

type WatchlistOverflowOverlayProps = {
    open: boolean
    stocks: WatchlistRawItem[]
    limit: number
    onTrimSuccess: () => Promise<void> | void
}

type DeleteTarget = {
    symbol: string
    companyName?: string
}

type AddedStockPrompt = {
    symbol: string
    companyName?: string
    market?: string
}

function WatchlistOverflowOverlay({
    open,
    stocks,
    limit,
    onTrimSuccess,
}: WatchlistOverflowOverlayProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    if (!open) return null

    const toggleStock = (stockId: string) => {
        setErrorMessage(null)

        setSelectedIds((prev) => {
            if (prev.includes(stockId)) {
                return prev.filter((id) => id !== stockId)
            }

            if (prev.length >= limit) {
                setErrorMessage(`You can only keep ${limit} stocks.`)
                return prev
            }

            return [...prev, stockId]
        })
    }

    const handleConfirmTrim = async () => {
        if (selectedIds.length === 0) {
            setErrorMessage("Please select at least one stock to keep.")
            return
        }

        if (selectedIds.length > limit) {
            setErrorMessage(`You can only keep ${limit} stocks.`)
            return
        }

        try {
            setIsSubmitting(true)
            setErrorMessage(null)

            await trimWatchlist(selectedIds)
            await onTrimSuccess()
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Failed to trim watchlist.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="watchlist-overflow">
            <div className="watchlist-overflow__panel">
                <div className="watchlist-overflow__header">
                    <div>
                        <div className="watchlist-overflow__title">
                            <AlertTriangle className="size-5 text-yellow-300" />
                            <h2>Watchlist limit reached</h2>
                        </div>

                        <p>
                            Your current plan only allows you to keep up to{" "}
                            <strong>{limit}</strong> stocks. Select the stocks you want
                            to keep, or upgrade your plan to continue using a larger
                            watchlist.
                        </p>
                    </div>
                </div>

                <div className="watchlist-overflow__select-box">
                    <div className="watchlist-overflow__select-header">
                        <span>Select stocks to keep</span>
                        <span>
                            {selectedIds.length}/{limit} selected
                        </span>
                    </div>

                    <div className="watchlist-overflow__list">
                        {stocks.length === 0 ? (
                            <div className="watchlist-overflow__empty">
                                No watchlist items found.
                            </div>
                        ) : (
                            stocks.map((stock) => {
                                const stockId = getStockId(stock)
                                const selected = selectedIds.includes(stockId)

                                return (
                                    <button
                                        key={stockId}
                                        type="button"
                                        className={`watchlist-overflow__item ${selected ? "is-selected" : ""}`}
                                        onClick={() => toggleStock(stockId)}
                                    >
                                        <div>
                                            <div className="watchlist-overflow__symbol">
                                                {getStockSymbol(stock)}
                                            </div>
                                            <div className="watchlist-overflow__name">
                                                {getStockName(stock)}
                                            </div>
                                        </div>

                                        <div className="watchlist-overflow__check">
                                            {selected ? "✓" : ""}
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>

                {errorMessage ? (
                    <div className="watchlist-overflow__error">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="watchlist-overflow__actions">
                    <Button asChild variant="outline">
                        <Link to="/upgrade">
                            <Crown className="mr-1.5 size-4" />
                            Upgrade Plan
                        </Link>
                    </Button>

                    <Button
                        type="button"
                        onClick={() => void handleConfirmTrim()}
                        disabled={isSubmitting || selectedIds.length === 0}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-1.5 size-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Keep Selected Stocks"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function WatchlistPage() {
    const navigate = useNavigate()
    const [watchlist, setWatchlist] = useState<StockItem[]>([])
    const [rawWatchlist, setRawWatchlist] = useState<WatchlistRawItem[]>([])
    const [isOverLimit, setIsOverLimit] = useState(false)
    const [watchlistLimit, setWatchlistLimit] = useState(5)

    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
    const [isCheckingHolding, setIsCheckingHolding] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [addedStockPrompt, setAddedStockPrompt] = useState<AddedStockPrompt | null>(null)

    const watchedSymbols = useMemo(
        () => new Set(watchlist.map((stock) => stock.symbol)),
        [watchlist]
    )

    const loadWatchlist = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const data = await getWatchlistData()

            setWatchlist(data.items)
            setRawWatchlist(data.rawItems)
            setIsOverLimit(data.overLimit)
            setWatchlistLimit(data.limit)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to load watchlist")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void loadWatchlist()
    }, [])

    const handleDeleteClick = async (stock: StockItem) => {
        try {
            setIsCheckingHolding(true)

            await getHoldingDetail(stock.symbol)
            setDeleteTarget({
                symbol: stock.symbol,
                companyName: stock.companyName,
            })
        } catch (error) {
            if (error instanceof HoldingsServiceError && error.status === 404 && error.code === "HOLDING_NOT_FOUND") {
                try {
                    setIsDeleting(true)
                    await deleteWatchlistItem(stock.symbol)
                    toast.success("Removed from watchlist", {
                        description: `${stock.symbol} has been removed from your watchlist.`,
                    })
                    await loadWatchlist()
                    return
                } catch (deleteError) {
                    toast.error("Unable to remove watchlist item", {
                        description: deleteError instanceof Error ? deleteError.message : "Please try again.",
                    })
                    return
                } finally {
                    setIsDeleting(false)
                }
            }

            toast.error("Unable to check holding data", {
                description: error instanceof Error ? error.message : "Please try again.",
            })
        } finally {
            setIsCheckingHolding(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return

        try {
            setIsDeleting(true)
            await deleteWatchlistItem(deleteTarget.symbol)
            toast.success("Removed from watchlist", {
                description: `${deleteTarget.symbol} has been removed from your watchlist.`,
            })
            setDeleteTarget(null)
            await loadWatchlist()
        } catch (error) {
            toast.error("Unable to remove watchlist item", {
                description: error instanceof Error ? error.message : "Please try again.",
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleOpenHolding = () => {
        if (!addedStockPrompt) return

        navigate(`/watchlist/${encodeURIComponent(addedStockPrompt.symbol)}/holding`)
        setAddedStockPrompt(null)
    }

    return (
        <>
            <div className="watchlist">
                <Breadcrumb items={["Home", "Watchlist"]} />

                <section className="watchlist__header">
                    <div>
                        <h1>My Watchlist</h1>
                        <p>Monitor your selected stocks in real-time</p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => setIsOpen(true)}
                        >
                            <Plus className="mr-1.5 size-3.5" />
                            Add Stock
                        </Button>

                        <AddStockModal
                            open={isOpen}
                            onOpenChange={setIsOpen}
                            watchedSymbols={watchedSymbols}
                            onWatchlistChange={() => void loadWatchlist()}
                            onStockAdded={(stock) => setAddedStockPrompt(stock)}
                        />

                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => setIsAnalysisOpen(true)}
                            disabled={isLoading || watchlist.length === 0}
                        >
                            <BarChart3 className="mr-1.5 size-3.5" />
                            Analyze Watchlist
                        </Button>

                        <WatchlistAnalysisModal
                            open={isAnalysisOpen}
                            onOpenChange={setIsAnalysisOpen}
                        />

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void loadWatchlist()}
                            disabled={isLoading}
                        >
                            <RefreshCw className="mr-1.5 size-3.5" />
                            Refresh
                        </Button>
                    </div>
                </section>

                <section className="watchlist__table-card">
                    {isLoading ? (
                        <TableLoading />
                    ) : error ? (
                        <TableError message={error} onRetry={() => void loadWatchlist()} />
                    ) : watchlist.length === 0 ? (
                        <TableEmpty message="Your watchlist is empty. Add stocks from the Stock List page." />
                    ) : (
                        <div className="watchlist__table-wrap">
                            <table className="watchlist__table">
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Company Name</th>
                                        <th>Market</th>
                                        <th>Latest Close</th>
                                        <th>Change %</th>
                                        <th className="text-right"><div className="flex items-center justify-end gap-1">Actions</div></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {watchlist.map((stock) => {
                                        const isPositive = (stock.changePercent ?? 0) >= 0
                                        const isNegative = (stock.changePercent ?? 0) < 0

                                        return (
                                            <tr key={stock.symbol}>
                                                <td className="watchlist__symbol-cell">{stock.symbol}</td>
                                                <td>{placeholder(stock.companyName)}</td>
                                                <td>{placeholder(stock.market)}</td>
                                                <td>{formatPrice(stock.latestClosePrice)}</td>
                                                <td
                                                    className={
                                                        stock.changePercent === undefined
                                                            ? "shared-neutral"
                                                            : isPositive
                                                                ? "shared-positive"
                                                                : isNegative
                                                                    ? "shared-negative"
                                                                    : "shared-neutral"
                                                    }
                                                >
                                                    {formatPercent(stock.changePercent)}
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="xs"
                                                            onClick={() => navigate(`/stocks/${encodeURIComponent(stock.symbol)}`)}
                                                        >
                                                            View Detail
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="xs"
                                                            onClick={() => navigate(`/watchlist/${encodeURIComponent(stock.symbol)}/holding`)}
                                                        >
                                                            <Landmark className="mr-1 size-3" />
                                                            Manage Holding
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                                            onClick={() => void handleDeleteClick(stock)}
                                                            disabled={isCheckingHolding || isDeleting}
                                                            aria-label={`Remove ${stock.symbol}`}
                                                        >
                                                            {isCheckingHolding ? (
                                                                <Loader2 className="size-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="size-3.5" />
                                                            )}
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
            </div>

            <WatchlistOverflowOverlay
                open={isOverLimit}
                stocks={rawWatchlist}
                limit={watchlistLimit}
                onTrimSuccess={loadWatchlist}
            />

            <Dialog open={Boolean(addedStockPrompt)} onOpenChange={(nextOpen) => !nextOpen && setAddedStockPrompt(null)}>
                <DialogContent className="max-w-md border-slate-700 bg-[#111827] text-white">
                    <DialogHeader>
                        <DialogTitle>Added to watchlist</DialogTitle>
                        <DialogDescription>
                            {addedStockPrompt?.symbol}
                            {addedStockPrompt?.companyName ? ` - ${addedStockPrompt.companyName}` : ""} was added successfully. Do you want to add holding details for this stock now?
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setAddedStockPrompt(null)}>
                            Not now
                        </Button>
                        <Button type="button" onClick={handleOpenHolding}>
                            Manage Holding
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(deleteTarget)} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
                <DialogContent className="max-w-md border-slate-700 bg-[#111827] text-white">
                    <DialogHeader>
                        <DialogTitle>Remove from watchlist</DialogTitle>
                        <DialogDescription>
                            {deleteTarget?.symbol}
                            {deleteTarget?.companyName ? ` - ${deleteTarget.companyName}` : ""} currently has holding data. Do you want to remove this stock from your watchlist?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-200">
                        <div className="flex items-start gap-2">
                            <Trash2 className="mt-0.5 size-4 shrink-0 text-rose-300" />
                            <span>
                                {deleteTarget?.symbol}
                                {deleteTarget?.companyName ? ` - ${deleteTarget.companyName}` : ""} has saved holding data. If you continue, only the watchlist row will be removed. The holding data will remain available in holding management.
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => void handleConfirmDelete()} disabled={isDeleting}>
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                "Remove from Watchlist"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
