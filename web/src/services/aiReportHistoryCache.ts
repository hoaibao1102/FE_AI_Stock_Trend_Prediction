import type {
    AiReportHistoryDetailResponse,
    AiReportHistoryListResponse,
    AiReportHistoryQueryParams,
} from "@/types/aiReportHistory"

const listCache = new Map<string, AiReportHistoryListResponse>()
const detailCache = new Map<string, AiReportHistoryDetailResponse>()

function normalizeText(value?: string) {
    return (value ?? "").trim()
}

export function buildHistoryListCacheKey(params?: AiReportHistoryQueryParams): string {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 20

    return [
        `page=${page}`,
        `limit=${limit}`,
        `symbol=${normalizeText(params?.symbol).toUpperCase()}`,
        `exchange=${normalizeText(params?.exchange).toUpperCase()}`,
        `provider=${normalizeText(params?.provider).toLowerCase()}`,
        `model=${normalizeText(params?.model).toLowerCase()}`,
        `from=${normalizeText(params?.fromDate)}`,
        `to=${normalizeText(params?.toDate)}`,
    ].join("|")
}

export function getCachedHistoryList(cacheKey: string): AiReportHistoryListResponse | null {
    return listCache.get(cacheKey) ?? null
}

export function setCachedHistoryList(
    cacheKey: string,
    data: AiReportHistoryListResponse,
): void {
    listCache.set(cacheKey, data)
}

export function getCachedHistoryDetail(historyId: string): AiReportHistoryDetailResponse | null {
    const key = normalizeText(historyId)
    if (!key) return null
    return detailCache.get(key) ?? null
}

export function setCachedHistoryDetail(
    historyId: string,
    data: AiReportHistoryDetailResponse,
): void {
    const key = normalizeText(historyId)
    if (!key) return
    detailCache.set(key, data)
}

/** Xóa cache khi có thay đổi (tạo mới / xóa / người dùng bấm tải lại). */
export function invalidateAiReportHistoryCache(options?: {
    list?: boolean
    detailId?: string
    all?: boolean
}): void {
    if (options?.all) {
        listCache.clear()
        detailCache.clear()
        return
    }

    if (options?.list !== false) {
        listCache.clear()
    }

    const detailId = normalizeText(options?.detailId)
    if (detailId) {
        detailCache.delete(detailId)
    }
}
