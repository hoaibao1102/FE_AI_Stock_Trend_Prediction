/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AiReportData, AnalyseOneRequest } from "@/types/aiReport"
import { AnalyseServiceError } from "@/types/aiReport"
import type { VisualizationChart, VisualizationTable, VisualizationV1 } from "@/types/visualization"
import { fetchVisualizationJson } from "@/services/aiReportService"

const VISUALIZATION_FETCH_TIMEOUT_MS = 10_000
const FALLBACK = "Chưa xác minh"

function toNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
        const normalized = Number(value.replace(/[%,$\s]/g, "").replace(/,/g, ""))
        if (Number.isFinite(normalized)) return normalized
    }
    return undefined
}

function displayText(value: unknown, fallback = FALLBACK) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    if (typeof value === "boolean") return value ? "Có" : "Không"
    return fallback
}

function formatNumber(value?: number, digits = 2) {
    if (value === undefined || !Number.isFinite(value)) return FALLBACK
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(value)
}

function formatCompact(value?: number) {
    if (value === undefined || !Number.isFinite(value)) return FALLBACK
    return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 2 }).format(value)
}

function formatPercent(value?: number) {
    if (value === undefined || !Number.isFinite(value)) return FALLBACK
    return `${formatNumber(Math.abs(value) <= 1 ? value * 100 : value, 2)}%`
}

function getValue(row: Record<string, unknown> | undefined, keys: readonly string[]) {
    if (!row) return undefined
    for (const key of keys) {
        const value = row[key]
        if (value !== undefined && value !== null && value !== "") return value
    }
    return undefined
}

function getTable(dataset: VisualizationV1, name: string): VisualizationTable | null {
    return dataset.tables.find((table) => (table.name || "").toLowerCase() === name) ?? null
}

function getRows(dataset: VisualizationV1, name: string): Record<string, unknown>[] {
    const rows = getTable(dataset, name)?.rows
    return Array.isArray(rows) ? rows.filter((row) => row && typeof row === "object") : []
}

function hasOhlc(rows: Record<string, unknown>[]) {
    return rows.some((row) =>
        ["open", "high", "low", "close"].every((key) => toNumber(getValue(row, [key, key.charAt(0)])) !== undefined)
    )
}

function buildVisualizationCacheKey(report: AiReportData, request?: AnalyseOneRequest | null) {
    return report.history_id || report.report_id || `${report.symbol || request?.symbol || "unknown"}:${report.scope_exchange || request?.scopeExchange || "HOSE"}`
}

function getVisualizationErrorMessage(error: unknown, didTimeout?: boolean) {
    if (didTimeout) return "Tải dữ liệu trực quan hóa quá lâu. Vui lòng thử lại."

    if (error instanceof AnalyseServiceError) {
        const status = error.technicalDetails?.httpStatus
        if (status === 401 || error.kind === "auth_required") return "Bạn cần đăng nhập lại để xem dữ liệu trực quan hóa."
        if (status === 403) return "Bạn cần thêm mã cổ phiếu này vào watchlist trước khi xem dữ liệu trực quan hóa."
        if (status === 404) return "Không tìm thấy dữ liệu trực quan hóa cho báo cáo này."
        if (status && status >= 500) return "Không thể tải dữ liệu trực quan hóa. Vui lòng kiểm tra AI service/analyse logs."
        if (error.kind === "network") return "Không thể kết nối tới AI service. Vui lòng kiểm tra backend/analyse service."
        if (error.kind === "timeout") return "Tải dữ liệu trực quan hóa quá lâu. Vui lòng thử lại."
        return error.message
    }

    return error instanceof Error ? error.message : String(error)
}

function buildPriceOption(rows: Record<string, unknown>[]): EChartsOption {
    const labels = rows.map((row) => displayText(getValue(row, ["date", "time", "trading_date", "tradingDate"])))
    const volume = rows.map((row) => toNumber(getValue(row, ["volume", "total_volume", "v"])))
    const close = rows.map((row) => toNumber(getValue(row, ["close", "close_price", "price", "c"])))
    const ma20 = rows.map((row) => toNumber(getValue(row, ["ma20", "ma_20", "sma20"])))
    const ma50 = rows.map((row) => toNumber(getValue(row, ["ma50", "ma_50", "sma50"])))
    const ohlc = hasOhlc(rows)

    const priceSeries: EChartsOption["series"] = ohlc
        ? [
              {
                  name: "OHLC",
                  type: "candlestick",
                  data: rows.map((row) => [
                      toNumber(getValue(row, ["open", "o"])) ?? 0,
                      toNumber(getValue(row, ["close", "c", "close_price", "price"])) ?? 0,
                      toNumber(getValue(row, ["low", "l"])) ?? 0,
                      toNumber(getValue(row, ["high", "h"])) ?? 0,
                  ]),
                  itemStyle: { color: "#16a34a", color0: "#dc2626", borderColor: "#15803d", borderColor0: "#b91c1c" },
              },
          ]
        : [
              {
                  name: "Close",
                  type: "line",
                  smooth: true,
                  showSymbol: false,
                  data: close,
                  lineStyle: { color: "#2563eb", width: 2 },
                  areaStyle: { color: "rgba(37,99,235,0.1)" },
              },
          ]

    return {
        tooltip: { trigger: "axis", confine: true },
        legend: { top: 0, textStyle: { color: "#475569" } },
        grid: [
            { left: 56, right: 54, top: 38, height: "58%" },
            { left: 56, right: 54, bottom: 28, height: "18%" },
        ],
        xAxis: [
            { type: "category", data: labels, axisLabel: { color: "#64748b" }, axisLine: { lineStyle: { color: "#cbd5e1" } } },
            { type: "category", data: labels, gridIndex: 1, axisLabel: { color: "#64748b" }, axisLine: { lineStyle: { color: "#cbd5e1" } } },
        ],
        yAxis: [
            { type: "value", name: "Giá", scale: true, axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#e5e7eb" } } },
            { type: "value", name: "KL", scale: true, gridIndex: 1, axisLabel: { color: "#64748b" }, splitLine: { show: false } },
        ],
        series: [
            ...priceSeries,
            { name: "MA20", type: "line", showSymbol: false, data: ma20, lineStyle: { color: "#f59e0b", width: 1.5 } },
            { name: "MA50", type: "line", showSymbol: false, data: ma50, lineStyle: { color: "#7c3aed", width: 1.5 } },
            { name: "Volume", type: "bar", xAxisIndex: 1, yAxisIndex: 1, data: volume, itemStyle: { color: "rgba(14,165,233,0.44)" } },
        ],
    }
}

function buildLineOption(rows: Record<string, unknown>[], series: Array<{ name: string; keys: string[]; color: string }>): EChartsOption {
    const labels = rows.map((row) => displayText(getValue(row, ["date", "time", "period", "label", "year", "quarter"])))
    return {
        tooltip: { trigger: "axis", confine: true },
        legend: { top: 0, textStyle: { color: "#475569" } },
        grid: { left: 54, right: 24, top: 42, bottom: 34 },
        xAxis: { type: "category", data: labels, axisLabel: { color: "#64748b" } },
        yAxis: { type: "value", scale: true, axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#e5e7eb" } } },
        series: series.map((item) => ({
            name: item.name,
            type: "line",
            smooth: true,
            showSymbol: false,
            data: rows.map((row) => toNumber(getValue(row, item.keys))),
            lineStyle: { color: item.color, width: 2 },
        })),
    }
}

function buildFinancialOption(rows: Record<string, unknown>[]): EChartsOption {
    const labels = rows.map((row) => displayText(getValue(row, ["period", "quarter", "year", "label", "date"])))
    const bar = (name: string, keys: string[], color: string) => ({
        name,
        type: "bar" as const,
        data: rows.map((row) => toNumber(getValue(row, keys))),
        itemStyle: { color, borderRadius: [5, 5, 0, 0] },
    })
    return {
        tooltip: { trigger: "axis", confine: true },
        legend: { top: 0, textStyle: { color: "#475569" } },
        grid: { left: 58, right: 24, top: 42, bottom: 34 },
        xAxis: { type: "category", data: labels, axisLabel: { color: "#64748b" } },
        yAxis: { type: "value", axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#e5e7eb" } } },
        series: [
            bar("Doanh thu", ["revenue", "net_revenue", "net_interest_income"], "#2563eb"),
            bar("Lợi nhuận gộp", ["gross_profit"], "#0f766e"),
            bar("LNST", ["profit_after_tax", "pat", "net_profit"], "#16a34a"),
            { name: "EPS", type: "line", data: rows.map((row) => toNumber(getValue(row, ["eps", "eps_4q"]))), lineStyle: { color: "#f59e0b", width: 2 } },
        ],
    }
}

function buildBarOption(rows: Record<string, unknown>[], labelKeys: string[], metrics: Array<{ name: string; keys: string[]; color: string }>): EChartsOption {
    return {
        tooltip: { trigger: "axis", confine: true },
        legend: { top: 0, textStyle: { color: "#475569" } },
        grid: { left: 54, right: 24, top: 42, bottom: 40 },
        xAxis: {
            type: "category",
            data: rows.map((row) => displayText(getValue(row, labelKeys))),
            axisLabel: { color: "#64748b", rotate: rows.length > 5 ? 24 : 0 },
        },
        yAxis: { type: "value", axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#e5e7eb" } } },
        series: metrics.map((metric) => ({
            name: metric.name,
            type: "bar",
            data: rows.map((row) => toNumber(getValue(row, metric.keys))),
            itemStyle: { color: metric.color, borderRadius: [5, 5, 0, 0] },
            barMaxWidth: 34,
        })),
    }
}

function EmptyChart({ message }: { message: string }) {
    return (
        <div className="ai-report-empty">
            <span>{message}</span>
        </div>
    )
}

function ChartPanel({ title, option, hasData }: { title: string; option: EChartsOption; hasData: boolean }) {
    return (
        <div className="ai-report-chart-card">
            <h3>{title}</h3>
            {hasData ? <ReactECharts option={option} className="ai-report-chart" notMerge lazyUpdate /> : <EmptyChart message="Chưa đủ dữ liệu để hiển thị." />}
        </div>
    )
}

function ChartPanelV2({ chart }: { chart: VisualizationChart }) {
    return (
        <div className="ai-report-chart-card">
            <h3>{chart.title}</h3>
            {chart.type === "echarts" ? (
                <ReactECharts
                    option={chart.option as EChartsOption}
                    className="ai-report-chart"
                    style={{ height: chart.height ?? 360 }}
                    notMerge
                    lazyUpdate
                />
            ) : (
                <EmptyChart message={chart.message || "Chưa đủ dữ liệu để hiển thị."} />
            )}
        </div>
    )
}

function TextList({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="ai-report-card">
            <h3>{title}</h3>
            {items.length ? (
                <ul className="ai-report-list">
                    {items.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                    ))}
                </ul>
            ) : (
                <EmptyChart message="Không có dữ liệu." />
            )}
        </div>
    )
}

export default function VisualizationTab({ report, request }: { report: AiReportData; request?: AnalyseOneRequest | null }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [dataset, setDataset] = useState<VisualizationV1 | null>(null)
    const [fetchedKey, setFetchedKey] = useState<string | null>(null)
    const requestRef = useRef(request)
    const reportRef = useRef(report)
    const cacheKey = useMemo(() => buildVisualizationCacheKey(report, request), [report, request])

    useEffect(() => {
        requestRef.current = request
        reportRef.current = report
    }, [request, report])

    useEffect(() => {
        if (fetchedKey === cacheKey) return
        setDataset(null)
        setError(null)
        setLoading(false)
    }, [cacheKey, fetchedKey])

    const fetchData = useCallback(async () => {
        const controller = new AbortController()
        let timedOut = false
        const timeoutId = window.setTimeout(() => {
            timedOut = true
            controller.abort()
        }, VISUALIZATION_FETCH_TIMEOUT_MS)

        setError(null)
        setLoading(true)

        try {
            const historyId = reportRef.current?.history_id?.trim()
            const reportId = reportRef.current?.report_id?.trim()
            const currentRequest = requestRef.current
                ? {
                      ...requestRef.current,
                      options: {
                          ...requestRef.current.options,
                          ...(reportId ? { reportId, report_id: reportId } : {}),
                      },
                  }
                : undefined
            let payload = null

            if (historyId) {
                try {
                    payload = await fetchVisualizationJson(undefined, historyId, controller.signal)
                } catch (historyError) {
                    const status = historyError instanceof AnalyseServiceError ? historyError.technicalDetails?.httpStatus : undefined
                    if (!currentRequest || (status && status !== 404)) throw historyError
                }
            }

            if (!payload) {
                payload = await fetchVisualizationJson(currentRequest, undefined, controller.signal)
            }

            if (controller.signal.aborted) return
            setDataset(payload.data ?? null)
            setFetchedKey(cacheKey)
        } catch (err) {
            if (controller.signal.aborted && !timedOut) return
            setDataset(null)
            setFetchedKey(cacheKey)
            setError(getVisualizationErrorMessage(err, timedOut))
        } finally {
            window.clearTimeout(timeoutId)
            setLoading(false)
        }
    }, [cacheKey])

    useEffect(() => {
        if (loading || fetchedKey === cacheKey) return
        void fetchData()
    }, [cacheKey, fetchData, fetchedKey, loading])

    const retry = () => {
        setFetchedKey(null)
        void fetchData()
    }

    if (loading) {
        return (
            <section className="ai-report-section visualization-state-card">
                <Loader2 className="size-5 animate-spin" />
                <div>
                    <h2>Biểu đồ trực quan</h2>
                    <p>Đang tải dữ liệu trực quan hóa...</p>
                    <div className="visualization-skeleton-grid">
                        <span />
                        <span />
                        <span />
                    </div>
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className="ai-report-section visualization-state-card visualization-state-card--error">
                <AlertTriangle className="size-5" />
                <div>
                    <h2>Không tải được dữ liệu trực quan hóa</h2>
                    <p>{error}</p>
                    <Button type="button" variant="outline" onClick={retry}>
                        <RefreshCw className="size-4" />
                        Thử lại
                    </Button>
                </div>
            </section>
        )
    }

    if (!dataset || !Array.isArray(dataset.tables) || dataset.tables.length === 0) {
        return (
            <section className="ai-report-section">
                <div className="ai-report-section__heading">
                    <div>
                        <h2>Biểu đồ trực quan</h2>
                        <p>Chưa có dữ liệu visualization.v1 cho báo cáo này.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={retry}>
                        <RefreshCw className="size-4" />
                        Tải lại
                    </Button>
                </div>
                <EmptyChart message="Không tìm thấy bảng dữ liệu trực quan hóa." />
            </section>
        )
    }

    const v2Charts = Array.isArray(dataset.visualization?.charts) ? dataset.visualization.charts : []
    if (v2Charts.length > 0) {
        return (
            <div className="visualization-tab visualization-tab--charts-only">
                <section className="ai-report-section">
                    <div className="ai-report-section__heading">
                        <div>
                            <h2>Biểu đồ trực quan</h2>
                        </div>
                        <Button type="button" variant="outline" onClick={retry}>
                            <RefreshCw className="size-4" />
                            Tải lại
                        </Button>
                    </div>
                    <div className="visualization-chart-grid">
                        {v2Charts.map((chart) => (
                            <ChartPanelV2 key={chart.id} chart={chart} />
                        ))}
                    </div>
                </section>
            </div>
        )
    }

    const prices = getRows(dataset, "prices")
    const financials = getRows(dataset, "financial_periods")
    const scores = getRows(dataset, "scores")
    const peers = getRows(dataset, "peers")
    const marketContext = getRows(dataset, "market_context")
    const aiSignals = getRows(dataset, "ai_signals")
    const dataQuality = getRows(dataset, "data_quality")
    const latestPriceRow = prices.at(-1)
    const firstPriceRow = prices[0]
    const latestClose = toNumber(getValue(latestPriceRow, ["close", "close_price", "price", "c"]))
    const firstClose = toNumber(getValue(firstPriceRow, ["close", "close_price", "price", "c"]))
    const returnPct =
        toNumber(getValue(latestPriceRow, ["return_pct", "change_pct", "pct_change"])) ??
        (latestClose !== undefined && firstClose ? ((latestClose - firstClose) / firstClose) * 100 : undefined)
    const scoreRow = scores[0]
    const totalScore = toNumber(getValue(scoreRow, ["score", "total_score", "overall_score", "confidence"]))
    const risk = displayText(getValue(scoreRow, ["risk", "risk_score", "risk_label"]) ?? report.summary?.system_decision?.risk_label)
    const confidence = toNumber(getValue(scoreRow, ["confidence", "data_confidence"]) ?? dataset.meta?.data_confidence)
    const rowCounts = dataset.tables.map((table) => `${table.name}: ${table.row_count ?? table.rows?.length ?? 0}`).join(" | ")

    const warningItems = dataQuality
        .flatMap((row) => [getValue(row, ["warning", "warnings", "message", "detail", "reason"])])
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => displayText(value, ""))
        .filter(Boolean)
    const missingItems = dataQuality
        .flatMap((row) => [getValue(row, ["missing_fields", "missing", "field"])])
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => displayText(value, ""))
        .filter(Boolean)
    const sourceStatuses = dataQuality
        .concat(aiSignals)
        .map((row) => {
            const source = displayText(getValue(row, ["source", "name", "provider"]), "")
            const status = displayText(getValue(row, ["status", "source_status", "quality"]), "")
            return source || status ? `${source || "Nguồn"}: ${status || FALLBACK}` : ""
        })
        .filter(Boolean)
    const derivedNotes = dataset.tables
        .flatMap((table) => table.columns ?? [])
        .filter((column) => column.derived || column.formula || column.description)
        .map((column) => `${column.name}: ${column.formula || column.description || "derived"}`)

    return (
        <div className="visualization-tab">
            <section className="ai-report-section">
                <div className="ai-report-section__heading">
                    <div>
                        <h2>Biểu đồ trực quan</h2>
                        <p>Dữ liệu native charts được dựng trực tiếp từ schema {dataset.schema_version || "visualization.v1"}.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={retry}>
                        <RefreshCw className="size-4" />
                        Tải lại
                    </Button>
                </div>
                <div className="ai-report-kpi-grid visualization-kpi-grid">
                    <div>
                        <span>Latest close</span>
                        <strong>{formatNumber(latestClose, 2)}</strong>
                    </div>
                    <div>
                        <span>Return</span>
                        <strong>{formatPercent(returnPct)}</strong>
                    </div>
                    <div>
                        <span>Score</span>
                        <strong>{formatNumber(totalScore, 1)}</strong>
                    </div>
                    <div>
                        <span>Risk</span>
                        <strong>{risk}</strong>
                    </div>
                    <div>
                        <span>Data confidence</span>
                        <strong>{confidence === undefined ? FALLBACK : formatPercent(Math.abs(confidence) <= 1 ? confidence : confidence / 100)}</strong>
                    </div>
                    <div>
                        <span>Row counts</span>
                        <strong>{rowCounts || FALLBACK}</strong>
                    </div>
                </div>
            </section>

            <section className="ai-report-section">
                <h2 className="visualization-section-title">Price & volume</h2>
                <ChartPanel title={hasOhlc(prices) ? "Candlestick, volume, MA20/MA50" : "Close, volume, MA20/MA50"} option={buildPriceOption(prices)} hasData={prices.length >= 2} />
            </section>

            <section className="ai-report-section">
                <h2 className="visualization-section-title">Technical indicators</h2>
                <ChartPanel
                    title="Return, volatility, drawdown, RSI"
                    option={buildLineOption(prices, [
                        { name: "Return %", keys: ["return_pct", "change_pct", "pct_change"], color: "#2563eb" },
                        { name: "Volatility 20D", keys: ["volatility_20d", "vol_20d"], color: "#f59e0b" },
                        { name: "Drawdown %", keys: ["drawdown_pct", "drawdown"], color: "#dc2626" },
                        { name: "RSI 14", keys: ["rsi_14", "rsi"], color: "#16a34a" },
                    ])}
                    hasData={prices.some((row) => ["return_pct", "volatility_20d", "drawdown_pct", "rsi_14"].some((key) => toNumber(row[key]) !== undefined))}
                />
            </section>

            <section className="ai-report-section">
                <h2 className="visualization-section-title">Financial periods</h2>
                <div className="ai-report-two-col">
                    <ChartPanel title="Revenue, gross profit, LNST, EPS" option={buildFinancialOption(financials)} hasData={financials.length > 0} />
                    <ChartPanel
                        title="ROE/ROA và debt-to-equity"
                        option={buildLineOption(financials, [
                            { name: "ROE", keys: ["roe"], color: "#2563eb" },
                            { name: "ROA", keys: ["roa"], color: "#16a34a" },
                            { name: "Debt/Equity", keys: ["debt_to_equity", "d_e"], color: "#dc2626" },
                        ])}
                        hasData={financials.some((row) => ["roe", "roa", "debt_to_equity"].some((key) => toNumber(row[key]) !== undefined))}
                    />
                </div>
            </section>

            <section className="ai-report-section">
                <h2 className="visualization-section-title">Scores</h2>
                <ChartPanel
                    title="Valuation, quality, growth, momentum, liquidity, size, risk, confidence"
                    option={buildBarOption(scores.length ? scores : [scoreRow ?? {}], ["symbol", "label", "name"], [
                        { name: "Valuation", keys: ["valuation", "valuation_score"], color: "#2563eb" },
                        { name: "Quality", keys: ["quality", "quality_score"], color: "#0f766e" },
                        { name: "Growth", keys: ["growth", "growth_score"], color: "#16a34a" },
                        { name: "Momentum", keys: ["momentum", "momentum_score"], color: "#f59e0b" },
                        { name: "Liquidity", keys: ["liquidity", "liquidity_score"], color: "#0284c7" },
                        { name: "Size", keys: ["size", "size_score"], color: "#7c3aed" },
                        { name: "Risk", keys: ["risk", "risk_score"], color: "#dc2626" },
                        { name: "Confidence", keys: ["confidence", "data_confidence"], color: "#64748b" },
                    ])}
                    hasData={scores.length > 0}
                />
            </section>

            <section className="ai-report-section">
                <h2 className="visualization-section-title">Peer comparison</h2>
                <ChartPanel
                    title="P/E, P/B, ROE, market cap"
                    option={buildBarOption(peers, ["symbol", "ticker", "code", "name"], [
                        { name: "P/E", keys: ["pe", "p_e", "trailing_pe"], color: "#2563eb" },
                        { name: "P/B", keys: ["pb", "p_b"], color: "#0f766e" },
                        { name: "ROE", keys: ["roe"], color: "#16a34a" },
                        { name: "Market cap", keys: ["market_cap", "marketcap"], color: "#f59e0b" },
                    ])}
                    hasData={peers.length > 0}
                />
            </section>

            <section className="ai-report-section">
                <h2 className="visualization-section-title">Market context</h2>
                <div className="ai-report-two-col">
                    <ChartPanel
                        title="VNINDEX và trading value"
                        option={buildLineOption(marketContext, [
                            { name: "VNINDEX", keys: ["vnindex", "vn_index", "index_close"], color: "#2563eb" },
                            { name: "Trading value", keys: ["trading_value", "market_trading_value"], color: "#16a34a" },
                        ])}
                        hasData={marketContext.length > 0}
                    />
                    <div className="ai-report-card">
                        <h3>Market health</h3>
                        <div className="ai-report-kv-grid">
                            {marketContext.slice(-4).map((row, index) => (
                                <div className="ai-report-kv" key={index}>
                                    <span>{displayText(getValue(row, ["date", "period", "label"]), `Mốc ${index + 1}`)}</span>
                                    <strong>{displayText(getValue(row, ["market_health", "health", "status"]))}</strong>
                                    <small>{formatCompact(toNumber(getValue(row, ["trading_value", "market_trading_value"])))}</small>
                                </div>
                            ))}
                        </div>
                        {!marketContext.length ? <EmptyChart message="Chưa có dữ liệu market context." /> : null}
                    </div>
                </div>
            </section>

            <section className="ai-report-section">
                <h2 className="visualization-section-title">Data quality</h2>
                <div className="ai-report-two-col">
                    <TextList title="Missing fields" items={missingItems} />
                    <TextList title="Warnings" items={warningItems} />
                    <TextList title="Source statuses" items={sourceStatuses} />
                    <TextList title="Derived field notes" items={derivedNotes} />
                </div>
            </section>
        </div>
    )
}
