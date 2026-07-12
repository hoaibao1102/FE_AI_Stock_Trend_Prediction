import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Search, Star, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { getStockList, type StockItem } from "@/services/stock.service"
import { addToWatchlist } from "@/services/watchlist.service"
import { toast } from "sonner"

interface AddStockModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    watchedSymbols: Set<string>
    onWatchlistChange: () => void
    onStockAdded?: (stock: Pick<StockItem, "symbol" | "companyName" | "market">) => void
}

export default function AddStockModal({
    open,
    onOpenChange,
    watchedSymbols,
    onWatchlistChange,
    onStockAdded,
}: AddStockModalProps) {
    const [stocks, setStocks] = useState<StockItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchText, setSearchText] = useState("")
    const [addingSymbols, setAddingSymbols] = useState<Set<string>>(new Set())
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!open) {
            setSearchText("")
            return
        }

        let cancelled = false
        setIsLoading(true)

        getStockList({ page: 1, limit: 400, market: "HOSE" })
            .then((result) => {
                if (!cancelled) {
                    setStocks(result.items)
                    setIsLoading(false)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setIsLoading(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [open])

    // Auto-focus search input when modal opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [open])

    const filteredStocks = useMemo(() => {
        const q = searchText.trim().toLowerCase()
        if (!q) return stocks.slice(0, 100)

        return stocks.filter(
            (s) =>
                s.symbol.toLowerCase().includes(q) ||
                s.companyName?.toLowerCase().includes(q),
        )
    }, [stocks, searchText])

    const handleAdd = useCallback(
        async (stock: StockItem) => {
            const symbol = stock.symbol
            if (addingSymbols.has(symbol)) return
            setAddingSymbols((prev) => new Set(prev).add(symbol))

            try {
                await addToWatchlist(symbol)
                toast.success("Added to watchlist", {
                    description: `${symbol} has been added`,
                })
                onWatchlistChange()
                onOpenChange(false)
                onStockAdded?.({
                    symbol: stock.symbol,
                    companyName: stock.companyName,
                    market: stock.market,
                })
            } catch (err: any) {
                toast.error("Failed to add", {
                    description: err.message || `Could not add ${symbol}`,
                })
            } finally {
                setAddingSymbols((prev) => {
                    const next = new Set(prev)
                    next.delete(symbol)
                    return next
                })
            }
        },
        [addingSymbols, onOpenChange, onStockAdded, onWatchlistChange],
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-[#111827] text-white border-slate-700 max-h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="shrink-0 p-6 pb-0">
                    <DialogTitle className="text-base">Add Stocks to Watchlist</DialogTitle>
                </DialogHeader>

                {/* Search */}
                <div className="shrink-0 px-6 pt-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Search by symbol or company name…"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="bg-[#0f172a] border-slate-700 text-white placeholder-slate-500 pl-9 pr-9"
                        />
                        {searchText && (
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                onClick={() => setSearchText("")}
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-[240px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400">
                            <Loader2 className="size-5 animate-spin mr-2" />
                            Loading stocks…
                        </div>
                    ) : !searchText.trim() && stocks.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 text-sm">
                            No stocks available.
                        </div>
                    ) : filteredStocks.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 text-sm">
                            No stocks match your search.
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-800">
                            {filteredStocks.map((stock) => {
                                const isWatched = watchedSymbols.has(stock.symbol)
                                const isAdding = addingSymbols.has(stock.symbol)

                                return (
                                    <li
                                        key={stock.symbol}
                                        className="flex items-center gap-3 py-2.5"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-white">
                                                    {stock.symbol}
                                                </span>
                                                {stock.market && (
                                                    <span className="text-[10px] uppercase text-slate-500 border border-slate-700 rounded px-1 leading-none py-0.5">
                                                        {stock.market}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 truncate">
                                                {stock.companyName || "—"}
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            variant={isWatched ? "default" : "outline"}
                                            size="icon-xs"
                                            aria-label={
                                                isWatched
                                                    ? `Already in watchlist`
                                                    : `Add ${stock.symbol} to watchlist`
                                            }
                                            disabled={isWatched || isAdding}
                                            className={
                                                isWatched
                                                    ? "text-white opacity-50 cursor-not-allowed"
                                                    : "text-white/60 hover:text-white"
                                            }
                                            onClick={() => handleAdd(stock)}
                                        >
                                            {isAdding ? (
                                                <Loader2 className="size-3 animate-spin" />
                                            ) : (
                                                <Star
                                                    className="size-3"
                                                    fill={isWatched ? "currentColor" : "none"}
                                                />
                                            )}
                                        </Button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
