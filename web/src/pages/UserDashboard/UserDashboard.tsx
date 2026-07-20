import { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import {
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Activity,
    Star,
    ArrowUpRight,
    ArrowDownRight,
    Eye
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getUserDashboard, type UserDashboardData, type MarketOverviewIndex } from "@/services/dashboard.service"
import { toast } from "sonner"

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

function SparklineChart({ indexData }: { indexData: MarketOverviewIndex }) {
    const isPositive = indexData.change_percent >= 0
    const prices = indexData.chart.map(c => c.close)
    const dates = indexData.chart.map(c => c.date)

    const option: EChartsOption = {
        grid: { left: 4, right: 4, top: 4, bottom: 4 },
        xAxis: {
            type: "category",
            data: dates,
            show: false,
        },
        yAxis: {
            type: "value",
            show: false,
            min: "dataMin",
            max: "dataMax",
        },
        tooltip: {
            trigger: "axis",
            confine: true,
            axisPointer: { type: "none" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (params: any) => {
                const item = params[0]
                return `${item.name}: <strong>${formatNumber(item.value)}</strong>`
            },
            backgroundColor: "#1e293b",
            borderColor: "#334155",
            borderWidth: 1,
            textStyle: { color: "#e2e8f0", fontSize: 10 },
        },
        series: [
            {
                data: prices,
                type: "line",
                showSymbol: false,
                smooth: true,
                lineStyle: {
                    color: isPositive ? "#22c55e" : "#ef4444",
                    width: 2,
                },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: isPositive ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                            },
                            {
                                offset: 1,
                                color: isPositive ? "rgba(34, 197, 94, 0)" : "rgba(239, 68, 68, 0)",
                            },
                        ],
                    },
                },
            },
        ],
    }

    return (
        <div style={{ height: "60px", width: "100%" }}>
            {prices.length > 0 ? (
                <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
            ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">No chart data</div>
            )}
        </div>
    )
}

function formatTradingDate(value: string | number | null | undefined): string {
  if (!value) return "--";

  const str = String(value);

  if (str.length !== 8) return str;

  const year = str.slice(0, 4);
  const month = str.slice(4, 6);
  const day = str.slice(6, 8);

  return `${year}-${month}-${day}`;
};

export default function UserDashboard() {
    const [data, setData] = useState<UserDashboardData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchDashboard = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await getUserDashboard()
            setData(result)
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unable to load dashboard data"
            setError(msg)
            toast.error("Dashboard Load Failed", { description: msg })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchDashboard()
    }, [fetchDashboard])

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center animate-pulse">
                    <div>
                        <div className="h-8 w-48 bg-slate-800 rounded mb-2" />
                        <div className="h-4 w-64 bg-slate-800 rounded" />
                    </div>
                    <div className="h-10 w-24 bg-slate-800 rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-slate-800 rounded-lg animate-pulse" />
                    ))}
                </div>
                <div className="h-64 bg-slate-800 rounded-lg animate-pulse" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
                <p className="text-rose-500 font-medium mb-4">{error || "No dashboard data available"}</p>
                <Button onClick={() => void fetchDashboard()}>
                    <RefreshCw className="mr-2 size-4" /> Retry Loading
                </Button>
            </div>
        )
    }

    const { watchlist, market_leaders, market_overview } = data

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-primary from-teal-400 to-blue-500 bg-clip-text text-transparent">
                        Market Dashboard
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Analyze index trends, watchlist performance, and top market gainers/losers.
                    </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void fetchDashboard()}>
                    <RefreshCw className="size-3.5 mr-2" /> Refresh
                </Button>
            </div>

            {/* Market Index Sparklines */}
            {market_overview && market_overview.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {market_overview.map((idx) => {
                        const isPositive = idx.change_percent >= 0
                        return (
                            <div
                                key={idx.symbol}
                                className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl hover:border-slate-700 transition duration-300"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-bold text-slate-200">{idx.display_symbol}</span>
                                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                                {idx.market}
                                            </Badge>
                                        </div>
                                        <p className="text-2xl font-black text-slate-50 mt-1">{formatNumber(idx.close_index)}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                                        {isPositive ? (
                                            <ArrowUpRight className="size-4" />
                                        ) : (
                                            <ArrowDownRight className="size-4" />
                                        )}
                                        <span>{formatPercent(idx.change_percent)}</span>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <SparklineChart indexData={idx} />
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-medium">
                                    <span>Vol: {formatCompact(idx.total_volume)}</span>
                                    <span>Date: {idx.trading_date}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Watchlist Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Watchlist Quick Summary Cards */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md shadow-lg flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Watchlist Items</span>
                            <h3 className="text-3xl font-black text-slate-100 mt-1">{watchlist.total_stocks}</h3>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                            <Star className="size-5 text-amber-400 fill-amber-400" />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md shadow-lg">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Daily Watchlist Trends</span>
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="flex items-center gap-1.5 text-slate-400"><TrendingUp className="size-3.5 text-emerald-500" /> Gainers</span>
                                <strong className="text-emerald-400 text-sm font-bold">{watchlist.trends.gainers}</strong>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="flex items-center gap-1.5 text-slate-400"><TrendingDown className="size-3.5 text-rose-500" /> Losers</span>
                                <strong className="text-rose-400 text-sm font-bold">{watchlist.trends.losers}</strong>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="flex items-center gap-1.5 text-slate-400"><Activity className="size-3.5 text-slate-400" /> Unchanged</span>
                                <strong className="text-slate-200 text-sm font-bold">{watchlist.trends.flat}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Watchlist Table */}
                <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl p-5 overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                <Star className="size-4 text-amber-400 fill-amber-400" /> My Watchlist
                            </h2>
                            <Link to="/watchlist" className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition">
                                Manage →
                            </Link>
                        </div>

                        {watchlist.items.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                                            <th className="py-2.5">Symbol</th>
                                            <th className="py-2.5">Company Name</th>
                                            <th className="py-2.5 text-right">Latest Price</th>
                                            <th className="py-2.5 text-right">Change</th>
                                            <th className="py-2.5 text-right">Change %</th>
                                            <th className="py-2.5 text-right">Volume</th>
                                            <th className="py-2.5 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {watchlist.items.map((item) => {
                                            const isPos = (item.latest_price?.price_change_percent ?? 0) >= 0
                                            return (
                                                <tr key={item.watchlist_id} className="hover:bg-slate-800/20 transition-colors">
                                                    <td className="py-3 font-bold text-slate-200">
                                                        <Link to={`/stocks/${item.stock.symbol}`} className="hover:text-blue-400 transition">
                                                            {item.stock.symbol}
                                                        </Link>
                                                    </td>
                                                    <td className="py-3 text-slate-400 max-w-[200px] truncate">{item.stock.company_name}</td>
                                                    <td className="py-3 text-right font-semibold text-slate-200">
                                                        {item.latest_price ? formatNumber(item.latest_price.close_price, 0) : "--"}
                                                    </td>
                                                    <td className={`py-3 text-right font-medium ${isPos ? "text-emerald-500" : "text-rose-500"}`}>
                                                        {item.latest_price ? formatNumber(item.latest_price.price_change, 0) : "--"}
                                                    </td>
                                                    <td className={`py-3 text-right font-bold ${isPos ? "text-emerald-500" : "text-rose-500"}`}>
                                                        {item.latest_price ? formatPercent(item.latest_price.price_change_percent) : "--"}
                                                    </td>
                                                    <td className="py-3 text-right text-slate-400">
                                                        {item.latest_price ? formatCompact(item.latest_price.volume) : "--"}
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <Link to={`/stocks/${item.stock.symbol}`} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition font-medium">
                                                            <Eye className="size-3.5" /> View
                                                        </Link>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-800 rounded-xl">
                                <p className="text-slate-500 text-xs mb-3">No stocks added to your watchlist yet.</p>
                                <Link to="/stock-list">
                                    <Button size="xs" variant="outline">Browse Stock Catalog</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Market Leaders (Gainers / Losers) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Gainers */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-xl">
                    <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <TrendingUp className="size-4 text-emerald-500" /> Top 5 Gainers
                        <span className="text-[10px] text-slate-500 font-normal">({formatTradingDate(market_leaders.latest_trading_date)})</span>
                    </h2>
                    {market_leaders.gainers.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                        <th className="py-2">Symbol</th>
                                        <th className="py-2">Company</th>
                                        <th className="py-2 text-right">Price</th>
                                        <th className="py-2 text-right">Change %</th>
                                        <th className="py-2 text-right">Volume</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {market_leaders.gainers.map((g) => (
                                        <tr key={g.symbol} className="hover:bg-slate-800/10 transition-colors">
                                            <td className="py-2.5 font-bold text-slate-200">
                                                <Link to={`/stocks/${g.symbol}`} className="hover:text-blue-400 transition">{g.symbol}</Link>
                                            </td>
                                            <td className="py-2.5 text-slate-400 max-w-[150px] truncate">{g.company_name}</td>
                                            <td className="py-2.5 text-right font-semibold text-slate-200">{formatNumber(g.close_price, 0)}</td>
                                            <td className="py-2.5 text-right font-black text-emerald-500">{formatPercent(g.price_change_percent)}</td>
                                            <td className="py-2.5 text-right text-slate-400">{formatCompact(g.volume)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-800 rounded-xl">
                            <p className="text-slate-500 text-xs">No gainers data for this date</p>
                        </div>
                    )}
                </div>

                {/* Top Losers */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-xl">
                    <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <TrendingDown className="size-4 text-rose-500" /> Top 5 Losers
                        <span className="text-[10px] text-slate-500 font-normal">({formatTradingDate(market_leaders.latest_trading_date)})</span>
                    </h2>
                    {market_leaders.losers.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                        <th className="py-2">Symbol</th>
                                        <th className="py-2">Company</th>
                                        <th className="py-2 text-right">Price</th>
                                        <th className="py-2 text-right">Change %</th>
                                        <th className="py-2 text-right">Volume</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {market_leaders.losers.map((l) => (
                                        <tr key={l.symbol} className="hover:bg-slate-800/10 transition-colors">
                                            <td className="py-2.5 font-bold text-slate-200">
                                                <Link to={`/stocks/${l.symbol}`} className="hover:text-blue-400 transition">{l.symbol}</Link>
                                            </td>
                                            <td className="py-2.5 text-slate-400 max-w-[150px] truncate">{l.company_name}</td>
                                            <td className="py-2.5 text-right font-semibold text-slate-200">{formatNumber(l.close_price, 0)}</td>
                                            <td className="py-2.5 text-right font-black text-rose-500">{formatPercent(l.price_change_percent)}</td>
                                            <td className="py-2.5 text-right text-slate-400">{formatCompact(l.volume)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-800 rounded-xl">
                            <p className="text-slate-500 text-xs">No losers data for this date</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
