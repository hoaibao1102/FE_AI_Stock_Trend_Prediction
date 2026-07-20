import { useEffect, useState } from "react"
import { Loader2, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ChevronRight } from "lucide-react"

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
import type { PortfolioData } from "@/services/holdings-pnl.service"

// ─── Types ───────────────────────────────────────────────────────────────────

type WatchlistAnalysisModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DECISION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    BUY:   { label: "Mua thêm",     color: "#16a34a", bg: "rgba(22,163,74,0.12)",   border: "rgba(22,163,74,0.35)" },
    HOLD:  { label: "Giữ nguyên",   color: "#d97706", bg: "rgba(217,119,6,0.12)",   border: "rgba(217,119,6,0.35)" },
    SELL:  { label: "Giảm vị thế",  color: "#dc2626", bg: "rgba(220,38,38,0.12)",   border: "rgba(220,38,38,0.35)" },
    WATCH: { label: "Theo dõi chặt", color: "#2563eb", bg: "rgba(37,99,235,0.12)",   border: "rgba(37,99,235,0.35)" },
}

const PNL_SIGNAL_LABEL: Record<string, string> = {
    STRONG_PROFIT_HOLD: "Lãi ≥15% — Cân nhắc chốt từng phần",
    PROFIT_HOLD:        "Lãi 5–15% — Tiếp tục giữ",
    NEUTRAL:            "±5% — Giữ nguyên",
    LOSS_WATCH:         "Lỗ 5–15% — Theo dõi chặt",
    LOSS_REVIEW:        "Lỗ ≥15% — Xem xét giảm vị thế",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVND(amount?: number): string {
    if (amount == null) return "N/A"
    const abs = Math.abs(amount)
    if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} tỷ`
    if (abs >= 1_000_000)     return `${(amount / 1_000_000).toFixed(1)} triệu`
    return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " đ"
}

function formatTimeId(timeId?: string): string {
    if (!timeId || timeId.length !== 8) return timeId ?? "N/A"
    return `${timeId.slice(6, 8)}/${timeId.slice(4, 6)}/${timeId.slice(0, 4)}`
}

function getConcentrationWarning(items: MergedHoldingItem[]): string | null {
    if (items.length < 2) return null

    const sorted = [...items].sort(
        (a, b) => (b.allocation_pct ?? 0) - (a.allocation_pct ?? 0),
    )
    const top = sorted[0]
    const topAlloc = top?.allocation_pct ?? 0
    const top3Alloc = sorted
        .slice(0, 3)
        .reduce((sum, item) => sum + (item.allocation_pct ?? 0), 0)

    if (topAlloc >= 40) {
        return `${top.symbol} chiếm ${topAlloc.toFixed(1)}% danh mục — mức tập trung cao, cân nhắc tái cân bằng.`
    }
    if (top3Alloc >= 70 && items.length >= 3) {
        return `Top 3 mã chiếm ${top3Alloc.toFixed(1)}% danh mục — đa dạng hóa còn hạn chế.`
    }
    if (topAlloc >= 25) {
        return `${top.symbol} chiếm ${topAlloc.toFixed(1)}% — theo dõi tỷ trọng khi AI khuyến nghị mua thêm.`
    }
    return null
}

// ─── MiniSparkline ────────────────────────────────────────────────────────────

function MiniSparkline({
    prices,
    isProfit,
}: {
    prices?: Array<{ date: string; close: number }>
    isProfit?: boolean
}) {
    if (!prices?.length) return <div style={{ width: 80, height: 30 }} />

    const closes = prices
        .map(p => {
            const value = p.close
            if (typeof value === "number" && Number.isFinite(value)) return value
            const parsed = Number(value)
            return Number.isFinite(parsed) ? parsed : null
        })
        .filter((c): c is number => c != null)
    if (closes.length < 2) return <div style={{ width: 80, height: 30 }} />

    const min = Math.min(...closes)
    const max = Math.max(...closes)
    const range = max - min || 1
    const w = 80, h = 30, pad = 3

    const pts = closes
        .map((c, i) => {
            const x = (i / (closes.length - 1)) * (w - pad * 2) + pad
            const y = h - pad - ((c - min) / range) * (h - pad * 2)
            return `${x},${y}`
        })
        .join(" ")

    const color = isProfit ? "#16a34a" : "#dc2626"

    return (
        <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
            <defs>
                <linearGradient id={`sg-${isProfit ? "p" : "l"}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    )
}

// ─── Skeleton Components ──────────────────────────────────────────────────────

function SkeletonBanner() {
    return (
        <div
            style={{
                borderRadius: 12,
                border: "1px solid rgba(100,116,139,0.25)",
                background: "rgba(30,41,59,0.5)",
                padding: "16px 20px",
                marginBottom: 16,
                height: 96,
            }}
            className="animate-pulse"
        />
    )
}

function SkeletonRow() {
    return (
        <div
            style={{
                borderBottom: "1px solid rgba(100,116,139,0.15)",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
            }}
        >
            <div style={{ flex: 1 }}>
                <div className="animate-pulse" style={{ height: 14, width: 64, background: "rgba(100,116,139,0.3)", borderRadius: 6, marginBottom: 6 }} />
                <div className="animate-pulse" style={{ height: 11, width: 120, background: "rgba(100,116,139,0.2)", borderRadius: 6 }} />
            </div>
            <div className="animate-pulse" style={{ height: 14, width: 72, background: "rgba(100,116,139,0.3)", borderRadius: 6 }} />
            <div className="animate-pulse" style={{ height: 30, width: 80, background: "rgba(100,116,139,0.2)", borderRadius: 4 }} />
            <div className="animate-pulse" style={{ height: 24, width: 60, background: "rgba(100,116,139,0.3)", borderRadius: 20 }} />
        </div>
    )
}

// ─── Portfolio Summary Banner ─────────────────────────────────────────────────

function PortfolioSummaryBanner({
    portfolio,
    dataAsOf,
}: {
    portfolio: PortfolioData
    dataAsOf?: string
}) {
    const isProfit = portfolio.total_unrealized_pnl >= 0
    const accentColor = isProfit ? "#16a34a" : "#dc2626"

    return (
        <div
            style={{
                borderRadius: 12,
                border: `1px solid ${isProfit ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`,
                background: isProfit ? "rgba(22,163,74,0.07)" : "rgba(220,38,38,0.07)",
                padding: "16px 20px",
                marginBottom: 4,
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                {/* Left: Total P&L */}
                <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        Tổng lãi / lỗ danh mục
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: accentColor, lineHeight: 1.2 }}>
                        {isProfit ? "+" : ""}
                        {formatVND(portfolio.total_unrealized_pnl)}
                    </div>
                    <div style={{ fontSize: 13, color: accentColor, marginTop: 2, fontWeight: 600 }}>
                        {isProfit ? "+" : ""}
                        {portfolio.total_unrealized_pnl_pct?.toFixed(2)}%
                    </div>
                </div>

                {/* Right: Profit/Loss count badges */}
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                        style={{
                            borderRadius: 10,
                            background: "rgba(59,130,246,0.12)",
                            border: "1px solid rgba(59,130,246,0.3)",
                            padding: "8px 14px",
                            textAlign: "center",
                            minWidth: 56,
                        }}
                    >
                        <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>Vị thế</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#93c5fd", lineHeight: 1 }}>
                            {portfolio.position_count ?? (portfolio.count_profit + portfolio.count_loss + (portfolio.count_neutral ?? 0))}
                        </div>
                    </div>
                    <div
                        style={{
                            borderRadius: 10,
                            background: "rgba(22,163,74,0.15)",
                            border: "1px solid rgba(22,163,74,0.3)",
                            padding: "8px 14px",
                            textAlign: "center",
                            minWidth: 56,
                        }}
                    >
                        <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>Mã lãi</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80", lineHeight: 1 }}>
                            {portfolio.count_profit}
                        </div>
                    </div>
                    <div
                        style={{
                            borderRadius: 10,
                            background: "rgba(220,38,38,0.15)",
                            border: "1px solid rgba(220,38,38,0.3)",
                            padding: "8px 14px",
                            textAlign: "center",
                            minWidth: 56,
                        }}
                    >
                        <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>Mã lỗ</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#f87171", lineHeight: 1 }}>
                            {portfolio.count_loss}
                        </div>
                    </div>
                </div>
            </div>

            {/* Market value info */}
            <div style={{ display: "flex", gap: 24, marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(100,116,139,0.2)" }}>
                <div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Vốn đầu tư: </span>
                    <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                        {formatVND(portfolio.total_cost)}
                    </span>
                </div>
                <div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Giá trị hiện tại: </span>
                    <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                        {formatVND(portfolio.total_market_value)}
                    </span>
                </div>
                {dataAsOf && (
                    <div style={{ marginLeft: "auto" }}>
                        <span style={{ fontSize: 11, color: "#475569" }}>Giá ngày {formatTimeId(dataAsOf)}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

function ConcentrationWarning({ items }: { items: MergedHoldingItem[] }) {
    const warning = getConcentrationWarning(items)
    if (!warning) return null

    return (
        <div
            style={{
                marginTop: 10,
                marginBottom: 4,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(234,179,8,0.35)",
                background: "rgba(234,179,8,0.08)",
                color: "#fbbf24",
                fontSize: 12,
                lineHeight: 1.5,
            }}
        >
            ⚠️ <strong>Tập trung danh mục:</strong> {warning}
        </div>
    )
}

// ─── Holding Row ─────────────────────────────────────────────────────────────

type HoldingAdviceDetailProps = {
    advice: NonNullable<MergedHoldingItem["advice"]>
}

const CRITERIA_CONFIG = {
    portfolio_fit: {
        title: "Vị thế giá vốn & P&L",
        icon: "📊",
        color: "#60a5fa",
        bg: "rgba(96,165,250,0.12)",
    },
    financial_health: {
        title: "Sức khỏe tài chính (BCTC)",
        icon: "🏢",
        color: "#34d399",
        bg: "rgba(52,211,153,0.12)",
    },
    valuation_peer: {
        title: "Định giá & Đối thủ cùng ngành",
        icon: "⚖️",
        color: "#a78bfa",
        bg: "rgba(167,139,250,0.12)",
    },
    market_momentum: {
        title: "Xu hướng dòng tiền & Thị trường",
        icon: "📈",
        color: "#fbbf24",
        bg: "rgba(251,191,36,0.12)",
    },
    action_plan: {
        title: "Kế hoạch hành động & Giá mục tiêu",
        icon: "🎯",
        color: "#f87171",
        bg: "rgba(248,113,113,0.12)",
    },
} as const

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

function HoldingAdviceDetail({ advice }: HoldingAdviceDetailProps) {
    const skeleton = advice.reasoningSkeleton;
    
    // Construct criteria array dynamically
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
            // Fallback for legacy format
            const legacyKeys: Array<keyof typeof CRITERIA_CONFIG> = [
                "portfolio_fit",
                "financial_health",
                "valuation_peer",
                "market_momentum",
                "action_plan",
            ];
            legacyKeys.forEach(key => {
                const text = skeleton[key];
                if (text) {
                    criteria.push({
                        title: CRITERIA_CONFIG[key]?.title || key,
                        verdict: text,
                    });
                }
            });
        }
    }

    const [activeIndex, setActiveIndex] = useState<number>(0);

    if (!advice) return null;

    // If it's legacy advice without reasoningSkeleton or criteria, show fallback reasoning text
    if (!skeleton || criteria.length === 0) {
        return (
            <div
                style={{
                    background: "rgba(15,23,42,0.5)",
                    padding: "12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    color: "#cbd5e1",
                    border: "1px solid rgba(100,116,139,0.15)",
                }}
            >
                <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                    Lý do khuyến nghị:
                </div>
                <p style={{ margin: 0 }}>{advice.reasoning || "Không có chi tiết phân tích."}</p>
            </div>
        );
    }

    // Ensure activeIndex is valid
    const safeActiveIndex = activeIndex < criteria.length ? activeIndex : 0;
    const activeCriterion = criteria[safeActiveIndex];
    const activeStyle = getCriteriaStyle(activeCriterion.title);

    return (
        <div 
            style={{ 
                marginTop: 12,
                background: "rgba(30,41,59,0.25)",
                borderRadius: 10,
                padding: 14,
                border: "1px solid rgba(100,116,139,0.15)"
            }}
        >
            {/* Tab Selectors */}
            <div 
                style={{ 
                    display: "flex", 
                    gap: 8, 
                    marginBottom: 12, 
                    flexWrap: "wrap",
                    paddingBottom: 4 
                }}
            >
                {criteria.map((item, idx) => {
                    const cfg = getCriteriaStyle(item.title);
                    const isActive = safeActiveIndex === idx;
                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveIndex(idx)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 12px",
                                borderRadius: 20,
                                border: `1px solid ${isActive ? cfg.color : "rgba(100,116,139,0.2)"}`,
                                background: isActive ? cfg.bg : "rgba(30,41,59,0.4)",
                                fontSize: 11,
                                fontWeight: 600,
                                color: isActive ? cfg.color : "#94a3b8",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "all 0.2s ease-in-out",
                            }}
                        >
                            <span>{cfg.icon}</span>
                            <span>{getShortTitle(item.title)}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content Card */}
            <div
                style={{
                    padding: 14,
                    background: "rgba(15,23,42,0.4)",
                    borderRadius: 8,
                    borderLeft: `4px solid ${activeStyle.color}`,
                    borderTop: "1px solid rgba(100,116,139,0.1)",
                    borderRight: "1px solid rgba(100,116,139,0.1)",
                    borderBottom: "1px solid rgba(100,116,139,0.1)",
                }}
            >
                <div 
                    style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: 6, 
                        padding: "3px 8px", 
                        borderRadius: 6, 
                        fontSize: 10, 
                        fontWeight: 700,
                        marginBottom: 8,
                        background: activeStyle.bg,
                        color: activeStyle.color,
                        border: `1px solid ${activeStyle.color}33`
                    }}
                >
                    <span>{activeStyle.icon}</span>
                    <span>{activeCriterion.title}</span>
                </div>
                
                <p 
                    style={{ 
                        fontSize: 12.5, 
                        lineHeight: 1.6, 
                        color: "#e2e8f0", 
                        margin: 0 
                    }}
                >
                    {activeCriterion.verdict}
                </p>

                {/* Evidence Details */}
                {activeCriterion.evidence && activeCriterion.evidence.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: "1px solid rgba(100,116,139,0.15)", paddingTop: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8, letterSpacing: "0.02em" }}>
                            📊 Chỉ số & Bằng chứng hỗ trợ:
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                            {activeCriterion.evidence.map((ev, idx) => {
                                // Format value appropriately
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

                                const content = (
                                    <>
                                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                            {ev.metric_name}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>
                                            {displayValue}
                                        </div>
                                        {(ev.note || ev.source) && (
                                            <div style={{ fontSize: 10, color: "#64748b", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, marginTop: 2 }}>
                                                <span>{ev.note || ""}</span>
                                                {ev.sourceUrl ? (
                                                    <span style={{ color: "#60a5fa", textDecoration: "underline" }}>
                                                        {ev.source || "Nguồn"}
                                                    </span>
                                                ) : (
                                                    <span>{ev.source || ""}</span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                );

                                const styleBase: React.CSSProperties = {
                                    borderRadius: 6,
                                    padding: "8px 12px",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    gap: 4,
                                    transition: "all 0.2s ease",
                                };

                                return ev.sourceUrl ? (
                                    <a
                                        key={idx}
                                        href={ev.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            ...styleBase,
                                            background: "rgba(30, 41, 59, 0.35)",
                                            border: "1px solid rgba(100, 116, 139, 0.2)",
                                            cursor: "pointer",
                                            textDecoration: "none",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "rgba(59, 130, 246, 0.08)";
                                            e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.35)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "rgba(30, 41, 59, 0.35)";
                                            e.currentTarget.style.borderColor = "rgba(100, 116, 139, 0.2)";
                                        }}
                                    >
                                        {content}
                                    </a>
                                ) : (
                                    <div
                                        key={idx}
                                        style={{
                                            ...styleBase,
                                            background: "rgba(30, 41, 59, 0.3)",
                                            border: "1px solid rgba(100, 116, 139, 0.1)",
                                        }}
                                    >
                                        {content}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Metadata source & updated time */}
            <div 
                style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    marginTop: 10, 
                    fontSize: 10, 
                    color: "#475569" 
                }}
            >
                <span>
                    Nguồn: {advice.source === "cache" ? "⚡ Bộ nhớ đệm hôm nay" : "✨ Phân tích AI mới"}
                </span>
                {advice.analysed_at && (
                    <span>
                        Cập nhật: {new Date(advice.analysed_at).toLocaleTimeString("vi-VN")}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Holding Row ─────────────────────────────────────────────────────────────

function HoldingRow({ item }: { item: MergedHoldingItem }) {
    const [expanded, setExpanded] = useState(false)
    const isProfit = item.unrealized_pnl != null
        ? item.unrealized_pnl >= 0
        : item.status === "PROFIT"
    const advice   = item.advice
    const decision = advice?.decision
    const cfg      = DECISION_CONFIG[decision ?? ""] ?? null
    const pnlColor = item.unrealized_pnl == null
        ? "#94a3b8"
        : isProfit ? "#4ade80" : "#f87171"
    const rowLoading = item.adviceLoading === true

    return (
        <div
            style={{
                borderBottom: "1px solid rgba(100,116,139,0.15)",
                padding: "14px 20px",
                transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(30,41,59,0.3)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
            {/* Main row */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
                    gap: "16px",
                    alignItems: "center",
                    cursor: advice ? "pointer" : "default",
                }}
                onClick={() => {
                    if (advice) {
                        setExpanded(!expanded)
                    }
                }}
            >
                {/* Stock info */}
                <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 8 }}>
                    {advice ? (
                        expanded ? (
                            <ChevronUp size={16} color="#64748b" style={{ flexShrink: 0 }} />
                        ) : (
                            <ChevronDown size={16} color="#64748b" style={{ flexShrink: 0 }} />
                        )
                    ) : (
                        <div style={{ width: 16, height: 16, flexShrink: 0 }} />
                    )}
                    <div>
                        <div style={{ fontWeight: 700, color: "#60a5fa", fontSize: 15, letterSpacing: "0.02em" }}>
                            {item.symbol}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.company_name || item.market || "–"}
                        </div>
                    </div>
                </div>

                {/* Allocation */}
                <div style={{ gridColumn: "span 2", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                        {item.allocation_pct != null ? `${item.allocation_pct.toFixed(1)}%` : "–"}
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                        tỷ trọng
                    </div>
                </div>

                {/* P&L */}
                <div style={{ gridColumn: "span 3", textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: pnlColor }}>
                        {item.unrealized_pnl != null
                            ? `${item.unrealized_pnl >= 0 ? "+" : ""}${formatVND(item.unrealized_pnl)}`
                            : "—"}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: pnlColor, marginTop: 1 }}>
                        {item.unrealized_pnl_pct != null
                            ? `${item.unrealized_pnl_pct >= 0 ? "+" : ""}${item.unrealized_pnl_pct.toFixed(2)}%`
                            : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                        {item.quantity != null ? `${item.quantity.toLocaleString("vi-VN")} CP · ` : ""}{formatPrice(item.average_cost)} → {item.close_price != null ? formatPrice(item.close_price) : "Chưa có giá"}
                    </div>
                </div>

                {/* Sparkline */}
                <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "center" }}>
                    {item.prices_7d && item.prices_7d.length > 0 ? (
                        <MiniSparkline prices={item.prices_7d} isProfit={isProfit} />
                    ) : (
                        <div
                            style={{ width: 80, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                            {isProfit
                                ? <TrendingUp size={18} color="#4ade80" />
                                : <TrendingDown size={18} color="#f87171" />
                            }
                        </div>
                    )}
                </div>

                {/* AI Decision badge */}
                <div style={{ gridColumn: "span 3", textAlign: "right" }}>
                    {rowLoading && !advice ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                            <Loader2 size={14} color="#60a5fa" style={{ animation: "spin 1s linear infinite" }} />
                            <span style={{ fontSize: 11, color: "#60a5fa" }}>AI...</span>
                        </div>
                    ) : cfg ? (
                        <div>
                            <div
                                style={{
                                    display: "inline-block",
                                    padding: "3px 10px",
                                    borderRadius: 20,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: cfg.color,
                                    background: cfg.bg,
                                    border: `1px solid ${cfg.border}`,
                                    letterSpacing: "0.04em",
                                    textTransform: "uppercase",
                                }}
                            >
                                {cfg.label}
                            </div>

                            {/* pnl_signal */}
                            {advice?.pnl_signal && (
                                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>
                                    {PNL_SIGNAL_LABEL[advice.pnl_signal] ?? advice.pnl_signal}
                                </div>
                            )}

                            {/* source hint */}
                            {advice?.source === "cache" && (
                                <div style={{ fontSize: 10, color: "#22c55e", marginTop: 2 }}>⚡ Phân tích hôm nay</div>
                            )}
                            {advice?.source === "fallback" && (
                                <div style={{ fontSize: 10, color: "#eab308", marginTop: 2 }}>⚠️ Dự báo cơ bản</div>
                            )}

                            {/* score */}
                            {advice?.total_score != null && (
                                <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                                    Điểm: {advice.total_score.toFixed(0)}/100
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: "#475569" }}>–</div>
                    )}
                </div>
            </div>

            {/* Collapsible analysis details */}
            {expanded && advice && (
                <div onClick={e => e.stopPropagation()}>
                    <HoldingAdviceDetail advice={advice} />
                </div>
            )}

            {/* Loading state when expanded and advice is being fetched */}
            {expanded && rowLoading && !advice && (
                <div
                    style={{
                        marginTop: 10,
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "rgba(15,23,42,0.4)",
                        border: "1px solid rgba(100,116,139,0.15)",
                        fontSize: 12,
                        color: "#60a5fa",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                    <span>Đang nạp phân tích AI...</span>
                </div>
            )}
        </div>
    )
}

// ─── List Header ──────────────────────────────────────────────────────────────

function ListHeader() {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
                gap: "16px",
                padding: "8px 20px",
                background: "rgba(15,23,42,0.6)",
                borderBottom: "1px solid rgba(100,116,139,0.2)",
            }}
        >
            <div style={{ gridColumn: "span 2", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Mã / Công ty</div>
            <div style={{ gridColumn: "span 2", fontSize: 11, fontWeight: 600, color: "#475569", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tỷ trọng</div>
            <div style={{ gridColumn: "span 3", fontSize: 11, fontWeight: 600, color: "#475569", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.06em" }}>Hiệu suất P&L</div>
            <div style={{ gridColumn: "span 2", fontSize: 11, fontWeight: 600, color: "#475569", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>Biểu đồ 7d</div>
            <div style={{ gridColumn: "span 3", fontSize: 11, fontWeight: 600, color: "#475569", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.06em" }}>Khuyến nghị vị thế</div>
        </div>
    )
}

// ─── Loading Flow ────────────────────────────────────────────────────────────

function WatchlistAnalysisLoadingFlow({
    pnlLoading,
    aiLoading,
    itemsCount,
}: {
    pnlLoading: boolean
    aiLoading: boolean
    itemsCount: number
}) {
    let currentStep = 0
    if (!pnlLoading) {
        if (aiLoading) {
            currentStep = 2 // Phân tích sâu
        } else {
            currentStep = 4 // Hoàn tất
        }
    } else {
        currentStep = 1 // Lấy giá 7 ngày gần nhất
    }

    const steps = [
        "Lấy danh sách",
        "Lấy giá 7 ngày",
        `Phân tích AI (${itemsCount || "các"} mã)`,
        "Tổng hợp kết quả",
    ]

    return (
        <div
            style={{
                borderRadius: 12,
                border: "1px solid rgba(51, 65, 85, 0.4)",
                background: "rgba(15, 23, 42, 0.6)",
                padding: "24px 32px",
                marginBottom: 20,
                position: "relative",
            }}
        >
            <style>{`
                @keyframes activeStepPulse {
                    0%, 100% {
                        box-shadow: 0 0 4px rgba(59, 130, 246, 0.4);
                        border-color: rgba(59, 130, 246, 0.5);
                        background-color: #0f172a;
                    }
                    50% {
                        box-shadow: 0 0 16px rgba(59, 130, 246, 0.95);
                        border-color: rgba(59, 130, 246, 0.95);
                        background-color: #16223f;
                    }
                }
            `}</style>

            {/* Header Status */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14 }}>
                        <div 
                            style={{ 
                                position: "absolute", 
                                width: 14, 
                                height: 14, 
                                borderRadius: "50%", 
                                border: "2px solid #3b82f6", 
                                animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite" 
                            }} 
                        />
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6" }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        Hệ thống đang xử lý phân tích danh mục...
                    </span>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
                    Thời gian dự kiến: 30 - 120 giây
                </div>
            </div>

            {/* Stepper Timeline */}
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px" }}>
                {/* Connecting Track Line */}
                <div 
                    style={{ 
                        position: "absolute", 
                        left: "6%", 
                        right: "6%", 
                        top: "15px", 
                        height: 2, 
                        background: "rgba(71, 85, 105, 0.25)", 
                        zIndex: 1 
                    }} 
                />
                
                {/* Active/Completed glowing line */}
                <div 
                    style={{ 
                        position: "absolute", 
                        left: "6%", 
                        width: `${Math.min(88, (currentStep / 3) * 88)}%`, 
                        top: "15px", 
                        height: 2, 
                        background: "linear-gradient(90deg, #10b981, #3b82f6)", 
                        boxShadow: "0 0 8px rgba(59, 130, 246, 0.5)",
                        transition: "width 0.4s ease-in-out",
                        zIndex: 2 
                    }} 
                />

                {steps.map((label, idx) => {
                    const isActive = idx === currentStep
                    const isCompleted = idx < currentStep
                    
                    let nodeColor = "#475569"
                    let glow = "none"
                    let textColor = "#475569"
                    let fontWeight = 500

                    if (isActive) {
                        nodeColor = "#3b82f6"
                        glow = "0 0 10px rgba(59, 130, 246, 0.8)"
                        textColor = "#3b82f6"
                        fontWeight = 700
                    } else if (isCompleted) {
                        nodeColor = "#10b981"
                        glow = "0 0 6px rgba(16, 185, 129, 0.4)"
                        textColor = "#cbd5e1"
                    }

                    return (
                        <div 
                            key={idx} 
                            style={{ 
                                display: "flex", 
                                flexDirection: "column", 
                                alignItems: "center", 
                                width: "22%",
                                zIndex: 3, 
                                textAlign: "center" 
                            }}
                        >
                            {/* Circle Node */}
                            <div 
                                style={{ 
                                    width: 32, 
                                    height: 32, 
                                    borderRadius: "50%", 
                                    background: "#0f172a", 
                                    border: `2px solid ${nodeColor}`,
                                    boxShadow: glow,
                                    display: "flex", 
                                    alignItems: "center", 
                                    justifyContent: "center", 
                                    fontSize: 12, 
                                    fontWeight: 700, 
                                    color: isActive ? "#3b82f6" : isCompleted ? "#10b981" : "#475569",
                                    marginBottom: 10,
                                    animation: isActive ? "activeStepPulse 1.8s infinite ease-in-out" : undefined,
                                    transition: "all 0.3s ease",
                                }}
                            >
                                {isCompleted ? "✓" : idx + 1}
                            </div>
                            
                            {/* Step Label */}
                            <div 
                                style={{ 
                                    fontSize: 12.5, 
                                    fontWeight: fontWeight, 
                                    color: textColor, 
                                    transition: "color 0.3s ease" 
                                }}
                            >
                                {label}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function WatchlistAnalysisModal({
    open,
    onOpenChange,
}: WatchlistAnalysisModalProps) {
    const {
        portfolio,
        items,
        pnlLoading,
        aiLoading,
        pnlError,
        aiError,
        dataAsOf,
        cachedCount,
        generatedCount,
        load,
    } = usePortfolioAnalysis()

    // Auto-load on open
    useEffect(() => {
        if (open) {
            void load()
        }
    }, [open, load])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="border-slate-700 text-white"
                style={{
                    maxWidth: 880,
                    maxHeight: "86vh",
                    background: "#0f172a",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    padding: 0,
                }}
            >
                {/* ── Header ─────────────────────────────────────────── */}
                <DialogHeader style={{ padding: "20px 24px 0", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div>
                            <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>
                                📊 Phân tích danh mục đầu tư
                            </DialogTitle>
                            <DialogDescription style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                                P&L thực tế + khuyến nghị quản lý vị thế cho {items.length} mã đang nắm giữ
                            </DialogDescription>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void load({ forceRefresh: true })}
                            disabled={aiLoading || pnlLoading}
                            style={{ flexShrink: 0, marginTop: 2, marginRight: 28 }}
                        >
                            <RefreshCw
                                size={14}
                                style={{
                                    marginRight: 6,
                                    animation: aiLoading ? "spin 1s linear infinite" : undefined,
                                }}
                            />
                            {aiLoading ? "Đang phân tích..." : "Làm mới AI"}
                        </Button>
                    </div>
                </DialogHeader>

                {/* ── Scrollable Body ─────────────────────────────────── */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 8px" }}>

                    {/* Tier 1: P&L Loading */}
                    {pnlLoading ? (
                        <div>
                            <WatchlistAnalysisLoadingFlow pnlLoading={pnlLoading} aiLoading={aiLoading} itemsCount={items.length} />
                            {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
                        </div>
                    ) : pnlError ? (
                        /* P&L Error */
                        <div
                            style={{
                                borderRadius: 10,
                                border: "1px solid rgba(220,38,38,0.4)",
                                background: "rgba(220,38,38,0.08)",
                                padding: "16px 20px",
                                color: "#fca5a5",
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>⚠️ Không tải được dữ liệu P&L</div>
                            <div style={{ fontSize: 13, color: "#f87171", marginBottom: 12 }}>{pnlError}</div>
                            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
                                Thử lại
                            </Button>
                        </div>
                    ) : portfolio ? (
                        <>
                            {/* Portfolio Summary Banner */}
                            <PortfolioSummaryBanner portfolio={portfolio} dataAsOf={dataAsOf} />
                            <ConcentrationWarning items={items} />

                            {/* AI Loading Indicator */}
                            {aiLoading && (
                                <WatchlistAnalysisLoadingFlow pnlLoading={pnlLoading} aiLoading={aiLoading} itemsCount={items.length} />
                            )}

                            {/* AI cache/generated summary */}
                            {!aiLoading && (cachedCount != null || generatedCount != null) && (
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#475569",
                                        marginTop: 10,
                                        marginBottom: 2,
                                        paddingLeft: 4,
                                    }}
                                >
                                    {cachedCount != null && cachedCount > 0 && `⚡ ${cachedCount} từ cache`}
                                    {cachedCount != null && cachedCount > 0 && generatedCount != null && generatedCount > 0 && " · "}
                                    {generatedCount != null && generatedCount > 0 && `✨ ${generatedCount} phân tích mới`}
                                </div>
                            )}

                            {/* AI Error (non-blocking) */}
                            {aiError && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "9px 14px",
                                        borderRadius: 8,
                                        border: "1px solid rgba(234,179,8,0.3)",
                                        background: "rgba(234,179,8,0.07)",
                                        color: "#fbbf24",
                                        fontSize: 12,
                                        marginTop: 10,
                                        marginBottom: 4,
                                    }}
                                >
                                    ⚠️ AI không khả dụng — {aiError}
                                </div>
                            )}

                            {/* Holdings List */}
                            {items.length === 0 ? (
                                <div
                                    style={{
                                        padding: "40px 0",
                                        textAlign: "center",
                                        color: "#475569",
                                        fontSize: 14,
                                    }}
                                >
                                    Chưa có cổ phiếu nào trong danh mục.
                                </div>
                            ) : (
                                <div
                                    style={{
                                        borderRadius: 10,
                                        border: "1px solid rgba(100,116,139,0.2)",
                                        overflow: "hidden",
                                        marginTop: 14,
                                    }}
                                >
                                    <ListHeader />
                                    {items.map(item => (
                                        <HoldingRow
                                            key={item.holding_id || item.symbol}
                                            item={item}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        /* No data yet */
                        <div style={{ padding: "40px 0", textAlign: "center", color: "#475569", fontSize: 14 }}>
                            Không có dữ liệu danh mục.
                        </div>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────── */}
                <div
                    style={{
                        flexShrink: 0,
                        padding: "12px 24px",
                        borderTop: "1px solid rgba(100,116,139,0.2)",
                        background: "rgba(15,23,42,0.8)",
                        display: "flex",
                        justifyContent: "flex-end",
                    }}
                >
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Đóng
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
