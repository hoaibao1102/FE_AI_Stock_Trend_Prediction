/* ── Text helpers ──────────────────────────────────── */

export function placeholder(value?: string): string {
    return value?.trim() ? value : "--"
}

/* ── Status tone ───────────────────────────────────── */

export function getStatusTone(status?: string): "positive" | "warning" | "negative" | "neutral" {
    const normalized = status?.trim().toLowerCase()
    if (!normalized) return "neutral"
    if (["active", "listed", "trading", "open", "normal"].includes(normalized)) return "positive"
    if (["pending", "watch", "review", "hold", "warning", "paused"].includes(normalized)) return "warning"
    if (["inactive", "suspended", "halted", "delisted", "closed", "error"].includes(normalized)) return "negative"
    return "neutral"
}

/* ── Number formatting ─────────────────────────────── */

export function formatNumber(value?: number, digits = 2): string {
    if (value === undefined || !Number.isFinite(value)) return "--"
    return new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value)
}

export function formatCompact(value?: number): string {
    if (value === undefined || !Number.isFinite(value)) return "--"
    return new Intl.NumberFormat("vi-VN", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value)
}

export function formatPercent(value?: number): string {
    if (value === undefined || !Number.isFinite(value)) return "--"
    return `${value > 0 ? "+" : ""}${formatNumber(value, 2)}%`
}

/* ── Identity helpers ──────────────────────────────── */

export function exchangeOptions(): string[] {
    return ["HOSE", "HNX", "UPCOM"]
}
