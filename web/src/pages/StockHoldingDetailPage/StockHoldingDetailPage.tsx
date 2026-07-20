import { useEffect, useState } from "react"
import { ArrowLeft, Landmark, Loader2, Save, Trash2 } from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { formatAverageCost, formatDate, formatMoney, formatNumber, formatPrice, formatSignedMoney, formatSignedPercent, getPnlTone } from "@/components/holdings/holdings-format"
import HoldingTransactionsSection from "@/components/holdings/HoldingTransactionsSection"
import { buildPortfolioAllocationMap } from "@/components/holdings/portfolio-metrics"
import "@/components/holdings/holdings-ui.css"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { getHoldingDetail, getMyHoldings, HoldingsServiceError, removeHolding, saveHolding, updateHolding } from "@/services/holdings.service"
import { getHoldingsPnl } from "@/services/holdings-pnl.service"
import { getStockDetail } from "@/services/stock.service"
import { Breadcrumb, TableError, TableLoading } from "@/shared/components"
import type { HoldingItem } from "@/types/holdings"
import "./StockHoldingDetailPage.css"

type StockProfile = {
    symbol: string
    companyName?: string
    latestMarketPrice?: number | null
}

type HoldingFormState = {
    average_cost: string
    quantity: string
    holding_date: string
    note: string
}

const EMPTY_FORM: HoldingFormState = {
    average_cost: "",
    quantity: "",
    holding_date: "",
    note: "",
}

function getYesterdayLabel() {
    const now = new Date()
    const vietnamNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    vietnamNow.setDate(vietnamNow.getDate() - 1)
    return vietnamNow.toISOString().slice(0, 10)
}

function getFriendlyHoldingsError(error: unknown, fallback: string) {
    if (error instanceof HoldingsServiceError) {
        switch (error.status) {
            case 400:
                return error.message || "The holding information is invalid."
            case 401:
                return "Your session has expired. Please sign in again."
            case 403:
                return "You do not have permission to manage this holding."
            case 404:
                return error.message || fallback
            case 409:
                return error.message || "This holding can no longer be updated."
            default:
                return error.message || fallback
        }
    }

    return error instanceof Error ? error.message : fallback
}

function toFormState(holding: HoldingItem | null): HoldingFormState {
    if (!holding) return EMPTY_FORM

    return {
        average_cost: holding.average_cost ? String(holding.average_cost) : "",
        quantity: holding.quantity ? String(holding.quantity) : "",
        holding_date: holding.holding_date ? formatDate(holding.holding_date, "date") : "",
        note: holding.note || "",
    }
}

export default function StockHoldingDetailPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { symbol: routeSymbol } = useParams()
    const symbol = (routeSymbol || "").trim().toUpperCase()
    const fromPortfolio = searchParams.get("from") === "portfolio"
    const backPath = fromPortfolio ? "/watchlist?tab=portfolio" : "/watchlist"
    const backLabel = fromPortfolio ? "Back to Portfolio" : "Back to Watchlist"

    const [profile, setProfile] = useState<StockProfile | null>(null)
    const [holding, setHolding] = useState<HoldingItem | null>(null)
    const [holdingMissing, setHoldingMissing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
    const [form, setForm] = useState<HoldingFormState>(EMPTY_FORM)
    const [showManualAdjust, setShowManualAdjust] = useState(false)
    const [positionPnl, setPositionPnl] = useState<{
        marketValue: number | null
        cost: number | null
        unrealizedPnl: number | null
        unrealizedPnlPct: number | null
        allocationPct: number | null
    } | null>(null)
    const maxHoldingDate = getYesterdayLabel()

    const loadProfile = async () => {
        if (!symbol) return

        try {
            const stock = await getStockDetail(symbol)
            setProfile({
                symbol: stock.symbol.toUpperCase(),
                companyName: stock.company_name,
                latestMarketPrice: stock.latest_price?.close_price ?? null,
            })
        } catch {
            setProfile({ symbol })
        }
    }

    const loadPositionPnl = async () => {
        if (!symbol) return

        try {
            const [pnl, holdingsResult] = await Promise.all([
                getHoldingsPnl(),
                getMyHoldings({ status: "ACTIVE", limit: 100 }),
            ])

            const item = pnl.items.find((entry) => entry.symbol?.toUpperCase() === symbol)
            const pnlBySymbol: Record<string, NonNullable<typeof item>> = {}
            for (const entry of pnl.items) {
                if (entry.symbol) {
                    pnlBySymbol[entry.symbol.toUpperCase()] = entry
                }
            }

            const allocationMap = buildPortfolioAllocationMap(holdingsResult.items, pnlBySymbol)
            const allocationPct = allocationMap[symbol] ?? item?.allocation_pct ?? null

            if (!item && !holding) {
                setPositionPnl(null)
                return
            }

            const currentHolding = holdingsResult.items.find(
                (entry) => entry.stock?.symbol?.toUpperCase() === symbol,
            )

            const marketValue =
                item?.market_value ??
                (currentHolding?.latest_market_price != null
                    ? currentHolding.latest_market_price * (currentHolding.quantity || 0)
                    : null)

            const cost =
                item?.cost ??
                (currentHolding ? currentHolding.average_cost * currentHolding.quantity : null)

            setPositionPnl({
                marketValue,
                cost,
                unrealizedPnl: item?.unrealized_pnl ?? (marketValue != null && cost != null ? marketValue - cost : null),
                unrealizedPnlPct:
                    item?.unrealized_pnl_pct ??
                    (marketValue != null && cost != null && cost > 0
                        ? ((marketValue - cost) / cost) * 100
                        : null),
                allocationPct,
            })
        } catch {
            setPositionPnl(null)
        }
    }

    const loadHolding = async () => {
        if (!symbol) return

        setIsLoading(true)
        setError(null)

        try {
            const result = await getHoldingDetail(symbol)
            setHolding(result)
            setHoldingMissing(false)
            setForm(toFormState(result))
        } catch (loadError) {
            if (loadError instanceof HoldingsServiceError && loadError.status === 404) {
                setHolding(null)
                setHoldingMissing(true)
                setForm(EMPTY_FORM)
                return
            }

            setHolding(null)
            setHoldingMissing(false)
            setError(getFriendlyHoldingsError(loadError, "Failed to load holding detail."))
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (!symbol) return
        void loadProfile()
        void loadHolding()
        void loadPositionPnl()
    }, [symbol])

    const refreshHoldingState = async () => {
        await Promise.all([loadHolding(), loadPositionPnl()])
    }

    const handleChange = (field: keyof HoldingFormState, value: string) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!symbol) return

        if (form.holding_date > maxHoldingDate && form.holding_date !== "") {
            toast.error("Invalid holding date", {
                description: "Holding Date must be a past date before today.",
            })
            return
        }

        setIsSaving(true)
        try {
            const payload = {
                average_cost: Number(form.average_cost),
                quantity: Number(form.quantity),
                holding_date: form.holding_date,
                note: form.note.trim() || undefined,
            }

            const response = holding
                ? await updateHolding(symbol, payload)
                : await saveHolding(symbol, payload)

            setHolding(response.holding)
            setHoldingMissing(false)
            setForm(toFormState(response.holding))
            await refreshHoldingState()
            toast.success(holding ? "Holding updated" : "Holding created", {
                description: `${symbol} holding information has been saved.`,
            })
        } catch (saveError) {
            toast.error("Unable to save holding", {
                description: getFriendlyHoldingsError(saveError, "Please review the entered values and try again."),
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleRemove = async () => {
        if (!symbol) return

        setIsRemoving(true)
        try {
            await removeHolding(symbol)
            setHolding(null)
            setHoldingMissing(true)
            setForm(EMPTY_FORM)
            setRemoveDialogOpen(false)
            await refreshHoldingState()
            toast.success("Holding removed", {
                description: `${symbol} has been removed from your personal holdings.`,
            })
        } catch (removeError) {
            toast.error("Unable to remove holding", {
                description: getFriendlyHoldingsError(removeError, "Please try again."),
            })
        } finally {
            setIsRemoving(false)
        }
    }

    const resolvedCompanyName = holding?.stock?.company_name || profile?.companyName
    const resolvedMarket = holding?.stock?.market
    const latestMarketPrice = holding?.latest_market_price ?? profile?.latestMarketPrice ?? null

    return (
        <>
            <div className="stock-holding-page">
                <Breadcrumb items={["Home", "Watchlist & Portfolio", symbol || "Holding"]} />

                <section className="stock-holding-page__header">
                    <div className="stock-holding-page__header-main">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="stock-holding-page__back"
                            onClick={() => navigate(backPath)}
                        >
                            <ArrowLeft className="mr-1.5 size-4" />
                            {backLabel}
                        </Button>

                        <div>
                            <div className="stock-holding-page__title-row">
                                <h1>{symbol || "--"}</h1>
                                {resolvedMarket ? <span className="stock-holding-page__market">{resolvedMarket}</span> : null}
                                {holding?.status ? <Badge variant="outline">{holding.status}</Badge> : null}
                            </div>
                            <p className="stock-holding-page__subtitle">{resolvedCompanyName || "Manage your current holding for this stock."}</p>
                        </div>
                    </div>

                    <div className="stock-holding-page__header-card">
                        <div className="stock-holding-page__header-card-label">Latest Market Price</div>
                        <div className="stock-holding-page__header-card-value">{formatPrice(latestMarketPrice)}</div>
                        <div className="stock-holding-page__header-card-note">Display only from market data feed</div>
                    </div>
                </section>

                <section className="stock-holding-page__section">
                    <div className="stock-holding-page__section-header">
                        <div>
                            <h2>Position Overview</h2>
                            <p>Current portfolio position with live market value and unrealized P&L.</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <TableLoading />
                    ) : error ? (
                        <TableError message={error} onRetry={() => void loadHolding()} />
                    ) : (
                        <div className="stock-holding-page__overview-grid">
                            <div className="holdings-metric-card">
                                <span>Average Cost</span>
                                <strong>{holding ? formatAverageCost(holding.average_cost) : "--"}</strong>
                            </div>
                            <div className="holdings-metric-card">
                                <span>Quantity</span>
                                <strong>{holding ? formatNumber(holding.quantity) : "--"}</strong>
                            </div>
                            <div className="holdings-metric-card">
                                <span>Total Cost</span>
                                <strong>{positionPnl?.cost != null ? formatMoney(positionPnl.cost) : holding ? formatMoney(holding.total_cost ?? holding.average_cost * holding.quantity) : "--"}</strong>
                            </div>
                            <div className="holdings-metric-card">
                                <span>Market Value</span>
                                <strong>{positionPnl?.marketValue != null ? formatMoney(positionPnl.marketValue) : "--"}</strong>
                            </div>
                            <div className="holdings-metric-card">
                                <span>Unrealized P&L</span>
                                <strong className={getPnlTone(positionPnl?.unrealizedPnl)}>
                                    {formatSignedMoney(positionPnl?.unrealizedPnl)}
                                </strong>
                                <small className={getPnlTone(positionPnl?.unrealizedPnlPct)}>
                                    {formatSignedPercent(positionPnl?.unrealizedPnlPct)}
                                </small>
                            </div>
                            <div className="holdings-metric-card">
                                <span>Allocation</span>
                                <strong>{positionPnl?.allocationPct != null ? `${formatNumber(positionPnl.allocationPct)}%` : "--"}</strong>
                            </div>
                            <div className="holdings-metric-card">
                                <span>Holding Date</span>
                                <strong>{holding ? formatDate(holding.holding_date, "date") : "--"}</strong>
                            </div>
                            <div className="holdings-metric-card">
                                <span>Latest Market Price</span>
                                <strong>{formatPrice(latestMarketPrice)}</strong>
                            </div>
                        </div>
                    )}
                </section>

                <HoldingTransactionsSection
                    symbol={symbol}
                    holding={holding}
                    latestMarketPrice={latestMarketPrice}
                    onHoldingChange={refreshHoldingState}
                />

                <section className="stock-holding-page__section">
                    <div className="stock-holding-page__section-header">
                        <div>
                            <h2>Manual Adjustment</h2>
                            <p>Override position values directly. Prefer Buy/Sell transactions for accurate average cost tracking.</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowManualAdjust((open) => !open)}>
                            {showManualAdjust ? "Hide" : "Show"}
                        </Button>
                    </div>

                    {!showManualAdjust ? null : (
                    <>
                    {holdingMissing ? (
                        <div className="stock-holding-page__holding-banner">
                            <strong className="text-slate-100">No holding saved yet for {symbol}.</strong>
                            <p>Record a Buy transaction above, or use this form to set an initial position manually.</p>
                        </div>
                    ) : null}

                    <form className="stock-holding-page__form" onSubmit={handleSubmit}>
                        <div className="stock-holding-page__form-grid">
                            <div className="stock-holding-page__field">
                                <label htmlFor="average_cost">Gia von / DCA</label>
                                <Input
                                    id="average_cost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.average_cost}
                                    onChange={(event) => handleChange("average_cost", event.target.value)}
                                    placeholder="e.g. 24500.50"
                                    required
                                />
                            </div>

                            <div className="stock-holding-page__field">
                                <label htmlFor="quantity">Quantity</label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={form.quantity}
                                    onChange={(event) => handleChange("quantity", event.target.value)}
                                    placeholder="e.g. 100"
                                    required
                                />
                            </div>

                            <div className="stock-holding-page__field">
                                <label htmlFor="holding_date">Holding Date</label>
                                <Input
                                    id="holding_date"
                                    type="date"
                                    value={form.holding_date}
                                    max={maxHoldingDate}
                                    onChange={(event) => handleChange("holding_date", event.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="stock-holding-page__field">
                            <label htmlFor="holding_note">Note</label>
                            <textarea
                                id="holding_note"
                                className="stock-holding-page__textarea"
                                value={form.note}
                                onChange={(event) => handleChange("note", event.target.value)}
                                placeholder="Optional note about this holding"
                                rows={4}
                            />
                        </div>

                        <div className="stock-holding-page__helper">
                            Manual adjustment overwrites the current position. For buy-more or sell-partial flows, use Record Transaction above.
                        </div>

                        <div className="stock-holding-page__actions">
                            {holding ? (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setRemoveDialogOpen(true)}
                                    disabled={isSaving || isRemoving}
                                >
                                    <Trash2 className="mr-1.5 size-4" />
                                    Remove Holding
                                </Button>
                            ) : (
                                <div className="stock-holding-page__hint">
                                    <Landmark className="size-4" />
                                    Save this form when you want to set an initial position manually.
                                </div>
                            )}

                            <Button type="submit" disabled={isSaving || isRemoving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-1.5 size-4" />
                                        {holding ? "Update Holding" : "Save Holding"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                    </>
                    )}
                </section>
            </div>

            <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                <DialogContent className="max-w-md border-slate-700 bg-[#111827] text-white">
                    <DialogHeader>
                        <DialogTitle>Remove Holding</DialogTitle>
                        <DialogDescription>
                            This will remove the saved holding for {symbol} from your personal holdings tracker. The stock can still remain in your watchlist.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setRemoveDialogOpen(false)} disabled={isRemoving}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => void handleRemove()} disabled={isRemoving}>
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
