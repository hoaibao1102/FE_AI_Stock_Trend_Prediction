import { useEffect, useState } from "react"
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { usePortfolioAnalysis } from "@/hooks/usePortfolioAnalysis"
import { formatPrice } from "@/components/holdings/holdings-format"
import type { MergedHoldingItem } from "@/hooks/usePortfolioAnalysis"

type PortfolioAnalysisPopupProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const DECISION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    BUY:   { label: "Mua thêm",   color: "#16a34a", bg: "rgba(22,163,74,0.12)",   border: "rgba(22,163,74,0.35)" },
    HOLD:  { label: "Giữ nguyên", color: "#d97706", bg: "rgba(217,119,6,0.12)",   border: "rgba(217,119,6,0.35)" },
    SELL:  { label: "Bán ra",     color: "#dc2626", bg: "rgba(220,38,38,0.12)",   border: "rgba(220,38,38,0.35)" },
    WATCH: { label: "Theo dõi",   color: "#2563eb", bg: "rgba(37,99,235,0.12)",   border: "rgba(37,99,235,0.35)" },
}

function formatVND(amount?: number): string {
    if (amount == null) return "N/A"
    const abs = Math.abs(amount)
    if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} tỷ`
    if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} triệu`
    return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " đ"
}

function formatTimeId(timeId?: string): string {
    if (!timeId || timeId.length !== 8) return timeId ?? "N/A"
    return `${timeId.slice(6, 8)}/${timeId.slice(4, 6)}/${timeId.slice(0, 4)}`
}

function MiniSparkline({
    prices,
    isProfit,
}: {
    prices?: Array<{ date: string; close: number; open?: number; high?: number; low?: number; volume?: number }>
    isProfit?: boolean
}) {
    if (!prices?.length) return null

    const closes = prices.map(p => p.close).filter(c => c != null && typeof c === "number")
    if (closes.length < 2) return null

    const min = Math.min(...closes)
    const max = Math.max(...closes)
    const range = max - min || 1

    const w = 80
    const h = 30
    const padding = 2

    const points = closes
        .map((c, i) => {
            const x = (i / (closes.length - 1)) * (w - padding * 2) + padding
            const y = h - ((c - min) / range) * (h - padding * 2)
            return `${x},${y}`
        })
        .join(" ")

    return (
        <svg width={w} height={h} className="sparkline" style={{ display: "inline-block" }}>
            <polyline
                points={points}
                fill="none"
                stroke={isProfit ? "#16a34a" : "#dc2626"}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    )
}

function PortfolioSummaryBanner({
    portfolio,
    dataAsOf,
}: {
    portfolio: any
    dataAsOf?: string
}) {
    if (!portfolio) return null

    const isProfit = portfolio.total_unrealized_pnl >= 0

    return (
        <div
            className="rounded-lg border p-4 mb-4"
            style={{
                borderColor: isProfit ? "#16a34a" : "#dc2626",
                backgroundColor: isProfit ? "rgba(22, 163, 74, 0.05)" : "rgba(220, 38, 38, 0.05)",
            }}
        >
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-xs text-slate-400 mb-1">Tổng lãi/lỗ danh mục</div>
                    <div
                        className="text-2xl font-bold"
                        style={{ color: isProfit ? "#16a34a" : "#dc2626" }}
                    >
                        {isProfit ? "+" : ""}
                        {formatVND(portfolio.total_unrealized_pnl)}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                        {isProfit ? "+" : ""}
                        {portfolio.total_unrealized_pnl_pct?.toFixed(2)}%
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="rounded-lg bg-green-500/20 px-3 py-2 text-center">
                        <div className="text-xs text-slate-400">Mã lãi</div>
                        <div className="text-lg font-semibold text-green-400">
                            {portfolio.count_profit}
                        </div>
                    </div>
                    <div className="rounded-lg bg-red-500/20 px-3 py-2 text-center">
                        <div className="text-xs text-slate-400">Mã lỗ</div>
                        <div className="text-lg font-semibold text-red-400">
                            {portfolio.count_loss}
                        </div>
                    </div>
                </div>
            </div>

            {dataAsOf && (
                <div className="text-xs text-slate-500 mt-3 border-t border-slate-700 pt-2">
                    Dữ liệu ngày {formatTimeId(dataAsOf)}
                </div>
            )}
        </div>
    )
}

function HoldingRowSkeleton() {
    return (
        <div className="border-b border-slate-700 py-3 px-4">
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <div className="h-4 w-24 bg-slate-700 rounded animate-pulse mb-2" />
                    <div className="h-3 w-40 bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="h-4 w-20 bg-slate-700 rounded animate-pulse" />
                <div className="h-6 w-16 bg-slate-700 rounded animate-pulse" />
            </div>
        </div>
    )
}

function getCriteriaStyle(title: string) {
    const lower = title.toLowerCase();
    if (lower.includes("vị thế") || lower.includes("giá vốn") || lower.includes("portfolio")) {
        return { icon: "📊", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" };
    }
    if (lower.includes("sức khỏe") || lower.includes("tài chính") || lower.includes("bctc") || lower.includes("financial")) {
        return { icon: "🏢", color: "#34d399", bg: "rgba(52,211,153,0.12)" };
    }
    if (lower.includes("định giá") || lower.includes("đối thủ") || lower.includes("valuation") || lower.includes("peer")) {
        return { icon: "⚖️", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" };
    }
    if (lower.includes("xu hướng") || lower.includes("thị trường") || lower.includes("momentum") || lower.includes("market")) {
        return { icon: "📈", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" };
    }
    if (lower.includes("kế hoạch") || lower.includes("hành động") || lower.includes("action") || lower.includes("mục tiêu")) {
        return { icon: "🎯", color: "#f87171", bg: "rgba(248,113,113,0.12)" };
    }
    return { icon: "📁", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" };
}

function getShortTitle(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes("vị thế") || lower.includes("giá vốn")) return "Vị thế";
    if (lower.includes("sức khỏe") || lower.includes("tài chính")) return "Sức khỏe";
    if (lower.includes("định giá") || lower.includes("đối thủ")) return "Định giá";
    if (lower.includes("xu hướng") || lower.includes("thị trường")) return "Xu hướng";
    if (lower.includes("kế hoạch") || lower.includes("hành động")) return "Kế hoạch";
    return title.split(" ")[0];
}

function HoldingAdviceDetail({ advice }: { advice: NonNullable<MergedHoldingItem["advice"]> }) {
    const skeleton = advice.reasoningSkeleton;
    
    let criteria: Array<{
        title: string;
        verdict: string;
        evidence?: Array<{
            metric_name: string;
            value: any;
            unit?: string | null;
            source?: string;
            sourceUrl?: string | null;
            publishedAt?: string | null;
            note?: string | null;
        }>;
    }> = [];

    if (skeleton) {
        if (Array.isArray(skeleton.criteria) && skeleton.criteria.length > 0) {
            criteria = skeleton.criteria;
        } else {
            const legacyKeys: Array<"portfolio_fit" | "financial_health" | "valuation_peer" | "market_momentum" | "action_plan"> = [
                "portfolio_fit",
                "financial_health",
                "valuation_peer",
                "market_momentum",
                "action_plan",
            ];
            legacyKeys.forEach(key => {
                const text = skeleton[key];
                if (text) {
                    let title = key as string;
                    if (key === "portfolio_fit") title = "Vị thế giá vốn & P&L";
                    if (key === "financial_health") title = "Sức khỏe tài chính";
                    if (key === "valuation_peer") title = "Định giá & Đối thủ";
                    if (key === "market_momentum") title = "Xu hướng dòng tiền";
                    if (key === "action_plan") title = "Kế hoạch hành động";
                    criteria.push({
                        title,
                        verdict: text,
                    });
                }
            });
        }
    }

    const [activeIndex, setActiveIndex] = useState<number>(0);

    if (!advice) return null;

    if (!skeleton || criteria.length === 0) {
        return (
            <div className="mt-3 text-xs text-slate-300 bg-slate-900/50 rounded p-3 border border-slate-800">
                <div className="font-semibold text-slate-400 mb-1">Lý do khuyến nghị:</div>
                <p className="m-0 leading-relaxed">{advice.reasoning || "Không có chi tiết phân tích."}</p>
            </div>
        );
    }

    const safeActiveIndex = activeIndex < criteria.length ? activeIndex : 0;
    const activeCriterion = criteria[safeActiveIndex];
    const activeStyle = getCriteriaStyle(activeCriterion.title);

    return (
        <div className="mt-3 bg-slate-900/40 rounded-lg p-3.5 border border-slate-800 text-left">
            {/* Tab Selectors */}
            <div className="flex gap-2 mb-3 flex-wrap pb-1.5">
                {criteria.map((item, idx) => {
                    const cfg = getCriteriaStyle(item.title);
                    const isActive = safeActiveIndex === idx;
                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveIndex(idx)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all"
                            style={{
                                borderColor: isActive ? cfg.color : "rgba(148, 163, 184, 0.15)",
                                backgroundColor: isActive ? cfg.bg : "rgba(30, 41, 59, 0.3)",
                                color: isActive ? cfg.color : "#94a3b8",
                            }}
                        >
                            <span>{cfg.icon}</span>
                            <span>{getShortTitle(item.title)}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div
                className="p-3 bg-slate-950/40 rounded-md border-y border-r"
                style={{
                    borderLeft: `4px solid ${activeStyle.color}`,
                    borderColor: "rgba(148, 163, 184, 0.08)",
                    borderLeftColor: activeStyle.color,
                }}
            >
                <div 
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold mb-2 border"
                    style={{
                        backgroundColor: activeStyle.bg,
                        color: activeStyle.color,
                        borderColor: `${activeStyle.color}22`
                    }}
                >
                    <span>{activeStyle.icon}</span>
                    <span>{activeCriterion.title}</span>
                </div>
                
                <p className="text-xs leading-relaxed text-slate-200 m-0">
                    {activeCriterion.verdict}
                </p>

                {/* Evidence */}
                {activeCriterion.evidence && activeCriterion.evidence.length > 0 && (
                    <div className="mt-3 border-t border-slate-800/80 pt-2.5">
                        <div className="text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                            📊 Chỉ số hỗ trợ:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeCriterion.evidence.map((ev, idx) => {
                                let displayValue = String(ev.value);
                                if (typeof ev.value === "number") {
                                    if (ev.unit === "VND" || ev.metric_name.toLowerCase().includes("giá") || ev.metric_name.toLowerCase().includes("vốn")) {
                                        displayValue = formatVND(ev.value);
                                    } else {
                                        displayValue = ev.value.toLocaleString("vi-VN");
                                    }
                                }
                                if (ev.unit && !displayValue.includes(ev.unit)) {
                                    displayValue += ` ${ev.unit}`;
                                }

                                return (
                                    <div 
                                        key={idx}
                                        className="bg-slate-950/20 rounded border border-slate-800/40 p-2 flex flex-col justify-between gap-1"
                                    >
                                        <div className="text-[10px] text-slate-400">{ev.metric_name}</div>
                                        <div className="text-xs font-bold text-sky-400">{displayValue}</div>
                                        {(ev.note || ev.source) && (
                                            <div className="text-[9px] text-slate-500 flex justify-between items-center gap-2 mt-1">
                                                <span>{ev.note || ""}</span>
                                                {ev.sourceUrl ? (
                                                    <a 
                                                        href={ev.sourceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 underline hover:text-blue-300"
                                                    >
                                                        {ev.source || "Nguồn"}
                                                    </a>
                                                ) : (
                                                    <span>{ev.source || ""}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function HoldingRow({ item, aiLoading }: { item: MergedHoldingItem; aiLoading: boolean }) {
    const [expanded, setExpanded] = useState(false)
    const isProfit = item.status === "PROFIT"
    const advice = item.advice
    const decision = advice?.decision
    const cfg = DECISION_CONFIG[decision ?? ""] ?? null

    return (
        <div 
            className="border-b border-slate-800 py-3.5 px-4 hover:bg-slate-800/20 transition-colors"
            style={{ cursor: advice ? "pointer" : "default" }}
            onClick={() => {
                if (advice) setExpanded(!expanded)
            }}
        >
            <div className="flex items-start justify-between gap-4">
                {/* Left: Stock info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    {advice ? (
                        expanded ? (
                            <ChevronUp className="size-4 text-slate-500 flex-shrink-0" />
                        ) : (
                            <ChevronDown className="size-4 text-slate-500 flex-shrink-0" />
                        )
                    ) : (
                        <div className="size-4 flex-shrink-0" />
                    )}
                    <div>
                        <div className="font-bold text-blue-400 text-sm flex items-center gap-2">
                            {item.symbol}
                            {item.quantity != null && (
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                    {item.quantity.toLocaleString("vi-VN")} CP
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.company_name || "-"}</div>
                        <div className="text-xs text-slate-500 mt-1">
                            Vốn: {formatPrice(item.average_cost)} · Tổng: {formatVND(item.cost)}
                        </div>
                    </div>
                </div>

                {/* Middle: P&L info */}
                <div className="text-right">
                    <div
                        className="text-sm font-semibold"
                        style={{
                            color: isProfit ? "#16a34a" : "#dc2626",
                        }}
                    >
                        {isProfit ? "+" : ""}
                        {formatVND(item.unrealized_pnl)}
                    </div>
                    <div
                        className="text-xs font-semibold mt-0.5"
                        style={{
                            color: isProfit ? "#16a34a" : "#dc2626",
                        }}
                    >
                        {isProfit ? "+" : ""}
                        {item.unrealized_pnl_pct?.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        Hiện: {formatPrice(item.close_price)}
                    </div>
                </div>

                {/* Sparkline */}
                <div className="hidden sm:block">
                    <MiniSparkline prices={item.prices_7d} isProfit={isProfit} />
                </div>

                {/* Right: AI Decision */}
                <div className="text-right">
                    {aiLoading && !advice ? (
                        <div className="inline-block">
                            <Loader2 className="size-4 animate-spin text-blue-400" />
                        </div>
                    ) : cfg ? (
                        <div>
                            <div
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block border"
                                style={{
                                    color: cfg.color,
                                    backgroundColor: cfg.bg,
                                    borderColor: cfg.border,
                                }}
                            >
                                {cfg.label}
                            </div>
                            {advice?.pnl_signal && (
                                <div className="text-[10px] text-slate-400 mt-1">{advice.pnl_signal}</div>
                            )}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400">--</div>
                    )}
                </div>
            </div>

            {/* Expandable Reasoning Details */}
            {expanded && advice && (
                <div onClick={e => e.stopPropagation()}>
                    <HoldingAdviceDetail advice={advice} />
                </div>
            )}
        </div>
    )
}

export default function PortfolioAnalysisPopup({
    open,
    onOpenChange,
}: PortfolioAnalysisPopupProps) {
    const { portfolio, items, pnlLoading, aiLoading, pnlError, aiError, dataAsOf, load } =
        usePortfolioAnalysis()

    useEffect(() => {
        if (open) {
            void load()
        }
    }, [open, load])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] border-slate-700 bg-[#111827] text-white overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle>📊 Danh mục đầu tư</DialogTitle>
                            <DialogDescription>
                                Phân tích P&L và khuyến nghị AI cho danh mục của bạn
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void load({ forceRefresh: true })}
                                disabled={aiLoading}
                            >
                                <RefreshCw className={`mr-1.5 size-4 ${aiLoading ? "animate-spin" : ""}`} />
                                Làm mới AI
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {/* Tier 1: P&L Loading */}
                    {pnlLoading ? (
                        <div className="space-y-3 p-4">
                            <div className="h-24 bg-slate-800 rounded-lg animate-pulse" />
                            {[1, 2, 3].map(i => (
                                <HoldingRowSkeleton key={i} />
                            ))}
                        </div>
                    ) : pnlError ? (
                        <div className="p-4">
                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                                {pnlError}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => void load()}
                                >
                                    Thử lại
                                </Button>
                            </div>
                        </div>
                    ) : portfolio ? (
                        <div className="p-4 space-y-4">
                            {/* Summary Banner */}
                            <PortfolioSummaryBanner portfolio={portfolio} dataAsOf={dataAsOf} />

                            {/* AI Loading Indicator */}
                            {aiLoading && (
                                <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-blue-200 text-sm">
                                    <Loader2 className="size-4 animate-spin" />
                                    Đang phân tích AI… ({items.length} mã)
                                </div>
                            )}

                            {/* AI Error */}
                            {aiError && (
                                <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-200 text-sm">
                                    ⚠️ {aiError}
                                </div>
                            )}

                            {/* Holdings List */}
                            {items.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    Chưa có cổ phiếu nào trong danh mục.
                                </div>
                            ) : (
                                <div className="border border-slate-700 rounded-lg overflow-hidden">
                                    <div className="bg-slate-900/50 border-b border-slate-700 px-4 py-2 grid grid-cols-12 gap-4 text-xs font-semibold text-slate-400">
                                        <div className="col-span-2">Mã</div>
                                        <div className="col-span-3">Thông tin</div>
                                        <div className="col-span-2 text-right">P&L</div>
                                        <div className="col-span-2">Biểu đồ</div>
                                        <div className="col-span-3 text-right">Đề xuất</div>
                                    </div>

                                    {items.map(item => (
                                        <HoldingRow
                                            key={item.symbol}
                                            item={item}
                                            aiLoading={aiLoading}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-slate-400">
                            Không có dữ liệu danh mục.
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-700 p-4 bg-slate-900/50">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Đóng
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
