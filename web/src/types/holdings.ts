export type HoldingStatus = "ACTIVE" | "REMOVED"

export type HoldingStock = {
    _id: string
    symbol: string
    company_name: string
    market?: string | null
}

export type HoldingItem = {
    holding_id: string
    stock: HoldingStock | null
    average_cost: number
    quantity: number
    total_cost?: number
    holding_date: string
    latest_market_price: number | null
    note?: string
    status: HoldingStatus
    created_at?: string
    updated_at?: string
}

export type TransactionType = "BUY" | "SELL"

export type TransactionStatus = "ACTIVE" | "VOIDED"

export type HoldingTransactionItem = {
    transaction_id: string
    transaction_type: TransactionType
    trade_date: string
    quantity: number
    price: number
    fee: number
    tax: number
    note?: string
    status: TransactionStatus
    created_at?: string
    updated_at?: string
}

export type RecordTransactionPayload = {
    transaction_type: TransactionType
    trade_date: string
    quantity: number
    price: number
    fee?: number
    tax?: number
    note?: string
}

export type RecordTransactionResponse = {
    transaction: HoldingTransactionItem
    holding: HoldingItem | null
}

export type TransactionsListResponse = {
    items: HoldingTransactionItem[]
    pagination: {
        page: number
        limit: number
        total: number
    }
}

export type GetMyHoldingsParams = {
    status?: HoldingStatus | "ALL"
    page?: number
    limit?: number
}

export type HoldingsListResponse = {
    items: HoldingItem[]
    pagination: {
        page: number
        limit: number
        total: number
    }
}

export type SaveHoldingPayload = {
    average_cost: number
    quantity: number
    holding_date: string
    note?: string
}

export type SaveHoldingResponse = {
    holding: HoldingItem
}

export type RemoveHoldingResponse = {
    holding_id: string
    status: "REMOVED"
}
