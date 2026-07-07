import { authenticatedRequest } from "@/services/auth.service"

export type AlertType = "PRICE_ABOVE" | "PRICE_BELOW" | "VOLUME_SPIKE"
export type AlertStatus = "ACTIVE" | "TRIGGERED" | "DISABLED"

export type AlertItem = {
    id: string
    symbol: string
    company_name: string
    alert_type: AlertType
    threshold: number
    status: AlertStatus
    triggered_at: string | null
    triggered_value: number | null
    latest_price: { close_price: number; volume: number } | null
    created_at: string
    updated_at: string
}

export type CreateAlertPayload = {
    symbol: string
    alert_type: AlertType
    threshold: number
}

export type UpdateAlertPayload = {
    threshold?: number
    status?: "ACTIVE" | "DISABLED"
}

type ApiResponse<T> = {
    success: boolean
    message: string
    data: T
}

export async function getAlerts(): Promise<AlertItem[]> {
    const res = await authenticatedRequest<ApiResponse<AlertItem[]>>({
        url: "/api/alerts",
        method: "GET",
    })
    if (res.status === 401) throw new Error("Please log in to view alerts")
    if (res.status < 200 || res.status >= 300)
        throw new Error(res.data?.message || "Failed to load alerts")
    return res.data?.data ?? []
}

export async function getAlertsByStock(symbol: string): Promise<AlertItem[]> {
    const all = await getAlerts()
    return all.filter((a) => a.symbol === symbol.toUpperCase())
}

export async function createAlert(data: CreateAlertPayload): Promise<AlertItem> {
    const res = await authenticatedRequest<ApiResponse<AlertItem>>({
        url: "/api/alerts",
        method: "POST",
        data,
    })
    if (res.status === 400)
        throw new Error(res.data?.message || "Alert limit exceeded or validation failed")
    if (res.status === 404)
        throw new Error(res.data?.message || "Stock symbol not found")
    if (!res.data?.success || !res.data?.data)
        throw new Error(res.data?.message || "Failed to create alert")
    return res.data.data
}

export async function updateAlert(id: string, data: UpdateAlertPayload): Promise<AlertItem> {
    const res = await authenticatedRequest<ApiResponse<AlertItem>>({
        url: `/api/alerts/${id}`,
        method: "PUT",
        data,
    })
    if (!res.data?.success || !res.data?.data)
        throw new Error(res.data?.message || "Failed to update alert")
    return res.data.data
}

export async function deleteAlert(id: string): Promise<void> {
    const res = await authenticatedRequest<ApiResponse<null>>({
        url: `/api/alerts/${id}`,
        method: "DELETE",
    })
    if (!res.data?.success)
        throw new Error(res.data?.message || "Failed to delete alert")
}
