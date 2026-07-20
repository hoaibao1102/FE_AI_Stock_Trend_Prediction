import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Eye,
    Filter,
    Loader2,
    RefreshCw,
    Search,
    Trash2,
    X,
} from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AiReportTemplate } from "@/pages/StockAnalysisPage"
import "@/pages/StockAnalysisPage/StockAnalysisPage.css"
import {
    deleteAiReportHistory,
    getAiReportHistories,
    getAiReportHistoryDetail,
    getAiReportHistoryUrl,
} from "@/services/aiReportService"
import {
    buildHistoryListCacheKey,
    getCachedHistoryDetail,
    getCachedHistoryList,
} from "@/services/aiReportHistoryCache"
import { Breadcrumb } from "@/shared/components"
import type {
    AiReportData,
    AiReportResponse,
    AnalyseTechnicalDetails,
    JsonRecord,
} from "@/types/aiReport"
import type {
    AiReportHistoryListItem,
} from "@/types/aiReportHistory"
import { AiReportHistoryServiceError } from "@/types/aiReportHistory"

const DEFAULT_LIMIT = 20
const UNVERIFIED = "Chưa xác minh"

type HistoryFilters = {
    symbol: string
    exchange: string
    provider: string
    model: string
    fromDate: string
    toDate: string
}

type HistoryErrorState = {
    message: string
    details?: AnalyseTechnicalDetails
}

const EMPTY_FILTERS: HistoryFilters = {
    symbol: "",
    exchange: "",
    provider: "",
    model: "",
    fromDate: "",
    toDate: "",
}

function isRecord(value: unknown): value is JsonRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function normalizeHistoryReportJson(reportJson: unknown): AiReportResponse {
    if (isRecord(reportJson) && "code" in reportJson && "data" in reportJson) {
        return reportJson as AiReportResponse
    }

    if (isRecord(reportJson) && "report_id" in reportJson) {
        return {
            code: 200,
            message: "OK",
            data: reportJson as AiReportData,
        }
    }

    throw new Error("Invalid report_json shape")
}

function getHistoryId(item: AiReportHistoryListItem) {
    return item.id || item.history_id || ""
}

function hasFilters(filters: HistoryFilters) {
    return Object.values(filters).some((value) => value.trim().length > 0)
}

function displayValue(value: unknown, fallback = UNVERIFIED) {
    if (typeof value === "string") {
        return value.trim() || fallback
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return new Intl.NumberFormat("vi-VN").format(value)
    }

    return fallback
}

function formatNumber(value?: number | null, fallback = UNVERIFIED) {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)
}

function formatScore(value?: number | null) {
    if (typeof value !== "number" || !Number.isFinite(value)) return UNVERIFIED
    return `${formatNumber(value)}/100`
}

function formatPercent(value?: number | null) {
    if (typeof value !== "number" || !Number.isFinite(value)) return UNVERIFIED
    const percentValue = Math.abs(value) <= 1 ? value * 100 : value
    return `${formatNumber(percentValue)}%`
}

function formatDateTime(value?: string | null) {
    if (!value?.trim()) return UNVERIFIED
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return UNVERIFIED

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date)
}

function getResponseMessage(response: unknown) {
    if (!isRecord(response)) return undefined

    for (const key of ["message", "detail", "error"]) {
        const value = response[key]
        if (typeof value === "string" && value.trim()) {
            return value.trim()
        }
    }

    return undefined
}

function toHistoryErrorState(
    error: unknown,
    fallbackMessage: string,
    details?: AnalyseTechnicalDetails
): HistoryErrorState {
    if (error instanceof AiReportHistoryServiceError) {
        return {
            message: error.message,
            details: error.technicalDetails,
        }
    }

    return {
        message: fallbackMessage,
        details: {
            ...details,
            url: details?.url ?? getAiReportHistoryUrl(),
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        },
    }
}

function HistoryErrorAlert({ error }: { error: HistoryErrorState }) {
    const details = error.details
    const responseMessage = getResponseMessage(details?.response) ?? details?.message

    return (
        <section className="ai-history-error" role="alert">
            <AlertTriangle className="size-5" />
            <div>
                <strong>{error.message}</strong>
                {details ? (
                    <details>
                        <summary>Chi tiết kỹ thuật</summary>
                        <dl>
                            <div>
                                <dt>URL</dt>
                                <dd>{details.url}</dd>
                            </div>
                            <div>
                                <dt>HTTP status</dt>
                                <dd>{details.httpStatus ?? UNVERIFIED}</dd>
                            </div>
                            <div>
                                <dt>Method</dt>
                                <dd>{details.method ?? UNVERIFIED}</dd>
                            </div>
                            <div>
                                <dt>Authorization header attached</dt>
                                <dd>{details.hasAuthorizationHeader ? "yes" : "no"}</dd>
                            </div>
                            <div>
                                <dt>Response message</dt>
                                <dd>{responseMessage ?? UNVERIFIED}</dd>
                            </div>
                        </dl>
                    </details>
                ) : null}
            </div>
        </section>
    )
}

function HistoryState({
    icon,
    title,
    description,
}: {
    icon: ReactNode
    title: string
    description?: string
}) {
    return (
        <section className="ai-history-state">
            {icon}
            <div>
                <strong>{title}</strong>
                {description ? <p>{description}</p> : null}
            </div>
        </section>
    )
}

function AiHistoryTabs({ active }: { active: "new" | "history" }) {
    const navigate = useNavigate()

    return (
        <div className="ai-history-tabs" role="tablist" aria-label="AI report tabs">
            <Button
                type="button"
                variant={active === "new" ? "default" : "outline"}
                onClick={() => navigate("/stock-analysis")}
            >
                Phân tích mới
            </Button>
            <Button
                type="button"
                variant={active === "history" ? "default" : "outline"}
                onClick={() => navigate("/stock-analysis/history")}
            >
                Lịch sử báo cáo
            </Button>
        </div>
    )
}

function HistoryDeleteDialog({
    item,
    isDeleting,
    onOpenChange,
    onConfirm,
}: {
    item: AiReportHistoryListItem | null
    isDeleting: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}) {
    return (
        <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
            <DialogContent className="ai-history-delete-dialog">
                <DialogHeader>
                    <DialogTitle>Xóa báo cáo AI</DialogTitle>
                    <DialogDescription>
                        Bạn có chắc muốn xóa báo cáo này khỏi lịch sử?
                    </DialogDescription>
                </DialogHeader>
                {item ? (
                    <div className="ai-history-delete-dialog__meta">
                        <span>{displayValue(item.symbol)}</span>
                        <small>{formatDateTime(item.created_at)}</small>
                    </div>
                ) : null}
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        {isDeleting ? "Đang xóa..." : "Xóa"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function AiReportHistoryListPage() {
    const navigate = useNavigate()
    const [draftFilters, setDraftFilters] = useState<HistoryFilters>(EMPTY_FILTERS)
    const [queryFilters, setQueryFilters] = useState<HistoryFilters>(EMPTY_FILTERS)
    const initialCacheKey = buildHistoryListCacheKey({
        page: 1,
        limit: DEFAULT_LIMIT,
        ...EMPTY_FILTERS,
    })
    const initialCached = getCachedHistoryList(initialCacheKey)
    const [items, setItems] = useState<AiReportHistoryListItem[]>(
        () => initialCached?.data.items ?? [],
    )
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(DEFAULT_LIMIT)
    const [total, setTotal] = useState(() => initialCached?.data.total ?? 0)
    const [isLoading, setIsLoading] = useState(() => !initialCached)
    const [error, setError] = useState<HistoryErrorState | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<AiReportHistoryListItem | null>(null)
    const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)

    const activeFilters = useMemo(() => hasFilters(queryFilters), [queryFilters])
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const from = total === 0 ? 0 : (page - 1) * limit + 1
    const to = Math.min(page * limit, total)

    const loadHistories = useCallback(
        async (options?: { forceRefresh?: boolean }, signal?: AbortSignal) => {
            const params = {
                page,
                limit,
                ...queryFilters,
            }
            const cacheKey = buildHistoryListCacheKey(params)
            const hasCached = !options?.forceRefresh && Boolean(getCachedHistoryList(cacheKey))

            if (!hasCached) {
                setIsLoading(true)
            }
            setError(null)

            try {
                const response = await getAiReportHistories(params, signal, {
                    forceRefresh: options?.forceRefresh,
                })
                setItems(response.data.items)
                setPage(response.data.page)
                setLimit(response.data.limit)
                setTotal(response.data.total)
            } catch (err) {
                if (signal?.aborted) return
                setItems([])
                setTotal(0)
                setError(toHistoryErrorState(err, "Không tải được lịch sử báo cáo."))
            } finally {
                if (!signal?.aborted) {
                    setIsLoading(false)
                }
            }
        },
        [limit, page, queryFilters]
    )

    useEffect(() => {
        const controller = new AbortController()
        void loadHistories(controller.signal)
        return () => controller.abort()
    }, [loadHistories])

    const handleFilterChange = (field: keyof HistoryFilters, value: string) => {
        setDraftFilters((current) => ({
            ...current,
            [field]: value,
        }))
    }

    const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setPage(1)
        setQueryFilters(draftFilters)
    }

    const handleFilterReset = () => {
        setDraftFilters(EMPTY_FILTERS)
        setQueryFilters(EMPTY_FILTERS)
        setPage(1)
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return

        const historyId = getHistoryId(deleteTarget)
        if (!historyId) {
            setError({ message: "Không xóa được báo cáo. Vui lòng thử lại." })
            return
        }

        setDeleteLoadingId(historyId)
        setError(null)

        try {
            await deleteAiReportHistory(historyId)
            const shouldMovePrevious = items.length <= 1 && page > 1
            setItems((current) => current.filter((item) => getHistoryId(item) !== historyId))
            setTotal((current) => Math.max(0, current - 1))
            setDeleteTarget(null)

            if (shouldMovePrevious) {
                setPage((current) => Math.max(1, current - 1))
            }
        } catch (err) {
            setError(toHistoryErrorState(err, "Không xóa được báo cáo. Vui lòng thử lại."))
        } finally {
            setDeleteLoadingId(null)
        }
    }

    return (
        <div className="ai-history-page">
            <Breadcrumb items={["Home", "AI phân tích cổ phiếu", "Lịch sử báo cáo AI"]} />

            <section className="ai-history-hero">
                <div>
                    <Badge variant="outline">Analyse history</Badge>
                    <h1>Lịch sử báo cáo AI</h1>
                    <p>Các bản phân tích cổ phiếu đã tạo trước đó</p>
                </div>
                <AiHistoryTabs active="history" />
            </section>

            <form className="ai-history-filters" onSubmit={handleFilterSubmit}>
                <div className="ai-history-filters__title">
                    <Filter className="size-4" />
                    <span>Bộ lọc báo cáo</span>
                </div>
                <label>
                    <span>Mã</span>
                    <Input
                        value={draftFilters.symbol}
                        onChange={(event) => handleFilterChange("symbol", event.target.value)}
                        placeholder="VD: FPT"
                    />
                </label>
                <label>
                    <span>Sàn</span>
                    <Input
                        value={draftFilters.exchange}
                        onChange={(event) => handleFilterChange("exchange", event.target.value)}
                        placeholder="HOSE, HNX..."
                    />
                </label>
                <label>
                    <span>Provider</span>
                    <Input
                        value={draftFilters.provider}
                        onChange={(event) => handleFilterChange("provider", event.target.value)}
                        placeholder="openai, gemini..."
                    />
                </label>
                <label>
                    <span>Model</span>
                    <Input
                        value={draftFilters.model}
                        onChange={(event) => handleFilterChange("model", event.target.value)}
                        placeholder="gpt-4.1..."
                    />
                </label>
                <label>
                    <span>Từ ngày</span>
                    <Input
                        type="date"
                        value={draftFilters.fromDate}
                        onChange={(event) => handleFilterChange("fromDate", event.target.value)}
                    />
                </label>
                <label>
                    <span>Đến ngày</span>
                    <Input
                        type="date"
                        value={draftFilters.toDate}
                        onChange={(event) => handleFilterChange("toDate", event.target.value)}
                    />
                </label>
                <div className="ai-history-filters__actions">
                    <Button type="submit" disabled={isLoading}>
                        <Search className="size-4" />
                        Tìm kiếm
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleFilterReset}
                        disabled={isLoading && !activeFilters}
                    >
                        <X className="size-4" />
                        Xóa lọc
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void loadHistories({ forceRefresh: true })}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                        Tải lại
                    </Button>
                </div>
            </form>

            {error ? <HistoryErrorAlert error={error} /> : null}

            <section className="ai-history-table-card">
                <div className="ai-history-table-card__header">
                    <div>
                        <strong>Danh sách báo cáo</strong>
                        <span>{total > 0 ? `${from}-${to} / ${total} báo cáo` : "0 báo cáo"}</span>
                    </div>
                    <Badge variant="outline">limit {limit}</Badge>
                </div>

                {isLoading ? (
                    <HistoryState
                        icon={<Loader2 className="size-5 animate-spin" />}
                        title="Đang tải lịch sử báo cáo..."
                    />
                ) : items.length ? (
                    <div className="ai-history-table-wrap">
                        <table className="ai-history-table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Sàn</th>
                                    <th>Doanh nghiệp</th>
                                    <th>Provider</th>
                                    <th>Model</th>
                                    <th>Điểm tổng</th>
                                    <th>Rủi ro</th>
                                    <th>Tin cậy dữ liệu</th>
                                    <th>Nhãn quyết định</th>
                                    <th>Thời gian tạo</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => {
                                    const historyId = getHistoryId(item)
                                    const isDeleting = deleteLoadingId === historyId

                                    return (
                                        <tr key={historyId || item.report_id}>
                                            <td>
                                                <strong>{displayValue(item.symbol)}</strong>
                                            </td>
                                            <td>{displayValue(item.exchange)}</td>
                                            <td>{displayValue(item.company)}</td>
                                            <td>{displayValue(item.provider)}</td>
                                            <td>{displayValue(item.model)}</td>
                                            <td>{formatScore(item.total_score)}</td>
                                            <td>{formatScore(item.risk_score)}</td>
                                            <td>{formatPercent(item.data_confidence)}</td>
                                            <td>
                                                <span className="ai-history-decision">
                                                    {displayValue(item.decision_label)}
                                                </span>
                                            </td>
                                            <td>{formatDateTime(item.created_at)}</td>
                                            <td>
                                                <div className="ai-history-actions">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={!historyId}
                                                        onClick={() => navigate(`/stock-analysis/history/${encodeURIComponent(historyId)}`)}
                                                    >
                                                        <Eye className="size-4" />
                                                        Xem báo cáo
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={!historyId || isDeleting}
                                                        onClick={() => setDeleteTarget(item)}
                                                    >
                                                        {isDeleting ? (
                                                            <Loader2 className="size-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="size-4" />
                                                        )}
                                                        Xóa
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <HistoryState
                        icon={<Clock className="size-5" />}
                        title={
                            activeFilters
                                ? "Không tìm thấy báo cáo phù hợp với bộ lọc hiện tại."
                                : "Chưa có báo cáo AI nào trong lịch sử."
                        }
                    />
                )}

                <div className="ai-history-pagination">
                    <span>
                        Trang {page} / {totalPages}
                    </span>
                    <div>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={page <= 1 || isLoading}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                        >
                            Trước
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={page >= totalPages || isLoading}
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        >
                            Sau
                        </Button>
                    </div>
                </div>
            </section>

            <HistoryDeleteDialog
                item={deleteTarget}
                isDeleting={Boolean(deleteLoadingId)}
                onOpenChange={(open) => {
                    if (!open && !deleteLoadingId) setDeleteTarget(null)
                }}
                onConfirm={handleConfirmDelete}
            />
        </div>
    )
}

function AiReportHistoryDetailPage({ historyId }: { historyId: string }) {
    const navigate = useNavigate()
    const cachedDetail = getCachedHistoryDetail(historyId)
    const [report, setReport] = useState<AiReportResponse | null>(() => {
        if (!cachedDetail?.data?.report_json) return null
        try {
            return normalizeHistoryReportJson(cachedDetail.data.report_json)
        } catch {
            return null
        }
    })
    const [reportId, setReportId] = useState(cachedDetail?.data?.report_id ?? "")
    const [isLoading, setIsLoading] = useState(() => !cachedDetail)
    const [error, setError] = useState<HistoryErrorState | null>(null)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const controller = new AbortController()

        async function loadDetail() {
            const hasCached = Boolean(getCachedHistoryDetail(historyId))
            if (!hasCached) {
                setIsLoading(true)
            }
            setError(null)

            try {
                const response = await getAiReportHistoryDetail(historyId, controller.signal)
                setReport(normalizeHistoryReportJson(response.data.report_json))
                setReportId(response.data.report_id)
            } catch (err) {
                if (controller.signal.aborted) return

                setReport(null)
                setError(
                    toHistoryErrorState(err, "Không tìm thấy báo cáo hoặc bạn không có quyền truy cập.", {
                        url: getAiReportHistoryUrl(historyId),
                        method: "GET",
                        hasAuthorizationHeader: true,
                    })
                )
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false)
                }
            }
        }

        void loadDetail()

        return () => controller.abort()
    }, [historyId])

    const handleDelete = async () => {
        setIsDeleting(true)
        setError(null)

        try {
            await deleteAiReportHistory(historyId)
            navigate("/stock-analysis/history")
        } catch (err) {
            setError(toHistoryErrorState(err, "Không xóa được báo cáo. Vui lòng thử lại."))
        } finally {
            setIsDeleting(false)
            setIsDeleteOpen(false)
        }
    }

    return (
        <div className="ai-history-page ai-history-detail-page">
            <Breadcrumb items={["Home", "AI phân tích cổ phiếu", "Lịch sử báo cáo AI", "Chi tiết"]} />

            <section className="ai-history-detail-header">
                <div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/stock-analysis/history")}
                    >
                        <ArrowLeft className="size-4" />
                        Quay lại lịch sử
                    </Button>
                    <AiHistoryTabs active="history" />
                </div>
                <div>
                    <Badge variant="outline">{reportId || historyId}</Badge>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setIsDeleteOpen(true)}
                        disabled={isLoading || isDeleting}
                    >
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        Xóa
                    </Button>
                </div>
            </section>

            {error ? <HistoryErrorAlert error={error} /> : null}

            {isLoading ? (
                <HistoryState
                    icon={<Loader2 className="size-5 animate-spin" />}
                    title="Đang tải báo cáo cũ..."
                />
            ) : report ? (
                <>
                    <section className="ai-history-detail-success">
                        <CheckCircle2 className="size-5" />
                        <div>
                            <strong>Đã tải báo cáo từ lịch sử</strong>
                            <p>Báo cáo cũ đang được render bằng cùng template với kết quả analyse-one mới.</p>
                        </div>
                    </section>
                    <AiReportTemplate report={report} />
                </>
            ) : !error ? (
                <HistoryState
                    icon={<AlertTriangle className="size-5" />}
                    title="Không tìm thấy báo cáo hoặc bạn không có quyền truy cập."
                />
            ) : null}

            <Dialog open={isDeleteOpen} onOpenChange={(open) => !isDeleting && setIsDeleteOpen(open)}>
                <DialogContent className="ai-history-delete-dialog">
                    <DialogHeader>
                        <DialogTitle>Xóa báo cáo AI</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc muốn xóa báo cáo này khỏi lịch sử?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteOpen(false)}
                            disabled={isDeleting}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            {isDeleting ? "Đang xóa..." : "Xóa"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function AiReportHistoryPage() {
    const { historyId } = useParams<{ historyId?: string }>()

    if (historyId) {
        return <AiReportHistoryDetailPage historyId={historyId} />
    }

    return <AiReportHistoryListPage />
}
