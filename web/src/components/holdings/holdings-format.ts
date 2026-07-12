const LOCALE = "vi-VN"

function isDisplayNumber(value?: number | null): value is number {
    return value !== undefined && value !== null && Number.isFinite(value)
}

function formatIntlNumber(value: number, minimumFractionDigits: number, maximumFractionDigits: number) {
    return new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(value)
}

export function formatNumber(value?: number | null) {
    if (!isDisplayNumber(value)) return "--"
    return formatIntlNumber(value, 0, 0)
}

export function formatMoney(value?: number | null) {
    if (!isDisplayNumber(value)) return "--"
    return formatIntlNumber(value, 0, 0)
}

export function formatPrice(value?: number | null) {
    if (!isDisplayNumber(value)) return "--"
    return formatIntlNumber(value, 0, 0)
}

export function formatAverageCost(value?: number | null) {
    if (!isDisplayNumber(value)) return "--"
    return formatIntlNumber(value, 2, 2)
}

export function formatPercent(value?: number | null) {
    if (!isDisplayNumber(value)) return "--"
    return `${formatIntlNumber(value, 2, 2)}%`
}

export function formatSignedMoney(value?: number | null) {
    if (!isDisplayNumber(value)) return "--"
    return `${value > 0 ? "+" : ""}${formatMoney(value)}`
}

export function formatSignedPercent(value?: number | null) {
    if (!isDisplayNumber(value)) return "--"
    return `${value > 0 ? "+" : ""}${formatIntlNumber(value, 2, 2)}%`
}

export function formatDate(value?: string | null, mode: "date" | "datetime" = "datetime") {
    if (!value) return "--"

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    if (mode === "date") {
        return date.toISOString().slice(0, 10)
    }

    return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date)
}

export function getPnlTone(value?: number | null) {
    if (value === undefined || value === null || !Number.isFinite(value) || value === 0) return "text-slate-300"
    return value > 0 ? "text-emerald-400" : "text-rose-400"
}

export function buildTransactionPayload(values: {
    transaction_type: "BUY" | "SELL"
    trade_date: string
    quantity: string
    price: string
    fee: string
    tax: string
    note: string
}) {
    const payload: {
        transaction_type: "BUY" | "SELL"
        trade_date: string
        quantity: number
        price: number
        fee?: number
        tax?: number
        note?: string
    } = {
        transaction_type: values.transaction_type,
        trade_date: values.trade_date,
        quantity: Number(values.quantity),
        price: Number(values.price),
    }

    if (values.fee.trim() !== "") {
        payload.fee = Number(values.fee)
    }

    if (values.tax.trim() !== "") {
        payload.tax = Number(values.tax)
    }

    if (values.note.trim()) {
        payload.note = values.note.trim()
    }

    return payload
}
