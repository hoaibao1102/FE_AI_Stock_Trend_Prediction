export interface ApiResponse<T> {
    success: boolean
    message?: string
    data?: T
}

export type DataSourceStatus = "ACTIVE" | "INACTIVE"

export interface DataSourceDetailData {
    id: string
    name: string
    type: string
    description?: string
    connection_url?: string
    status: DataSourceStatus
    created_at?: string
    updated_at?: string
}

export interface DataSourceListData {
    items: DataSourceDetailData[]
    page: number
    limit: number
    total: number
    total_pages: number
}

export interface GetDataSourcesParams {
    page?: number
    limit?: number
    keyword?: string
    type?: string
    status?: DataSourceStatus
    sort_by?: string
    sort_order?: "asc" | "desc"
}

export interface CreateDataSourcePayload {
    name: string
    type: string
    description?: string
    connection_url?: string
}

export interface UpdateDataSourcePayload {
    name?: string
    type?: string
    description?: string
    connection_url?: string
}

export interface DataQualityOverviewData {
    total_records: number
    valid_records: number
    invalid_records: number
    quality_score: number
    successful_jobs?: number
    failed_jobs?: number
}

export interface DataQualityBySourceData {
    source_id: string
    source_name: string
    total_records: number
    valid_records: number
    invalid_records: number
    quality_score: number
}

export interface DataQualityByJobData {
    job_id: string
    job_name: string
    total_records: number
    valid_records: number
    invalid_records: number
    quality_score: number
    status?: string
}