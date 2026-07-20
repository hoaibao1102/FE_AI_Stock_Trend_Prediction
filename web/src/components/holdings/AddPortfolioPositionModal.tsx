import { useEffect, useMemo, useRef, useState } from "react"
import { Landmark, Loader2, Search, X } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { getStockList, type StockItem } from "@/services/stock.service"

type AddPortfolioPositionModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    heldSymbols?: Set<string>
}

export default function AddPortfolioPositionModal({
    open,
    onOpenChange,
    heldSymbols = new Set(),
}: AddPortfolioPositionModalProps) {
    const navigate = useNavigate()
    const [stocks, setStocks] = useState<StockItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchText, setSearchText] = useState("")
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

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [open])

    const filteredStocks = useMemo(() => {
        const q = searchText.trim().toLowerCase()
        if (!q) return stocks.slice(0, 100)

        return stocks.filter(
            (stock) =>
                stock.symbol.toLowerCase().includes(q) ||
                stock.companyName?.toLowerCase().includes(q),
        )
    }, [stocks, searchText])

    const handleSelect = (symbol: string) => {
        onOpenChange(false)
        navigate(`/watchlist/${encodeURIComponent(symbol)}/holding?from=portfolio`)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[80vh] flex-col gap-0 border-slate-700 bg-[#111827] p-0 text-white sm:max-w-[500px]">
                <DialogHeader className="shrink-0 p-6 pb-0">
                    <DialogTitle className="text-base">Add Position to Portfolio</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Chọn mã để thêm vị thế. Không cần thêm vào watchlist trước.
                    </DialogDescription>
                </DialogHeader>

                <div className="shrink-0 px-6 pb-2 pt-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Search by symbol or company name…"
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                            className="border-slate-700 bg-[#0f172a] pl-9 pr-9 text-white placeholder:text-slate-500"
                        />
                        {searchText ? (
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                onClick={() => setSearchText("")}
                            >
                                <X className="size-4" />
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="min-h-[240px] flex-1 overflow-y-auto px-6 pb-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400">
                            <Loader2 className="mr-2 size-5 animate-spin" />
                            Loading stocks…
                        </div>
                    ) : !searchText.trim() && stocks.length === 0 ? (
                        <div className="py-16 text-center text-sm text-slate-500">No stocks available.</div>
                    ) : filteredStocks.length === 0 ? (
                        <div className="py-16 text-center text-sm text-slate-500">No stocks match your search.</div>
                    ) : (
                        <ul className="divide-y divide-slate-800">
                            {filteredStocks.map((stock) => {
                                const isHeld = heldSymbols.has(stock.symbol.toUpperCase())

                                return (
                                    <li key={stock.symbol} className="flex items-center gap-3 py-2.5">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-white">{stock.symbol}</span>
                                                {stock.market ? (
                                                    <span className="rounded border border-slate-700 px-1 py-0.5 text-[10px] uppercase leading-none text-slate-500">
                                                        {stock.market}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="truncate text-xs text-slate-400">{stock.companyName || "—"}</p>
                                        </div>

                                        <Button
                                            type="button"
                                            variant={isHeld ? "outline" : "default"}
                                            size="xs"
                                            disabled={isHeld}
                                            onClick={() => handleSelect(stock.symbol)}
                                        >
                                            <Landmark className="mr-1 size-3" />
                                            {isHeld ? "In Portfolio" : "Add"}
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
