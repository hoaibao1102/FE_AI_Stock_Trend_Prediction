import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"

import {
    getStaffDataQuality,
    getStaffDataQualityByJob,
    getStaffDataQualityBySource,
} from "@/services/data-source.service"

import type {
    DataQualityOverviewData,
    DataQualityBySourceData,
    DataQualityByJobData,
} from "@/types/data-source"

import "./EtlMonitorPage.css"

interface DashboardState {
    overview: DataQualityOverviewData | null
    bySource: DataQualityBySourceData[]
    byJob: DataQualityByJobData[]
}

const INITIAL_DASHBOARD_STATE: DashboardState = {
    overview: null,
    bySource: [],
    byJob: [],
}

export default function EtlMonitorPage() {
    const [dashboard, setDashboard] =
        useState<DashboardState>(
            INITIAL_DASHBOARD_STATE
        )

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState("")
    const [warning, setWarning] = useState("")

    const loadDashboard = useCallback(
        async (isRefresh = false) => {
            try {
                if (isRefresh) {
                    setRefreshing(true)
                } else {
                    setLoading(true)
                }

                setError("")
                setWarning("")

                const [
                    overviewResult,
                    sourceResult,
                    jobResult,
                ] = await Promise.allSettled([
                    getStaffDataQuality(),
                    getStaffDataQualityBySource(),
                    getStaffDataQualityByJob(),
                ])

                const failedSections: string[] = []

                const overview =
                    overviewResult.status === "fulfilled"
                        ? overviewResult.value
                        : null

                if (
                    overviewResult.status === "rejected"
                ) {
                    failedSections.push(
                        "overview statistics"
                    )
                }

                const bySource =
                    sourceResult.status === "fulfilled"
                        ? sourceResult.value
                        : []

                if (
                    sourceResult.status === "rejected"
                ) {
                    failedSections.push(
                        "quality by source"
                    )
                }

                const byJob =
                    jobResult.status === "fulfilled"
                        ? jobResult.value
                        : []

                if (jobResult.status === "rejected") {
                    failedSections.push(
                        "quality by job"
                    )
                }

                const allRequestsFailed =
                    overviewResult.status ===
                    "rejected" &&
                    sourceResult.status ===
                    "rejected" &&
                    jobResult.status ===
                    "rejected"

                if (allRequestsFailed) {
                    throw new Error(
                        getRejectedMessage(
                            overviewResult,
                            sourceResult,
                            jobResult
                        )
                    )
                }

                setDashboard({
                    overview,
                    bySource: Array.isArray(bySource)
                        ? bySource
                        : [],
                    byJob: Array.isArray(byJob)
                        ? byJob
                        : [],
                })

                if (failedSections.length > 0) {
                    setWarning(
                        `Some sections could not be loaded: ${failedSections.join(
                            ", "
                        )}.`
                    )
                }
            } catch (err) {
                setDashboard(
                    INITIAL_DASHBOARD_STATE
                )

                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load ETL monitoring data"
                )
            } finally {
                setLoading(false)
                setRefreshing(false)
            }
        },
        []
    )

    useEffect(() => {
        void loadDashboard()
    }, [loadDashboard])

    const overview = dashboard.overview

    const totalRecords = getSafeNumber(
        overview?.total_records
    )

    const validRecords = getSafeNumber(
        overview?.valid_records
    )

    const invalidRecords = getSafeNumber(
        overview?.invalid_records
    )

    const successfulJobs = getSafeNumber(
        overview?.successful_jobs
    )

    const failedJobs = getSafeNumber(
        overview?.failed_jobs
    )

    const qualityScore = useMemo(() => {
        const providedScore = getSafeNumber(
            overview?.quality_score
        )

        if (providedScore > 0) {
            return clampPercentage(providedScore)
        }

        if (totalRecords <= 0) {
            return 0
        }

        return clampPercentage(
            (validRecords / totalRecords) * 100
        )
    }, [
        overview?.quality_score,
        totalRecords,
        validRecords,
    ])

    const hasQualityData = totalRecords > 0

    const validProgressWidth = hasQualityData
        ? qualityScore
        : 0

    const invalidProgressWidth = hasQualityData
        ? 100 - qualityScore
        : 0

    return (
        <div className="etl-monitor-page">
            <div className="etl-monitor-container">
                <header className="etl-monitor-header">
                    <div>
                        <h1 className="etl-monitor-title">
                            ETL Monitor
                        </h1>

                        <p className="etl-monitor-subtitle">
                            Monitor data quality, source
                            performance and ETL job results.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="etl-refresh-button"
                        disabled={
                            loading || refreshing
                        }
                        onClick={() =>
                            void loadDashboard(true)
                        }
                    >
                        {refreshing
                            ? "Refreshing..."
                            : "Refresh"}
                    </button>
                </header>

                {error && (
                    <div className="etl-alert etl-alert-error">
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() =>
                                void loadDashboard()
                            }
                        >
                            Try again
                        </button>
                    </div>
                )}

                {warning && (
                    <div className="etl-alert etl-alert-warning">
                        {warning}
                    </div>
                )}

                {loading ? (
                    <LoadingDashboard />
                ) : (
                    <>
                        <section className="etl-kpi-grid">
                            <KpiCard
                                label="Total Records"
                                value={formatNumber(
                                    totalRecords
                                )}
                                description="Records processed"
                                accent="blue"
                            />

                            <KpiCard
                                label="Valid Records"
                                value={formatNumber(
                                    validRecords
                                )}
                                description="Passed validation"
                                accent="green"
                            />

                            <KpiCard
                                label="Invalid Records"
                                value={formatNumber(
                                    invalidRecords
                                )}
                                description="Require attention"
                                accent="red"
                            />

                            <KpiCard
                                label="Quality Score"
                                value={`${formatPercentage(
                                    qualityScore
                                )}%`}
                                description="Overall data quality"
                                accent="purple"
                            />

                            <KpiCard
                                label="Successful Jobs"
                                value={formatNumber(
                                    successfulJobs
                                )}
                                description="Completed successfully"
                                accent="cyan"
                            />

                            <KpiCard
                                label="Failed Jobs"
                                value={formatNumber(
                                    failedJobs
                                )}
                                description="Jobs with errors"
                                accent="orange"
                            />
                        </section>

                        <section className="etl-dashboard-grid">
                            <DataQualityBySourcePanel
                                items={dashboard.bySource}
                            />

                            <DataQualityByJobPanel
                                items={dashboard.byJob}
                            />
                        </section>

                        <section className="etl-summary-card">
                            <div className="etl-card-heading">
                                <div>
                                    <h2>
                                        Data Quality Summary
                                    </h2>

                                    <p>
                                        Overall proportion of
                                        valid and invalid records.
                                    </p>
                                </div>

                                <strong>
                                    {formatPercentage(
                                        qualityScore
                                    )}
                                    %
                                </strong>
                            </div>

                            <div
                                className="quality-progress"
                                aria-label={
                                    hasQualityData
                                        ? `Overall data quality ${formatPercentage(
                                            qualityScore
                                        )}%`
                                        : "No quality data available"
                                }
                            >
                                <div
                                    className="quality-progress-valid"
                                    style={{
                                        width: `${validProgressWidth}%`,
                                    }}
                                />

                                <div
                                    className="quality-progress-invalid"
                                    style={{
                                        width: `${invalidProgressWidth}%`,
                                    }}
                                />
                            </div>

                            <div className="quality-progress-legend">
                                <span>
                                    <i className="legend-dot legend-valid" />
                                    Valid:{" "}
                                    {formatNumber(
                                        validRecords
                                    )}
                                </span>

                                <span>
                                    <i className="legend-dot legend-invalid" />
                                    Invalid:{" "}
                                    {formatNumber(
                                        invalidRecords
                                    )}
                                </span>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    )
}

interface KpiCardProps {
    label: string
    value: string
    description: string
    accent:
    | "blue"
    | "green"
    | "red"
    | "purple"
    | "cyan"
    | "orange"
}

function KpiCard({
    label,
    value,
    description,
    accent,
}: KpiCardProps) {
    return (
        <article
            className={`etl-kpi-card etl-kpi-${accent}`}
        >
            <div className="etl-kpi-accent" />

            <p className="etl-kpi-label">
                {label}
            </p>

            <strong className="etl-kpi-value">
                {value}
            </strong>

            <p className="etl-kpi-description">
                {description}
            </p>
        </article>
    )
}

interface SourcePanelProps {
    items: DataQualityBySourceData[]
}

function DataQualityBySourcePanel({
    items,
}: SourcePanelProps) {
    return (
        <article className="etl-chart-card">
            <div className="etl-card-heading">
                <div>
                    <h2>Quality by Source</h2>

                    <p>
                        Data quality score for each data
                        source.
                    </p>
                </div>

                <span className="etl-card-count">
                    {formatCount(
                        items.length,
                        "source",
                        "sources"
                    )}
                </span>
            </div>

            {items.length === 0 ? (
                <EmptyState
                    message="No source quality data available."
                />
            ) : (
                <div className="etl-chart-list">
                    {items.map((item, index) => {
                        const score =
                            resolveQualityScore(
                                item.quality_score,
                                item.valid_records,
                                item.total_records
                            )

                        const sourceKey =
                            item.source_id ||
                            `${item.source_name}-${index}`

                        return (
                            <div
                                className="etl-chart-row"
                                key={sourceKey}
                            >
                                <div className="etl-chart-row-header">
                                    <div>
                                        <strong>
                                            {item.source_name ||
                                                "Unnamed source"}
                                        </strong>

                                        <span>
                                            {formatNumber(
                                                getSafeNumber(
                                                    item.total_records
                                                )
                                            )}{" "}
                                            records -{" "}
                                            {formatNumber(
                                                getSafeNumber(
                                                    item.invalid_records
                                                )
                                            )}{" "}
                                            invalid
                                        </span>
                                    </div>

                                    <b>
                                        {formatPercentage(
                                            score
                                        )}
                                        %
                                    </b>
                                </div>

                                <div className="etl-bar-track">
                                    <div
                                        className={getQualityBarClass(
                                            score
                                        )}
                                        style={{
                                            width: `${score}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </article>
    )
}

interface JobPanelProps {
    items: DataQualityByJobData[]
}

function DataQualityByJobPanel({
    items,
}: JobPanelProps) {
    return (
        <article className="etl-chart-card">
            <div className="etl-card-heading">
                <div>
                    <h2>Quality by Job</h2>

                    <p>
                        Validation results from recent ETL
                        jobs.
                    </p>
                </div>

                <span className="etl-card-count">
                    {formatCount(
                        items.length,
                        "job",
                        "jobs"
                    )}
                </span>
            </div>

            {items.length === 0 ? (
                <EmptyState
                    message="No ETL job quality data available."
                />
            ) : (
                <div className="etl-chart-list">
                    {items.map((item, index) => {
                        const score =
                            resolveQualityScore(
                                item.quality_score,
                                item.valid_records,
                                item.total_records
                            )

                        const jobKey =
                            item.job_id ||
                            `${item.job_name}-${index}`

                        return (
                            <div
                                className="etl-chart-row"
                                key={jobKey}
                            >
                                <div className="etl-chart-row-header">
                                    <div>
                                        <div className="etl-job-name-row">
                                            <strong>
                                                {item.job_name ||
                                                    "Unnamed job"}
                                            </strong>

                                            {item.status && (
                                                <span
                                                    className={`etl-job-status ${getJobStatusClass(
                                                        item.status
                                                    )}`}
                                                >
                                                    {formatStatus(
                                                        item.status
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        <span>
                                            {formatNumber(
                                                getSafeNumber(
                                                    item.valid_records
                                                )
                                            )}{" "}
                                            valid -{" "}
                                            {formatNumber(
                                                getSafeNumber(
                                                    item.invalid_records
                                                )
                                            )}{" "}
                                            invalid
                                        </span>
                                    </div>

                                    <b>
                                        {formatPercentage(
                                            score
                                        )}
                                        %
                                    </b>
                                </div>

                                <div className="etl-bar-track">
                                    <div
                                        className={getQualityBarClass(
                                            score
                                        )}
                                        style={{
                                            width: `${score}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </article>
    )
}

function EmptyState({
    message,
}: {
    message: string
}) {
    return (
        <div className="etl-empty-state">
            <p>{message}</p>
        </div>
    )
}

function LoadingDashboard() {
    return (
        <>
            <section className="etl-kpi-grid">
                {Array.from({ length: 6 }).map(
                    (_, index) => (
                        <div
                            className="etl-kpi-card etl-skeleton-card"
                            key={index}
                        >
                            <div className="etl-skeleton etl-skeleton-small" />
                            <div className="etl-skeleton etl-skeleton-large" />
                            <div className="etl-skeleton etl-skeleton-medium" />
                        </div>
                    )
                )}
            </section>

            <section className="etl-dashboard-grid">
                {Array.from({ length: 2 }).map(
                    (_, index) => (
                        <div
                            className="etl-chart-card etl-loading-panel"
                            key={index}
                        >
                            <div className="etl-skeleton etl-skeleton-title" />

                            {Array.from({
                                length: 4,
                            }).map((__, rowIndex) => (
                                <div
                                    className="etl-loading-row"
                                    key={rowIndex}
                                >
                                    <div className="etl-skeleton etl-skeleton-medium" />
                                    <div className="etl-skeleton etl-skeleton-bar" />
                                </div>
                            ))}
                        </div>
                    )
                )}
            </section>
        </>
    )
}

function getSafeNumber(
    value?: number | null
): number {
    const parsedValue = Number(value)

    return Number.isFinite(parsedValue)
        ? parsedValue
        : 0
}

function clampPercentage(value: number): number {
    return Math.min(
        Math.max(getSafeNumber(value), 0),
        100
    )
}

function resolveQualityScore(
    qualityScore?: number,
    validRecords?: number,
    totalRecords?: number
): number {
    const providedScore =
        getSafeNumber(qualityScore)

    if (providedScore > 0) {
        return clampPercentage(providedScore)
    }

    const valid = getSafeNumber(validRecords)
    const total = getSafeNumber(totalRecords)

    if (total <= 0) {
        return 0
    }

    return clampPercentage(
        (valid / total) * 100
    )
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US").format(
        getSafeNumber(value)
    )
}

function formatPercentage(value: number): string {
    return clampPercentage(value).toFixed(1)
}

function formatCount(
    count: number,
    singular: string,
    plural: string
): string {
    return `${count} ${count === 1 ? singular : plural
        }`
}

function formatStatus(status: string): string {
    const normalizedStatus = String(status)
        .trim()
        .toLowerCase()

    if (!normalizedStatus) {
        return ""
    }

    return (
        normalizedStatus.charAt(0).toUpperCase() +
        normalizedStatus.slice(1)
    )
}

function getQualityBarClass(
    score: number
): string {
    if (score >= 90) {
        return "etl-bar-fill etl-bar-good"
    }

    if (score >= 70) {
        return "etl-bar-fill etl-bar-warning"
    }

    return "etl-bar-fill etl-bar-danger"
}

function getJobStatusClass(
    status: string
): string {
    const normalizedStatus = String(status)
        .trim()
        .toLowerCase()

    if (
        normalizedStatus === "success" ||
        normalizedStatus === "successful" ||
        normalizedStatus === "completed"
    ) {
        return "etl-job-status-success"
    }

    if (
        normalizedStatus === "failed" ||
        normalizedStatus === "error"
    ) {
        return "etl-job-status-failed"
    }

    if (
        normalizedStatus === "running" ||
        normalizedStatus === "processing"
    ) {
        return "etl-job-status-running"
    }

    return "etl-job-status-neutral"
}

function getRejectedMessage(
    ...results: PromiseSettledResult<unknown>[]
): string {
    for (const result of results) {
        if (
            result.status === "rejected" &&
            result.reason instanceof Error
        ) {
            return result.reason.message
        }
    }

    return "Unable to load ETL monitoring data"
}