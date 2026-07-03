import { authenticatedRequest } from "@/services/auth.service"

import type {
    ApiResponse,
    DataSourceListData,
    DataSourceDetailData,
    GetDataSourcesParams,
    CreateDataSourcePayload,
    UpdateDataSourcePayload,
    DataQualityOverviewData,
    DataQualityBySourceData,
    DataQualityByJobData,
} from "@/types/data-source"

const DATA_SOURCE_API = "/api/staff/data-sources"
const DATA_QUALITY_API = "/api/staff/data-quality"

interface HttpResponse {
    status: number
    data?: unknown
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    )
}

function firstDefined(...values: unknown[]): unknown {
    return values.find(
        (value) =>
            value !== undefined &&
            value !== null &&
            value !== ""
    )
}

function toStringValue(
    value: unknown,
    fallback = ""
): string {
    if (value === undefined || value === null) {
        return fallback
    }

    const result = String(value)
        .replace(/\uFFFD/g, "")
        .trim()

    return result || fallback
}

function toNumber(value: unknown): number {
    const result = Number(value)

    return Number.isFinite(result) ? result : 0
}

function normalizeStatus(value: unknown): string {
    const status = toStringValue(value)
        .toUpperCase()

    if (
        status === "ACTIVE" ||
        status === "ENABLED" ||
        status === "TRUE"
    ) {
        return "ACTIVE"
    }

    return "INACTIVE"
}

/**
 * Kiểm tra HTTP response và lấy phần data.
 *
 * Hỗ trợ hai kiểu:
 * 1. { success, message, data }
 * 2. Backend trả dữ liệu trực tiếp.
 */
function extractResponseData(
    response: HttpResponse,
    fallbackMessage: string,
    required = true
): unknown {
    if (
        response.status < 200 ||
        response.status >= 300
    ) {
        const body = isRecord(response.data)
            ? response.data
            : {}

        throw new Error(
            toStringValue(
                body.message,
                fallbackMessage
            )
        )
    }

    const body = response.data

    if (isRecord(body)) {
        if (body.success === false) {
            throw new Error(
                toStringValue(
                    body.message,
                    fallbackMessage
                )
            )
        }

        if ("data" in body) {
            const payloadData = body.data

            if (
                required &&
                (payloadData === undefined ||
                    payloadData === null)
            ) {
                throw new Error(
                    toStringValue(
                        body.message,
                        fallbackMessage
                    )
                )
            }

            return payloadData
        }
    }

    if (
        required &&
        (body === undefined || body === null)
    ) {
        throw new Error(fallbackMessage)
    }

    return body
}

/**
 * Đưa response danh sách về một mảng thống nhất.
 */
function normalizeArrayResponse(
    value: unknown
): unknown[] {
    if (Array.isArray(value)) {
        return value
    }

    if (!isRecord(value)) {
        return []
    }

    const possibleArrays = [
        value.items,
        value.content,
        value.results,
        value.records,
        value.sources,
        value.jobs,
        value.data,
    ]

    for (const item of possibleArrays) {
        if (Array.isArray(item)) {
            return item
        }
    }

    return []
}

function normalizeDataSourceDetail(
    value: unknown
): DataSourceDetailData {
    const item = isRecord(value) ? value : {}

    return {
        id: toStringValue(
            firstDefined(
                item.id,
                item.data_source_id,
                item.dataSourceId,
                item.source_id,
                item.sourceId
            )
        ),

        name: toStringValue(
            firstDefined(
                item.name,
                item.source_name,
                item.sourceName,
                item.data_source_name,
                item.dataSourceName
            ),
            "Unnamed Source"
        ),

        type: toStringValue(
            firstDefined(
                item.type,
                item.source_type,
                item.sourceType
            ),
            "Unknown"
        ),

        description: toStringValue(
            firstDefined(
                item.description,
                item.source_description,
                item.sourceDescription
            )
        ),

        connection_url: toStringValue(
            firstDefined(
                item.connection_url,
                item.connectionUrl,
                item.url,
                item.endpoint,
                item.connection
            )
        ),

        status: normalizeStatus(
            firstDefined(
                item.status,
                item.is_active,
                item.isActive,
                item.enabled
            )
        ) as DataSourceDetailData["status"],

        created_at: toStringValue(
            firstDefined(
                item.created_at,
                item.createdAt
            )
        ),

        updated_at: toStringValue(
            firstDefined(
                item.updated_at,
                item.updatedAt
            )
        ),
    }
}

function normalizeDataSourceList(
    value: unknown,
    requestedPage: number,
    requestedLimit: number
): DataSourceListData {
    const responseObject = isRecord(value)
        ? value
        : {}

    const rawItems = normalizeArrayResponse(value)

    const items = rawItems.map(
        normalizeDataSourceDetail
    )

    const page = Math.max(
        toNumber(
            firstDefined(
                responseObject.page,
                responseObject.current_page,
                responseObject.currentPage
            )
        ) || requestedPage,
        1
    )

    const limit = Math.max(
        toNumber(
            firstDefined(
                responseObject.limit,
                responseObject.page_size,
                responseObject.pageSize,
                responseObject.size
            )
        ) || requestedLimit,
        1
    )

    const inferredTotal =
        (page - 1) * limit + items.length

    const total =
        toNumber(
            firstDefined(
                responseObject.total,
                responseObject.total_items,
                responseObject.totalItems,
                responseObject.total_elements,
                responseObject.totalElements,
                responseObject.count
            )
        ) || inferredTotal

    const totalPages =
        toNumber(
            firstDefined(
                responseObject.total_pages,
                responseObject.totalPages,
                responseObject.pages
            )
        ) ||
        Math.max(Math.ceil(total / limit), 1)

    return {
        items,
        page,
        limit,
        total,
        total_pages: totalPages,
    }
}

function normalizeQualityOverview(
    value: unknown
): DataQualityOverviewData {
    const raw = isRecord(value) ? value : {}

    // BE wraps data in an "overall" key
    const item: UnknownRecord =
        isRecord(raw.overall) ? raw.overall : raw

    const totalRecords = toNumber(
        firstDefined(
            item.records_fetched,
            item.total_fetched,
            item.total_records,
            item.totalRecords,
            item.records_processed,
            item.recordsProcessed,
            item.total
        )
    )

    const validRecords = toNumber(
        firstDefined(
            item.records_inserted,
            item.total_inserted,
            item.valid_records,
            item.validRecords,
            item.passed_records,
            item.passedRecords,
            item.valid
        )
    )

    const invalidRecords = toNumber(
        firstDefined(
            item.records_failed,
            item.total_failed,
            item.invalid_records,
            item.invalidRecords,
            item.failed_records,
            item.failedRecords,
            item.invalid
        )
    )

    const providedScore = toNumber(
        firstDefined(
            item.avg_success_rate_percent,
            item.avg_success_rate,
            item.quality_score,
            item.qualityScore,
            item.score,
            item.success_rate,
            item.successRate
        )
    )

    const calculatedScore =
        totalRecords > 0
            ? (validRecords / totalRecords) * 100
            : 0

    return {
        total_records: totalRecords,
        valid_records: validRecords,
        invalid_records: invalidRecords,
        quality_score:
            providedScore || calculatedScore,

        successful_jobs: toNumber(
            firstDefined(
                item.successful_jobs,
                item.successfulJobs,
                item.success_jobs,
                item.successJobs,
                item.completed_jobs,
                item.completedJobs
            )
        ),

        failed_jobs: toNumber(
            firstDefined(
                item.failed_jobs,
                item.failedJobs,
                item.error_jobs,
                item.errorJobs
            )
        ),
    }
}

function normalizeQualityBySource(
    value: unknown,
    index: number
): DataQualityBySourceData {
    const item = isRecord(value) ? value : {}

    const source = isRecord(item.source)
        ? item.source
        : {}

    const dataSource = isRecord(item.data_source)
        ? item.data_source
        : isRecord(item.dataSource)
            ? item.dataSource
            : {}

    const totalRecords = toNumber(
        firstDefined(
            item.records_fetched,
            item.total_fetched,
            item.total_records,
            item.totalRecords,
            item.record_count,
            item.recordCount,
            item.records,
            item.total
        )
    )

    const validRecords = toNumber(
        firstDefined(
            item.records_inserted,
            item.total_inserted,
            item.valid_records,
            item.validRecords,
            item.passed_records,
            item.passedRecords,
            item.valid
        )
    )

    const invalidRecords = toNumber(
        firstDefined(
            item.records_failed,
            item.total_failed,
            item.invalid_records,
            item.invalidRecords,
            item.failed_records,
            item.failedRecords,
            item.invalid
        )
    )

    const providedScore = toNumber(
        firstDefined(
            item.avg_success_rate_percent,
            item.avg_success_rate,
            item.quality_score,
            item.qualityScore,
            item.score,
            item.success_rate,
            item.successRate
        )
    )

    return {
        source_id: toStringValue(
            firstDefined(
                item.source_id,
                item.sourceId,
                item.data_source_id,
                item.dataSourceId,
                item.id,
                source.id,
                dataSource.id
            ),
            `source-${index}`
        ),

        source_name: toStringValue(
            firstDefined(
                item.source_name,
                item.sourceName,
                item.data_source_name,
                item.dataSourceName,
                item.name,
                source.name,
                source.source_name,
                source.sourceName,
                dataSource.name
            ),
            "Unknown Source"
        ),

        total_records: totalRecords,
        valid_records: validRecords,
        invalid_records: invalidRecords,

        quality_score:
            providedScore ||
            (totalRecords > 0
                ? (validRecords / totalRecords) * 100
                : 0),
    }
}

function normalizeQualityByJob(
    value: unknown,
    index: number
): DataQualityByJobData {
    const item = isRecord(value) ? value : {}

    const job = isRecord(item.job)
        ? item.job
        : {}

    const etlJob = isRecord(item.etl_job)
        ? item.etl_job
        : isRecord(item.etlJob)
            ? item.etlJob
            : {}

    const totalRecords = toNumber(
        firstDefined(
            item.records_fetched,
            item.total_fetched,
            item.total_records,
            item.totalRecords,
            item.record_count,
            item.recordCount,
            item.records,
            item.total
        )
    )

    const validRecords = toNumber(
        firstDefined(
            item.records_inserted,
            item.total_inserted,
            item.valid_records,
            item.validRecords,
            item.passed_records,
            item.passedRecords,
            item.valid
        )
    )

    const invalidRecords = toNumber(
        firstDefined(
            item.records_failed,
            item.total_failed,
            item.invalid_records,
            item.invalidRecords,
            item.failed_records,
            item.failedRecords,
            item.invalid
        )
    )

    const providedScore = toNumber(
        firstDefined(
            item.avg_success_rate_percent,
            item.avg_success_rate,
            item.quality_score,
            item.qualityScore,
            item.score,
            item.success_rate,
            item.successRate
        )
    )

    return {
        job_id: toStringValue(
            firstDefined(
                item.job_id,
                item.jobId,
                item.etl_job_id,
                item.etlJobId,
                item.id,
                job.id,
                etlJob.id
            ),
            `job-${index}`
        ),

        job_name: toStringValue(
            firstDefined(
                item.job_name,
                item.jobName,
                item.etl_job_name,
                item.etlJobName,
                item.name,
                job.name,
                job.job_name,
                job.jobName,
                etlJob.name
            ),
            "Unknown/Deleted Job"
        ),

        total_records: totalRecords,
        valid_records: validRecords,
        invalid_records: invalidRecords,

        quality_score:
            providedScore ||
            (totalRecords > 0
                ? (validRecords / totalRecords) * 100
                : 0),

        status: toStringValue(
            firstDefined(
                item.status,
                item.job_status,
                item.jobStatus,
                job.status,
                etlJob.status
            )
        ),
    }
}

/**
 * GET /api/staff/data-sources
 */
export async function getStaffDataSources(
    params?: GetDataSourcesParams
): Promise<DataSourceListData> {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 25

    const cleanParams: Record<
        string,
        string | number
    > = {
        page,
        limit,
    }

    const keyword = params?.keyword?.trim()
    const type = params?.type?.trim()
    const sortBy = params?.sort_by?.trim()

    if (keyword) {
        cleanParams.keyword = keyword
    }

    if (type) {
        cleanParams.type = type
    }

    if (params?.status) {
        cleanParams.status = String(
            params.status
        ).toLowerCase()
    }

    if (sortBy) {
        cleanParams.sort_by = sortBy
    }

    if (params?.sort_order) {
        cleanParams.sort_order =
            params.sort_order
    }

    const response = await authenticatedRequest<
        ApiResponse<unknown>
    >({
        url: DATA_SOURCE_API,
        method: "GET",
        params: cleanParams,
    })

    const data = extractResponseData(
        response,
        "Unable to load data sources"
    )

    return normalizeDataSourceList(
        data,
        page,
        limit
    )
}

/**
 * POST /api/staff/data-sources
 */
export async function createStaffDataSource(
    data: CreateDataSourcePayload
): Promise<DataSourceDetailData | null> {
    const response = await authenticatedRequest<
        ApiResponse<unknown>
    >({
        url: DATA_SOURCE_API,
        method: "POST",
        data,
    })

    const result = extractResponseData(
        response,
        "Unable to create data source",
        false
    )

    return result
        ? normalizeDataSourceDetail(result)
        : null
}

/**
 * PUT /api/staff/data-sources/:id
 */
export async function updateStaffDataSource(
    dataSourceId: string,
    data: UpdateDataSourcePayload
): Promise<DataSourceDetailData | null> {
    const encodedId = encodeURIComponent(
        String(dataSourceId)
    )

    const response = await authenticatedRequest<
        ApiResponse<unknown>
    >({
        url: `${DATA_SOURCE_API}/${encodedId}`,
        method: "PUT",
        data,
    })

    const result = extractResponseData(
        response,
        "Unable to update data source",
        false
    )

    return result
        ? normalizeDataSourceDetail(result)
        : null
}

/**
 * PATCH /api/staff/data-sources/:id/toggle-status
 */
export async function toggleStaffDataSourceStatus(
    dataSourceId: string
): Promise<DataSourceDetailData | null> {
    const encodedId = encodeURIComponent(
        String(dataSourceId)
    )

    const response = await authenticatedRequest<
        ApiResponse<unknown>
    >({
        url: `${DATA_SOURCE_API}/${encodedId}/toggle-status`,
        method: "PATCH",
    })

    const result = extractResponseData(
        response,
        "Unable to update data source status",
        false
    )

    return result
        ? normalizeDataSourceDetail(result)
        : null
}

/**
 * GET /api/staff/data-quality
 */
export async function getStaffDataQuality(): Promise<DataQualityOverviewData> {
    const response = await authenticatedRequest<
        ApiResponse<unknown>
    >({
        url: DATA_QUALITY_API,
        method: "GET",
    })

    const data = extractResponseData(
        response,
        "Unable to load data quality"
    )

    return normalizeQualityOverview(data)
}

/**
 * GET /api/staff/data-quality/by-source
 */
export async function getStaffDataQualityBySource(): Promise<
    DataQualityBySourceData[]
> {
    const response = await authenticatedRequest<
        ApiResponse<unknown>
    >({
        url: `${DATA_QUALITY_API}/by-source`,
        method: "GET",
    })

    const data = extractResponseData(
        response,
        "Unable to load data quality by source"
    )

    return normalizeArrayResponse(data).map(
        normalizeQualityBySource
    )
}

/**
 * GET /api/staff/data-quality/by-job
 */
export async function getStaffDataQualityByJob(): Promise<
    DataQualityByJobData[]
> {
    const response = await authenticatedRequest<
        ApiResponse<unknown>
    >({
        url: `${DATA_QUALITY_API}/by-job`,
        method: "GET",
    })

    const data = extractResponseData(
        response,
        "Unable to load data quality by job"
    )

    return normalizeArrayResponse(data).map(
        normalizeQualityByJob
    )
}