const parseBooleanEnv = (value: unknown, defaultValue = false): boolean => {
    if (typeof value !== "string") return defaultValue
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
    return defaultValue
}

const isValidPublicUrl = (value?: string): boolean => {
    if (!value || typeof value !== "string") return false
    try {
        const url = new URL(value.trim())
        return url.protocol === "http:" || url.protocol === "https:"
    } catch {
        return false
    }
}

export const DEFAULT_AI_SERVICE_BASE_URL = "http://localhost:5100"
export const DEFAULT_ANALYSE_API_TIMEOUT_MS = 300_000

export function normalizeBaseUrl(value?: string, fallback = DEFAULT_AI_SERVICE_BASE_URL) {
    const trimmed = value?.trim()
    if (!trimmed) return fallback
    if (!isValidPublicUrl(trimmed)) return fallback
    return trimmed.replace(/\/+$/, "")
}

export function normalizeTimeoutMs(value?: string) {
    const parsedValue = Number(value)
    if (!Number.isFinite(parsedValue) || parsedValue < DEFAULT_ANALYSE_API_TIMEOUT_MS) {
        return DEFAULT_ANALYSE_API_TIMEOUT_MS
    }

    return Math.trunc(parsedValue)
}

export function getAnalyseApiBaseUrl() {
    const preferred = typeof import.meta.env.VITE_AI_SERVICE_BASE_URL === "string" ? import.meta.env.VITE_AI_SERVICE_BASE_URL : undefined
    return normalizeBaseUrl(preferred)
}

export function getAnalyseApiTimeoutMs() {
    return normalizeTimeoutMs(import.meta.env.VITE_ANALYSE_API_TIMEOUT_MS)
}

export const visualizationExportEnabled = parseBooleanEnv(import.meta.env.VITE_VISUALIZATION_EXPORT_ENABLED, true)
export const dataFormulatorEnabled = parseBooleanEnv(import.meta.env.VITE_DATA_FORMULATOR_ENABLED, false)
export const dataFormulatorPublicUrl =
    typeof import.meta.env.VITE_DATA_FORMULATOR_PUBLIC_URL === "string"
        ? import.meta.env.VITE_DATA_FORMULATOR_PUBLIC_URL.trim().replace(/\/+$/, "")
        : ""
export const dataFormulatorPublicUrlIsValid = isValidPublicUrl(dataFormulatorPublicUrl)
export const autoDownloadVisualizationExport = parseBooleanEnv(import.meta.env.VITE_AUTO_DOWNLOAD_VISUALIZATION_EXPORT, false)
export const dataFormulatorAutoImportEnabled = parseBooleanEnv(import.meta.env.VITE_DATA_FORMULATOR_AUTO_IMPORT_ENABLED, false)

export { parseBooleanEnv, isValidPublicUrl }

