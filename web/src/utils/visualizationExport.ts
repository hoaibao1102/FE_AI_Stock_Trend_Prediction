import JSZip from "jszip"
import type { VisualizationDataset, VisualizationTable } from "@/types/visualization"

const EXPORT_TABLES = [
    "prices",
    "financial_periods",
    "scores",
    "peers",
    "market_context",
    "ai_signals",
    "data_quality",
] as const

// Sanitize CSV cell to avoid CSV injection and ensure proper escaping
export function sanitizeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return ""
    let text = String(value)
    // Prevent CSV formula injection
    if (/^[=+\-@]/.test(text)) {
        text = `'${text}`
    }
    // Escape double quotes
    if (text.includes('"')) {
        text = text.replace(/"/g, '""')
    }
    // Wrap in quotes if contains comma, newline or quotes
    if (text.includes(",") || text.includes("\n") || text.includes('"')) {
        return `"${text}"`
    }
    return text
}

function keysFromColumnsOrRows(table: VisualizationTable): string[] {
    if (Array.isArray(table.columns) && table.columns.length) {
        return table.columns.map((c) => c.name)
    }

    // Fallback: collect keys from rows in insertion order
    const keySet = new Set<string>()
    for (const row of table.rows || []) {
        if (row && typeof row === "object") {
            for (const k of Object.keys(row)) {
                if (!keySet.has(k)) keySet.add(k)
            }
        }
    }

    return Array.from(keySet)
}

export function buildCsvFromVisualizationTable(table: VisualizationTable, includeBom = true): Blob {
    const keys = keysFromColumnsOrRows(table)
    const header = keys.map((k) => sanitizeCsvCell(k)).join(",")
    const lines: string[] = [header]

    for (const row of table.rows || []) {
        const cells = keys.map((k) => {
            const raw = row[k]
            return sanitizeCsvCell(raw)
        })
        lines.push(cells.join(","))
    }

    const content = (includeBom ? '\uFEFF' : '') + lines.join("\r\n")
    return new Blob([content], { type: "text/csv;charset=utf-8;" })
}

export function buildJsonBlob(dataset: VisualizationDataset): Blob {
    const content = JSON.stringify(dataset, null, 2)
    return new Blob([content], { type: "application/json;charset=utf-8" })
}

export async function buildZipExportPackage(dataset: VisualizationDataset, symbol?: string): Promise<Blob> {
    const zip = new JSZip()
    const safeSymbol = (symbol || dataset.symbol || "visualization").replace(/[^\w.-]+/g, "_")

    zip.file(`${safeSymbol}_visualization_data.json`, JSON.stringify(dataset, null, 2))

    for (const tableName of EXPORT_TABLES) {
        const table =
            (dataset.tables || []).find((item) => item.name === tableName) ??
            ({
                name: tableName,
                columns: [],
                rows: [],
            } satisfies VisualizationTable)
        const csvBlob = buildCsvFromVisualizationTable(table, true)
        const arrayBuffer = await csvBlob.arrayBuffer()
        zip.file(`${safeSymbol}_${tableName}.csv`, arrayBuffer)
    }

    const readme =
        `README - Import into Data Formulator\n\n` +
        `Upload CSV files into Data Formulator manually.\n` +
        `Start with prices.csv.\n` +
        `The JSON file is for developer/system use.\n\n` +
        `Files:\n` +
        `${safeSymbol}_visualization_data.json\n` +
        `${safeSymbol}_prices.csv\n` +
        `${safeSymbol}_financial_periods.csv\n` +
        `${safeSymbol}_scores.csv\n` +
        `${safeSymbol}_peers.csv\n` +
        `${safeSymbol}_market_context.csv\n` +
        `${safeSymbol}_ai_signals.csv\n` +
        `${safeSymbol}_data_quality.csv\n\n` +
        `Security note: This package does not contain bearer tokens, API keys, backend tokens, database URLs, signed URL secrets, or server-only secrets.\n`

    zip.file("README_IMPORT_TO_DATA_FORMULATOR.txt", readme)

    const blob = await zip.generateAsync({ type: "blob" })
    return blob
}

export function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}

