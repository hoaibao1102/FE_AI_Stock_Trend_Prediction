import { authenticatedRequest } from "@/services/auth.service"
import type {
    GetMyHoldingsParams,
    HoldingItem,
    HoldingsListResponse,
    RecordTransactionPayload,
    RecordTransactionResponse,
    RemoveHoldingResponse,
    SaveHoldingPayload,
    SaveHoldingResponse,
    TransactionsListResponse,
} from "@/types/holdings"

type ApiSuccessResponse<T> = {
    success?: boolean
    message?: string
    data?: T
    error?: string
    code?: string
    details?: unknown
}

type ApiErrorResponse = {
    success?: boolean
    message?: string
    error?: string
    code?: string
    details?: unknown
    errors?: unknown
}

export class HoldingsServiceError extends Error {
    status: number
    code?: string
    details?: unknown

    constructor(message: string, options: { status: number; code?: string; details?: unknown }) {
        super(message)
        this.name = "HoldingsServiceError"
        this.status = options.status
        this.code = options.code
        this.details = options.details
    }
}

function hasData<T>(payload: ApiSuccessResponse<T> | ApiErrorResponse): payload is ApiSuccessResponse<T> & { data: T } {
    return "data" in payload && payload.data !== undefined
}

function normalizeSymbol(symbol: string) {
    return symbol.trim().toUpperCase()
}

function buildQuery(params: Record<string, unknown>) {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
    )
}

function getErrorMessage(payload: ApiErrorResponse | undefined, fallback: string) {
    return payload?.message || payload?.error || payload?.code || fallback
}

function assertSuccess<T>(status: number, payload: ApiSuccessResponse<T> | ApiErrorResponse, fallback: string): T {
    if (status >= 200 && status < 300 && payload?.success !== false && hasData(payload)) {
        return payload.data
    }

    throw new HoldingsServiceError(getErrorMessage(payload, fallback), {
        status,
        code: payload?.code || payload?.error,
        details: payload?.details ?? ("errors" in payload ? payload.errors : undefined),
    })
}

export async function getMyHoldings(params: GetMyHoldingsParams = {}): Promise<HoldingsListResponse> {
    const response = await authenticatedRequest<ApiSuccessResponse<HoldingsListResponse> | ApiErrorResponse>({
        url: "/api/me/holdings",
        method: "GET",
        params: buildQuery(params),
    })

    return assertSuccess(response.status, response.data, "Failed to load holdings")
}

export async function getHoldingDetail(symbol: string): Promise<HoldingItem> {
    const response = await authenticatedRequest<ApiSuccessResponse<HoldingItem> | ApiErrorResponse>({
        url: `/api/me/holdings/${encodeURIComponent(normalizeSymbol(symbol))}`,
        method: "GET",
    })

    return assertSuccess(response.status, response.data, "Failed to load holding detail")
}

export async function saveHolding(symbol: string, payload: SaveHoldingPayload): Promise<SaveHoldingResponse> {
    const response = await authenticatedRequest<ApiSuccessResponse<SaveHoldingResponse> | ApiErrorResponse>({
        url: `/api/me/holdings/${encodeURIComponent(normalizeSymbol(symbol))}`,
        method: "POST",
        data: payload,
    })

    return assertSuccess(response.status, response.data, "Failed to save holding")
}

export async function updateHolding(symbol: string, payload: SaveHoldingPayload): Promise<SaveHoldingResponse> {
    const response = await authenticatedRequest<ApiSuccessResponse<SaveHoldingResponse> | ApiErrorResponse>({
        url: `/api/me/holdings/${encodeURIComponent(normalizeSymbol(symbol))}`,
        method: "PUT",
        data: payload,
    })

    return assertSuccess(response.status, response.data, "Failed to update holding")
}

export async function removeHolding(symbol: string): Promise<RemoveHoldingResponse> {
    const response = await authenticatedRequest<ApiSuccessResponse<RemoveHoldingResponse> | ApiErrorResponse>({
        url: `/api/me/holdings/${encodeURIComponent(normalizeSymbol(symbol))}`,
        method: "DELETE",
    })

    return assertSuccess(response.status, response.data, "Failed to remove holding")
}

export async function recordTransaction(
    symbol: string,
    payload: RecordTransactionPayload,
): Promise<RecordTransactionResponse> {
    const response = await authenticatedRequest<ApiSuccessResponse<RecordTransactionResponse> | ApiErrorResponse>({
        url: `/api/me/holdings/${encodeURIComponent(normalizeSymbol(symbol))}/transactions`,
        method: "POST",
        data: payload,
    })

    return assertSuccess(response.status, response.data, "Failed to record transaction")
}

export async function getHoldingTransactions(
    symbol: string,
    params: { page?: number; limit?: number; status?: "ACTIVE" | "VOIDED" | "ALL" } = {},
): Promise<TransactionsListResponse> {
    const response = await authenticatedRequest<ApiSuccessResponse<TransactionsListResponse> | ApiErrorResponse>({
        url: `/api/me/holdings/${encodeURIComponent(normalizeSymbol(symbol))}/transactions`,
        method: "GET",
        params: buildQuery(params),
    })

    return assertSuccess(response.status, response.data, "Failed to load transactions")
}
