import { authenticatedRequest } from "@/services/auth.service"

export type CrawlLog = {
    id: string
    crawl_job: string | null
    started_at: string
    ended_at: string | null
    status: string
    records_fetched: number
    records_inserted: number
    records_updated: number
    records_failed: number
    error_message: string | null
    created_at: string
}
export type CrawlLogDetailItem = {
    id: string
    stock?: {
        id: string
        symbol: string
        company_name: string
    }
    symbol: string
    data_type: string
    status: string
    message: string
    created_at: string
}

export type CrawlLogDetailResponse = {
    crawl_log: CrawlLog
    details: CrawlLogDetailItem[]
}
export type CrawlLogDetail = CrawlLog & {
    logs?: string[]
}


export type FailedSymbol = {
    symbol: string
    reason: string
    failed_at: string
}

export type MissingDataRecord = {
    symbol: string
    missing_dates: string[]
    last_updated: string
}

export type PaginatedResponse<T> = {
    items: T[]
    pagination: {
        page: number
        limit: number
        total_items: number
        total_pages: number
    }
}

export async function getCrawlLogs(params?: {
    page?: number
    limit?: number
    status?: string
    date?: string
}): Promise<PaginatedResponse<CrawlLog>> {
    const response = await authenticatedRequest<{ success: boolean; data: PaginatedResponse<CrawlLog> }>({
        url: "/api/staff/crawl-logs",
        method: "GET",
        params,
    })
    return response.data.data
}

export async function getCrawlLogById(id: string): Promise<CrawlLogDetailResponse> {
    const response = await authenticatedRequest<{ success: boolean; data: CrawlLogDetailResponse }>({
        url: `/api/staff/crawl-logs/${id}`,
        method: "GET",
    })
    return response.data.data
}

export async function getFailedSymbolsByLogId(id: string): Promise<FailedSymbol[]> {
    const response = await authenticatedRequest<{ success: boolean; data: FailedSymbol[] }>({
        url: `/api/staff/crawl-logs/${id}/failed-symbols`,
        method: "GET",
    })
    return response.data.data || []
}

export async function getGlobalFailedSymbols(): Promise<FailedSymbol[]> {
    const response = await authenticatedRequest<{ success: boolean; data: FailedSymbol[] }>({
        url: "/api/staff/crawl-logs/failed-symbols",
        method: "GET",
    })
    return response.data.data || []
}

export async function getMissingData(): Promise<MissingDataRecord[]> {
    const response = await authenticatedRequest<{ success: boolean; data: MissingDataRecord[] }>({
        url: "/api/staff/data-quality/missing",
        method: "GET",
    })
    return response.data.data || []
}