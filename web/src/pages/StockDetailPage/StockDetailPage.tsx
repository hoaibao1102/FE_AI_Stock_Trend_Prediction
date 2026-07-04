import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import type EChartsReact from "echarts-for-react"
import { Bell, Download, Eye, GitCompareArrows, RefreshCw, Star } from "lucide-react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Breadcrumb } from "@/shared/components"
import {
    getStockChart,
    getStockDetail,
    mockSnapshotToCandle,
    type StockCandle,
    type StockChartMeta,
    type StockChartRange,
} from "@/services/stock.service"
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "@/services/watchlist.service"
import { useAuthStore } from "@/stores/auth.store"
import "./StockDetailPage.css"

type Indicator = "SMA" | "EMA" | "RSI" | "MACD" | "Bollinger Bands"

const RANGES: StockChartRange[] = ["7d", "1m", "3m", "1y", "all"]
const INDICATORS: Indicator[] = ["SMA", "EMA", "RSI", "MACD", "Bollinger Bands"]

type LoadState = {
    candles: StockCandle[]
    meta: StockChartMeta
    isLoading: boolean
    error: string | null
}

type StatItem = {
    label: string
    value: string
    tone?: "positive" | "negative" | "neutral"
}

function formatNumber(value?: number, digits = 2) {
    if (value === undefined || !Number.isFinite(value)) return "--"
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value)
}

function formatCompact(value?: number) {
    if (value === undefined || !Number.isFinite(value)) return "--"
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

function formatPercent(value?: number) {
    if (value === undefined || !Number.isFinite(value)) return "--"
    return `${value >= 0 ? "+" : ""}${formatNumber(value, 2)}%`
}

function movingAverage(candles: StockCandle[], period: number) {
    return candles.map((_, index) => {
        if (index + 1 < period) return undefined
        const slice = candles.slice(index + 1 - period, index + 1)
        return slice.reduce((sum, candle) => sum + candle.close, 0) / period
    })
}

function exponentialAverage(candles: StockCandle[], period: number) {
    const multiplier = 2 / (period + 1)
    let previous: number | undefined
    return candles.map((candle) => {
        previous = previous === undefined ? candle.close : (candle.close - previous) * multiplier + previous
        return previous
    })
}

function standardDeviation(values: number[]) {
    if (!values.length) return undefined
    const average = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length
    return Math.sqrt(variance)
}

function maxDrawdown(candles: StockCandle[]) {
    let peak = candles[0]?.close
    let drawdown = 0

    for (const candle of candles) {
        if (peak === undefined || candle.close > peak) peak = candle.close
        if (peak) drawdown = Math.min(drawdown, ((candle.close - peak) / peak) * 100)
    }

    return drawdown
}

function buildDistribution(candles: StockCandle[]) {
    if (!candles.length) return []
    const closes = candles.map((candle) => candle.close)
    const min = Math.min(...closes)
    const max = Math.max(...closes)
    const bucketCount = Math.min(5, Math.max(1, candles.length))
    const width = (max - min || 1) / bucketCount

    return Array.from({ length: bucketCount }, (_, index) => {
        const start = min + width * index
        const end = index === bucketCount - 1 ? max : start + width
        const volume = candles
            .filter((candle) => candle.close >= start && candle.close <= end)
            .reduce((sum, candle) => sum + candle.volume, 0)

        return {
            label: `${formatNumber(start, 0)}-${formatNumber(end, 0)}`,
            volume,
        }
    })
}

function downloadCsv(symbol: string, candles: StockCandle[]) {
    const header = ["Date", "Open", "High", "Low", "Close", "Volume", "Change %"]
    const rows = candles.map((candle, index) => {
        const previous = candles[index - 1]?.close
        const change = previous ? ((candle.close - previous) / previous) * 100 : undefined
        return [candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume, change ?? ""]
    })
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${symbol}-ohlcv.csv`
    link.click()
    URL.revokeObjectURL(url)
}

function SkeletonBlock({ className }: { className?: string }) {
    return <div className={cn("stock-detail__skeleton", className)} />
}

function MetricCard({ label, value, tone = "neutral" }: StatItem) {
    return (
        <div className="stock-detail__metric">
            <span>{label}</span>
            <strong className={`is-${tone}`}>{value}</strong>
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="stock-detail__empty">
            <Eye className="size-5" />
            <span>{message}</span>
        </div>
    )
}

export default function StockDetailPage() {
    const { symbol: routeSymbol } = useParams()
    const symbol = (routeSymbol || "FPT").toUpperCase()
    const chartRef = useRef<EChartsReact>(null)
    const [range, setRange] = useState<StockChartRange>("1m")
    const [activeIndicators, setActiveIndicators] = useState<Set<Indicator>>(new Set(["SMA", "EMA"]))
    const [isWatched, setIsWatched] = useState(false)
    const [watchlistLoading, setWatchlistLoading] = useState(false)
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

    useEffect(() => {
        if (!isAuthenticated || !symbol) return
        let cancelled = false
        void (async () => {
            try {
                const list = await getWatchlist()
                if (!cancelled) {
                    setIsWatched(list.some((item) => item.symbol === symbol))
                }
            } catch {
                // non-blocking
            }
        })()
        return () => { cancelled = true }
    }, [isAuthenticated, symbol])

    // ── Poll stock detail for mock/live tick data ──────────────────────────
    const [mockPolling, setMockPolling] = useState(false)
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Start polling if the chart data has mock flag, or when range is "1m" (short window suitable for demo)
    const isWithinMockWindow = range === "1m"

    useEffect(() => {
        // Only poll when viewing short range (mock sessions use this range)
        if (!isWithinMockWindow || !symbol) {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current)
                pollTimerRef.current = null
            }
            setMockPolling(false)
            return
        }

        const poll = async () => {
            try {
                const detail = await getStockDetail(symbol)

                // Check if we're in a mock session
                if (detail._mock) {
                    setMockPolling(true)

                    const snapshot = detail.latest_price
                    if (!snapshot) return

                    // Convert to candle and append to existing chart data
                    const candle = mockSnapshotToCandle(snapshot, detail._cursor)

                    // Update current price display immediately
                    setState((prev) => ({
                        ...prev,
                        candles: [...prev.candles, candle],
                    }))

                    // Show alert notification when threshold crossed
                    if (detail.alert_triggered) {
                        toast.info("Alert Triggered!", {
                            description: `${symbol} crossed the threshold. Check Alerts page for details.`,
                            duration: 6000,
                        })
                    }

                    // Stop polling when done
                    if (detail._done) {
                        if (pollTimerRef.current) {
                            clearInterval(pollTimerRef.current)
                            pollTimerRef.current = null
                        }
                        setMockPolling(false)
                        toast.success("Mock simulation complete", {
                            description: `${symbol} price simulation finished. Data available until page reload.`,
                        })
                    }
                } else if (mockPolling) {
                    // Mock session ended externally (e.g. DELETE from Swagger)
                    setMockPolling(false)
                    if (pollTimerRef.current) {
                        clearInterval(pollTimerRef.current)
                        pollTimerRef.current = null
                    }
                }
            } catch {
                // Silently handle — auth token might not be set
            }
        }

        // Start polling at 1.5s interval
        pollTimerRef.current = setInterval(poll, 1500)
        return () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current)
                pollTimerRef.current = null
            }
            setMockPolling(false)
        }
    }, [symbol, isWithinMockWindow])

    const handleWatchToggle = async () => {
        if (!isAuthenticated) {
            toast.error("Authentication required", {
                description: "Please log in to manage your watchlist",
            })
            return
        }
        setWatchlistLoading(true)
        try {
            if (isWatched) {
                await removeFromWatchlist(symbol)
                setIsWatched(false)
                toast.success("Removed from watchlist", {
                    description: `${symbol} has been removed from your watchlist`,
                })
            } else {
                await addToWatchlist(symbol)
                setIsWatched(true)
                toast.success("Added to watchlist", {
                    description: `${symbol} has been added to your watchlist`,
                })
            }
        } catch (error) {
            toast.error("Watchlist update failed", {
                description: error instanceof Error ? error.message : "An unexpected error occurred",
            })
        } finally {
            setWatchlistLoading(false)
        }
    }

    const [state, setState] = useState<LoadState>({
        candles: [],
        meta: {},
        isLoading: true,
        error: null,
    })

    const loadChart = useCallback(async () => {
        setState((current) => ({ ...current, isLoading: true, error: null }))
        try {
            const result = await getStockChart(symbol, range)
            setState({ candles: result.candles, meta: result.meta, isLoading: false, error: null })
        } catch (error) {
            setState((current) => ({
                ...current,
                isLoading: false,
                error: error instanceof Error ? error.message : "Unable to load stock chart",
            }))
        }
    }, [range, symbol])

    useEffect(() => {
        void loadChart()
    }, [loadChart])

    // Resize chart when its container changes size
    useEffect(() => {
        const instance = chartRef.current?.getEchartsInstance()
        if (!instance) return

        const container = document.querySelector(".stock-detail__chart")
        if (!container) return

        const observer = new ResizeObserver(() => {
            instance.resize()
        })
        observer.observe(container)
        return () => observer.disconnect()
    }, [state.candles.length])

    const analytics = useMemo(() => {
        const candles = state.candles
        const latest = candles.at(-1)
        const previous = candles.at(-2)
        const closes = candles.map((candle) => candle.close)
        const returns = candles.slice(1).map((candle, index) => ((candle.close - candles[index].close) / candles[index].close) * 100)
        const volatility = standardDeviation(returns)
        const averageReturn = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : undefined
        const averageVolume = candles.length ? candles.reduce((sum, candle) => sum + candle.volume, 0) / candles.length : undefined
        const change = latest && previous ? latest.close - previous.close : undefined
        const changePercent = latest && previous ? (change ?? 0) / previous.close * 100 : undefined
        const trend = changePercent === undefined ? "--" : changePercent > 1 ? "Bullish" : changePercent < -1 ? "Bearish" : "Neutral"
        const volumeTrend = latest && averageVolume ? latest.volume / averageVolume : undefined

        return {
            latest,
            change,
            changePercent,
            trend,
            volatility,
            averageReturn,
            averageVolume,
            high52: closes.length ? Math.max(...closes) : undefined,
            low52: closes.length ? Math.min(...closes) : undefined,
            drawdown: candles.length ? maxDrawdown(candles) : undefined,
            volumeTrend,
            momentum: changePercent === undefined ? "--" : changePercent >= 0 ? "Positive" : "Negative",
            distribution: buildDistribution(candles),
        }
    }, [state.candles])

    const chartOption = useMemo<EChartsOption>(() => {
        const candles = state.candles
        const dates = candles.map((candle) => candle.time)
        const sma = movingAverage(candles, 10)
        const ema = exponentialAverage(candles, 12)
        const bollingerMid = movingAverage(candles, 20)
        const bollingerUpper = bollingerMid.map((mid, index) => {
            if (mid === undefined) return undefined
            const slice = candles.slice(Math.max(0, index - 19), index + 1).map((candle) => candle.close)
            const deviation = standardDeviation(slice)
            return deviation === undefined ? undefined : mid + deviation * 2
        })
        const bollingerLower = bollingerMid.map((mid, index) => {
            if (mid === undefined) return undefined
            const slice = candles.slice(Math.max(0, index - 19), index + 1).map((candle) => candle.close)
            const deviation = standardDeviation(slice)
            return deviation === undefined ? undefined : mid - deviation * 2
        })

        const series: EChartsOption["series"] = [
            {
                type: "candlestick",
                name: "OHLC",
                data: candles.map((candle) => [candle.open, candle.close, candle.low, candle.high]),
                itemStyle: {
                    color: "#16a34a",
                    color0: "#ef4444",
                    borderColor: "#22c55e",
                    borderColor0: "#f87171",
                },
                xAxisIndex: 0,
                yAxisIndex: 0,
            },
            {
                type: "bar",
                name: "Volume",
                data: candles.map((candle) => candle.volume),
                xAxisIndex: 1,
                yAxisIndex: 1,
                itemStyle: { color: "rgba(59, 130, 246, 0.45)" },
            },
        ]

        if (activeIndicators.has("SMA")) {
            series.push({ type: "line", name: "SMA 10", data: sma, smooth: true, showSymbol: false, lineStyle: { color: "#f59e0b", width: 1.4 } })
        }
        if (activeIndicators.has("EMA")) {
            series.push({ type: "line", name: "EMA 12", data: ema, smooth: true, showSymbol: false, lineStyle: { color: "#38bdf8", width: 1.4 } })
        }
        if (activeIndicators.has("Bollinger Bands")) {
            series.push(
                { type: "line", name: "BB Upper", data: bollingerUpper, smooth: true, showSymbol: false, lineStyle: { color: "#a78bfa", width: 1, opacity: 0.8 } },
                { type: "line", name: "BB Lower", data: bollingerLower, smooth: true, showSymbol: false, lineStyle: { color: "#a78bfa", width: 1, opacity: 0.8 } }
            )
        }

        return {
            backgroundColor: "transparent",
            animation: false,
            tooltip: {
                trigger: "axis",
                confine: true,
                axisPointer: {
                    type: "line",
                    lineStyle: { color: "#64748b", width: 1 },
                    label: { show: false },
                },
                backgroundColor: "#111827",
                borderColor: "#334155",
                borderWidth: 1,
                padding: [6, 10],
                textStyle: { color: "#e2e8f0", fontSize: 12 },
                extraCssText:
                    "box-shadow:0 4px 12px rgba(0,0,0,0.5);border-radius:6px;",
            },
            legend: {
                top: 4,
                left: 8,
                data: ["OHLC", "Volume"],
                textStyle: { color: "#94a3b8", fontSize: 11 },
            },
            grid: [
                { left: 46, right: 16, top: 34, height: "68%" },
                { left: 46, right: 16, top: "84%", height: "14%" },
            ],
            xAxis: [
                {
                    type: "category",
                    data: dates,
                    scale: true,
                    boundaryGap: false,
                    axisLine: { lineStyle: { color: "#334155" } },
                    axisLabel: { color: "#94a3b8", fontSize: 10 },
                    splitLine: { show: true, lineStyle: { color: "rgba(51, 65, 85, 0.5)" } },
                },
                {
                    type: "category",
                    data: dates,
                    gridIndex: 1,
                    axisLine: { lineStyle: { color: "#334155" } },
                    axisLabel: { show: false },
                    splitLine: { show: false },
                },
            ],
            yAxis: [
                {
                    scale: true,
                    axisLabel: { color: "#94a3b8", fontSize: 10 },
                    splitLine: { lineStyle: { color: "rgba(51, 65, 85, 0.5)" } },
                },
                {
                    scale: true,
                    gridIndex: 1,
                    axisLabel: { color: "#94a3b8", fontSize: 10 },
                    splitLine: { show: false },
                },
            ],
            dataZoom: [
                { type: "inside", xAxisIndex: [0, 1], start: 0, end: 100 },
                { show: false, xAxisIndex: [0, 1], start: 0, end: 100 },
            ],
            series,
        }
    }, [activeIndicators, state.candles])

    const currentPrice = analytics.latest?.close
    const isPositive = (analytics.change ?? 0) >= 0
    const maxBucketVolume = Math.max(...analytics.distribution.map((bucket) => bucket.volume), 1)
    const meta = state.meta
    const latestChange = analytics.change === undefined
        ? "--"
        : `${isPositive ? "+" : ""}${formatNumber(analytics.change, 3)} (${formatPercent(analytics.changePercent)})`

    return (
        <div className="stock-detail">
            <Breadcrumb items={["Home", "Dashboard", "Stock Detail"]} />

            <section className="stock-detail__header">
                <div>
                    <div className="stock-detail__title-row">
                        <h1>{symbol}</h1>
                        <Badge variant="outline">{meta.exchange || "HOSE"}</Badge>
                        <Badge variant="secondary">{meta.marketStatus || "Market Open"}</Badge>
                        {mockPolling && <Badge variant="default" className="animate-pulse">LIVE DEMO</Badge>}
                    </div>
                    <p>{meta.companyName || "Company name unavailable"}</p>
                    <div className="stock-detail__meta">
                        <span>{meta.sector || "--"}</span>
                        <span>Range {range.toUpperCase()}</span>
                    </div>
                </div>

                <div className="stock-detail__price">
                    <span>Current Price</span>
                    <strong>{formatNumber(currentPrice)}</strong>
                    <em className={isPositive ? "is-positive" : "is-negative"}>
                        {analytics.change === undefined ? "--" : `${isPositive ? "+" : ""}${formatNumber(analytics.change)} (${formatPercent(analytics.changePercent)})`}
                    </em>
                </div>
            </section>

            <section className="stock-detail__controls">
                <div className="stock-detail__range-group" aria-label="Range selector">
                    {RANGES.map((item) => (
                        <Button
                            key={item}
                            type="button"
                            size="xs"
                            variant={range === item ? "default" : "outline"}
                            onClick={() => setRange(item)}
                        >
                            {item.toUpperCase()}
                        </Button>
                    ))}
                </div>

                <div className="stock-detail__indicator-group">
                    {INDICATORS.map((indicator) => (
                        <button
                            key={indicator}
                            type="button"
                            className={cn("stock-detail__chip", activeIndicators.has(indicator) && "is-active")}
                            onClick={() => {
                                setActiveIndicators((current) => {
                                    const next = new Set(current)
                                    if (next.has(indicator)) next.delete(indicator)
                                    else next.add(indicator)
                                    return next
                                })
                            }}
                        >
                            {indicator}
                        </button>
                    ))}
                </div>

                <div className="stock-detail__actions">
                    <Button type="button" variant="outline" size="sm" onClick={() => downloadCsv(symbol, state.candles)} disabled={!state.candles.length}>
                        <Download className="size-3.5" /> Export
                    </Button>
                    <Button type="button" variant="outline" size="sm"><GitCompareArrows className="size-3.5" /> Compare</Button>
                    <Button type="button" variant="outline" size="sm"><Bell className="size-3.5" /> Alert</Button>
                    <Button type="button" variant={isWatched ? "default" : "outline"} size="sm" onClick={handleWatchToggle} disabled={watchlistLoading}>
                        <Star className={`size-3.5 ${isWatched ? "fill-amber-400 text-amber-400" : ""} ${watchlistLoading ? "animate-pulse" : ""}`} /> {watchlistLoading ? "Processing..." : isWatched ? "Watching" : "Watch"}
                    </Button>
                </div>
            </section>

            <section className="stock-detail__main-grid">
                <div className="stock-detail__card stock-detail__chart-card">
                    <div className="stock-detail__card-header">
                        <div>
                            <h2>Candlestick & Volume</h2>
                            <p className="stock-detail__quote-line">
                                {analytics.latest ? (
                                    <>
                                        <span className="stock-detail__quote-item stock-detail__quote-item--open">O {formatNumber(analytics.latest.open, 3)}</span>
                                        <span className="stock-detail__quote-item stock-detail__quote-item--high">H {formatNumber(analytics.latest.high, 3)}</span>
                                        <span className="stock-detail__quote-item stock-detail__quote-item--low">L {formatNumber(analytics.latest.low, 3)}</span>
                                        <span className="stock-detail__quote-item stock-detail__quote-item--close">C {formatNumber(analytics.latest.close, 3)}</span>
                                    </>
                                ) : (
                                    <span>--</span>
                                )}
                                <span className={isPositive ? "is-positive" : "is-negative"}>{latestChange}</span>
                            </p>
                        </div>
                        <Badge variant={analytics.trend === "Bullish" ? "default" : analytics.trend === "Bearish" ? "destructive" : "outline"}>
                            {analytics.trend}
                        </Badge>
                    </div>
                    {state.isLoading ? (
                        <SkeletonBlock className="stock-detail__chart-skeleton" />
                    ) : state.error ? (
                        <div className="stock-detail__error">
                            <span>{state.error}</span>
                            <Button type="button" size="xs" onClick={() => void loadChart()}>
                                <RefreshCw className="size-3" /> Retry
                            </Button>
                        </div>
                    ) : state.candles.length ? (
                        <ReactECharts ref={chartRef} option={chartOption} className="stock-detail__chart" notMerge lazyUpdate onChartReady={(instance) => instance.resize()} />
                    ) : (
                        <EmptyState message="No chart data is available for the selected range." />
                    )}
                </div>

                <aside className="stock-detail__analytics">
                    <div className="stock-detail__card">
                        <div className="stock-detail__card-header"><h2>Market Analytics</h2></div>
                        {state.isLoading ? <SkeletonBlock className="stock-detail__panel-skeleton" /> : (
                            <div className="stock-detail__metrics">
                                <MetricCard label="Historical volatility" value={formatPercent(analytics.volatility)} />
                                <MetricCard label="Trend overview" value={analytics.trend} tone={analytics.trend === "Bullish" ? "positive" : analytics.trend === "Bearish" ? "negative" : "neutral"} />
                                <MetricCard label="Volume trend" value={analytics.volumeTrend ? `${formatNumber(analytics.volumeTrend, 2)}x avg` : "--"} />
                                <MetricCard label="Momentum" value={analytics.momentum} tone={analytics.momentum === "Positive" ? "positive" : analytics.momentum === "Negative" ? "negative" : "neutral"} />
                                <MetricCard label="Sector comparison" value="--" />
                            </div>
                        )}
                    </div>

                    <div className="stock-detail__card">
                        <div className="stock-detail__card-header"><h2>Historical Statistics</h2></div>
                        {state.isLoading ? <SkeletonBlock className="stock-detail__panel-skeleton" /> : (
                            <div className="stock-detail__metrics">
                                <MetricCard label="52-week high" value={formatNumber(analytics.high52)} />
                                <MetricCard label="52-week low" value={formatNumber(analytics.low52)} />
                                <MetricCard label="Average volume" value={formatCompact(analytics.averageVolume)} />
                                <MetricCard label="Average daily return" value={formatPercent(analytics.averageReturn)} />
                                <MetricCard label="Max drawdown" value={formatPercent(analytics.drawdown)} tone="negative" />
                            </div>
                        )}
                    </div>

                    <div className="stock-detail__card">
                        <div className="stock-detail__card-header"><h2>Alert Configuration</h2></div>
                        <div className="stock-detail__alert-list">
                            <span>Active rules <strong>--</strong></span>
                            <span>Triggered status <Badge variant="outline">--</Badge></span>
                            <span>Channels <strong>--</strong></span>
                        </div>
                    </div>
                </aside>
            </section>

            <section className="stock-detail__lower-grid">
                <div className="stock-detail__card">
                    <div className="stock-detail__card-header">
                        <h2>Historical OHLCV Data</h2>
                        <Button type="button" variant="outline" size="xs" onClick={() => downloadCsv(symbol, state.candles)} disabled={!state.candles.length}>
                            <Download className="size-3" /> CSV
                        </Button>
                    </div>
                    {state.isLoading ? <SkeletonBlock className="stock-detail__table-skeleton" /> : state.candles.length ? (
                        <div className="stock-detail__table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Open</th>
                                        <th>High</th>
                                        <th>Low</th>
                                        <th>Close</th>
                                        <th>Volume</th>
                                        <th>Change %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {state.candles.slice(-10).reverse().map((candle, reverseIndex) => {
                                        const originalIndex = state.candles.length - 1 - reverseIndex
                                        const previous = state.candles[originalIndex - 1]?.close
                                        const change = previous ? ((candle.close - previous) / previous) * 100 : undefined
                                        return (
                                            <tr key={`${candle.time}-${originalIndex}`}>
                                                <td>{candle.time}</td>
                                                <td>{formatNumber(candle.open)}</td>
                                                <td>{formatNumber(candle.high)}</td>
                                                <td>{formatNumber(candle.low)}</td>
                                                <td>{formatNumber(candle.close)}</td>
                                                <td>{formatCompact(candle.volume)}</td>
                                                <td className={(change ?? 0) >= 0 ? "is-positive" : "is-negative"}>{formatPercent(change)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : <EmptyState message="No OHLCV rows to display." />}
                </div>

                <div className="stock-detail__card">
                    <div className="stock-detail__card-header"><h2>Volume Distribution</h2></div>
                    {state.isLoading ? <SkeletonBlock className="stock-detail__panel-skeleton" /> : analytics.distribution.length ? (
                        <div className="stock-detail__distribution">
                            {analytics.distribution.map((bucket) => (
                                <div key={bucket.label} className="stock-detail__bucket">
                                    <span>{bucket.label}</span>
                                    <div><i style={{ width: `${Math.max(5, (bucket.volume / maxBucketVolume) * 100)}%` }} /></div>
                                    <strong>{formatCompact(bucket.volume)}</strong>
                                </div>
                            ))}
                        </div>
                    ) : <EmptyState message="No volume buckets available." />}
                </div>
            </section>
        </div>
    )
}
