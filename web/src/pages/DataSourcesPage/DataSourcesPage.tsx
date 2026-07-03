import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import type { FormEvent } from "react"

import {
    createStaffDataSource,
    getStaffDataSources,
    toggleStaffDataSourceStatus,
    updateStaffDataSource,
} from "@/services/data-source.service"

import type {
    CreateDataSourcePayload,
    DataSourceDetailData,
    DataSourceStatus,
} from "@/types/data-source"

import "./DataSourcesPage.css"

interface DataSourceFormState {
    name: string
    type: string
    connection_url: string
    description: string
}

const INITIAL_FORM_STATE: DataSourceFormState = {
    name: "",
    type: "",
    connection_url: "",
    description: "",
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25

export default function DataSourcesPage() {
    const [dataSources, setDataSources] = useState<
        DataSourceDetailData[]
    >([])

    const [keyword, setKeyword] = useState("")
    const [debouncedKeyword, setDebouncedKeyword] = useState("")
    const [status, setStatus] =
        useState<DataSourceStatus | "">("")

    const [page, setPage] = useState(DEFAULT_PAGE)
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingDataSource, setEditingDataSource] =
        useState<DataSourceDetailData | null>(null)

    const [form, setForm] =
        useState<DataSourceFormState>(INITIAL_FORM_STATE)

    const [formError, setFormError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const [togglingId, setTogglingId] =
        useState<string | null>(null)

    const isEditing = editingDataSource !== null

    /*
     * Debounce ô tìm kiếm để tránh gọi API
     * mỗi lần người dùng nhập một ký tự.
     */
    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedKeyword(keyword.trim())
            setPage(DEFAULT_PAGE)
        }, 400)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [keyword])

    const loadDataSources = useCallback(async () => {
        try {
            setLoading(true)
            setError("")

            const result = await getStaffDataSources({
                page,
                limit: DEFAULT_LIMIT,
                keyword: debouncedKeyword || undefined,
                status: status || undefined,
            })

            const items = result.items ?? []

            /*
             * Một số API có thể trả total = 0 dù items vẫn có dữ liệu.
             * Khi đó tạm tính total dựa trên trang hiện tại.
             */
            const inferredTotal =
                (page - 1) * DEFAULT_LIMIT + items.length

            const resolvedTotal =
                typeof result.total === "number" &&
                    result.total > 0
                    ? result.total
                    : inferredTotal

            const resolvedTotalPages =
                typeof result.total_pages === "number" &&
                    result.total_pages > 0
                    ? result.total_pages
                    : Math.max(
                        Math.ceil(
                            resolvedTotal / DEFAULT_LIMIT
                        ),
                        1
                    )

            setDataSources(items)
            setTotal(resolvedTotal)
            setTotalPages(resolvedTotalPages)
        } catch (err) {
            setDataSources([])
            setTotal(0)
            setTotalPages(1)

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load data sources"
            )
        } finally {
            setLoading(false)
        }
    }, [page, debouncedKeyword, status])

    useEffect(() => {
        void loadDataSources()
    }, [loadDataSources])

    function resetModal() {
        setIsModalOpen(false)
        setEditingDataSource(null)
        setForm(INITIAL_FORM_STATE)
        setFormError("")
    }

    function openCreateModal() {
        setEditingDataSource(null)
        setForm(INITIAL_FORM_STATE)
        setFormError("")
        setIsModalOpen(true)
    }

    function openEditModal(
        dataSource: DataSourceDetailData
    ) {
        setEditingDataSource(dataSource)

        setForm({
            name: dataSource.name ?? "",
            type: dataSource.type ?? "",
            connection_url:
                dataSource.connection_url ?? "",
            description: dataSource.description ?? "",
        })

        setFormError("")
        setIsModalOpen(true)
    }

    function closeModal() {
        if (submitting) return
        resetModal()
    }

    function updateFormField(
        field: keyof DataSourceFormState,
        value: string
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }))

        if (formError) {
            setFormError("")
        }
    }

    function validateForm(): boolean {
        if (!form.name.trim()) {
            setFormError(
                "Data source name is required"
            )
            return false
        }

        if (!form.type.trim()) {
            setFormError(
                "Data source type is required"
            )
            return false
        }

        setFormError("")
        return true
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (!validateForm()) return

        const payload: CreateDataSourcePayload = {
            name: form.name.trim(),
            type: form.type.trim(),
            connection_url:
                form.connection_url.trim() || undefined,
            description:
                form.description.trim() || undefined,
        }

        try {
            setSubmitting(true)
            setFormError("")

            if (editingDataSource) {
                await updateStaffDataSource(
                    editingDataSource.id,
                    payload
                )
            } else {
                await createStaffDataSource(payload)
            }

            /*
             * Không gọi closeModal ở đây vì submitting
             * vẫn đang bằng true và closeModal sẽ bị chặn.
             */
            resetModal()

            await loadDataSources()
        } catch (err) {
            setFormError(
                err instanceof Error
                    ? err.message
                    : isEditing
                        ? "Unable to update data source"
                        : "Unable to create data source"
            )
        } finally {
            setSubmitting(false)
        }
    }

    async function handleToggleStatus(
        dataSource: DataSourceDetailData
    ) {
        try {
            setTogglingId(dataSource.id)
            setError("")

            await toggleStaffDataSourceStatus(
                dataSource.id
            )

            await loadDataSources()
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to update data source status"
            )
        } finally {
            setTogglingId(null)
        }
    }

    function handleStatusChange(value: string) {
        setStatus(
            value as DataSourceStatus | ""
        )
        setPage(DEFAULT_PAGE)
    }

    const firstItemIndex = useMemo(() => {
        if (total === 0 || dataSources.length === 0) {
            return 0
        }

        return (
            (page - 1) * DEFAULT_LIMIT + 1
        )
    }, [page, total, dataSources.length])

    const lastItemIndex = useMemo(() => {
        if (total === 0 || dataSources.length === 0) {
            return 0
        }

        return Math.min(
            (page - 1) * DEFAULT_LIMIT +
            dataSources.length,
            total
        )
    }, [page, total, dataSources.length])

    return (
        <div className="data-sources-page">
            <div className="data-sources-container">
                <header className="data-sources-header">
                    <div>
                        <h1 className="data-sources-title">
                            Data Sources
                        </h1>

                        <p className="data-sources-subtitle">
                            Manage data sources used by the
                            ETL system.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="primary-button"
                    >
                        Add Data Source
                    </button>
                </header>

                <section className="data-sources-filters">
                    <div className="form-group search-group">
                        <label htmlFor="data-source-search">
                            Search
                        </label>

                        <input
                            id="data-source-search"
                            type="text"
                            value={keyword}
                            onChange={(event) =>
                                setKeyword(
                                    event.target.value
                                )
                            }
                            placeholder="Search by name or type"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="data-source-status">
                            Status
                        </label>

                        <select
                            id="data-source-status"
                            value={status}
                            onChange={(event) =>
                                handleStatusChange(
                                    event.target.value
                                )
                            }
                        >
                            <option value="">
                                All statuses
                            </option>

                            <option value="ACTIVE">
                                Active
                            </option>

                            <option value="INACTIVE">
                                Inactive
                            </option>
                        </select>
                    </div>
                </section>

                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}

                <section className="data-sources-card">
                    <div className="table-wrapper">
                        <table className="data-sources-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Connection</th>
                                    <th>Status</th>
                                    <th>Updated</th>

                                    <th className="actions-heading">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="table-message"
                                        >
                                            Loading data
                                            sources...
                                        </td>
                                    </tr>
                                ) : dataSources.length ===
                                    0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="table-message"
                                        >
                                            No data sources
                                            found.
                                        </td>
                                    </tr>
                                ) : (
                                    dataSources.map(
                                        (dataSource) => {
                                            const isToggling =
                                                togglingId ===
                                                dataSource.id

                                            const isActive =
                                                isDataSourceActive(
                                                    dataSource.status
                                                )

                                            return (
                                                <tr
                                                    key={
                                                        dataSource.id
                                                    }
                                                >
                                                    <td>
                                                        <div className="source-name">
                                                            {
                                                                dataSource.name
                                                            }
                                                        </div>

                                                        {dataSource.description && (
                                                            <div className="source-description">
                                                                {
                                                                    dataSource.description
                                                                }
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td>
                                                        {
                                                            dataSource.type
                                                        }
                                                    </td>

                                                    <td>
                                                        <div
                                                            className="connection-value"
                                                            title={formatConnection(
                                                                dataSource.connection_url
                                                            )}
                                                        >
                                                            {formatConnection(
                                                                dataSource.connection_url
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`status-badge ${isActive
                                                                    ? "status-active"
                                                                    : "status-inactive"
                                                                }`}
                                                        >
                                                            {isActive
                                                                ? "Active"
                                                                : "Inactive"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {formatDate(
                                                            dataSource.updated_at ??
                                                            dataSource.created_at
                                                        )}
                                                    </td>

                                                    <td>
                                                        <div className="row-actions">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        dataSource
                                                                    )
                                                                }
                                                                className="edit-button"
                                                            >
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    isToggling
                                                                }
                                                                onClick={() =>
                                                                    void handleToggleStatus(
                                                                        dataSource
                                                                    )
                                                                }
                                                                className={`status-switch ${isActive
                                                                        ? "switch-active"
                                                                        : "switch-inactive"
                                                                    }`}
                                                                aria-label={`Toggle ${dataSource.name} status`}
                                                                aria-pressed={
                                                                    isActive
                                                                }
                                                            >
                                                                <span className="switch-thumb" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        }
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    <footer className="pagination-container">
                        <p className="pagination-summary">
                            Showing {firstItemIndex} -{" "}
                            {lastItemIndex} of {total}
                        </p>

                        <div className="pagination-controls">
                            <button
                                type="button"
                                disabled={
                                    page <= 1 || loading
                                }
                                onClick={() =>
                                    setPage((current) =>
                                        Math.max(
                                            current - 1,
                                            1
                                        )
                                    )
                                }
                                className="pagination-button"
                            >
                                Previous
                            </button>

                            <span className="pagination-page">
                                Page {page} of{" "}
                                {totalPages}
                            </span>

                            <button
                                type="button"
                                disabled={
                                    page >= totalPages ||
                                    loading
                                }
                                onClick={() =>
                                    setPage((current) =>
                                        Math.min(
                                            current + 1,
                                            totalPages
                                        )
                                    )
                                }
                                className="pagination-button"
                            >
                                Next
                            </button>
                        </div>
                    </footer>
                </section>
            </div>

            {isModalOpen && (
                <div
                    className="modal-overlay"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeModal()
                        }
                    }}
                >
                    <div
                        className="modal-container"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="data-source-modal-title"
                    >
                        <header className="modal-header">
                            <div>
                                <h2
                                    id="data-source-modal-title"
                                    className="modal-title"
                                >
                                    {isEditing
                                        ? "Edit Data Source"
                                        : "Add Data Source"}
                                </h2>

                                <p className="modal-subtitle">
                                    {isEditing
                                        ? "Update the selected data source."
                                        : "Create a new data source."}
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={submitting}
                                onClick={closeModal}
                                className="modal-close-button"
                                aria-label="Close modal"
                            >
                                ×
                            </button>
                        </header>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {formError && (
                                    <div className="alert alert-error">
                                        {formError}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="source-name">
                                        Name
                                    </label>

                                    <input
                                        id="source-name"
                                        type="text"
                                        value={form.name}
                                        onChange={(event) =>
                                            updateFormField(
                                                "name",
                                                event.target
                                                    .value
                                            )
                                        }
                                        placeholder="Example: Customer Database"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="source-type">
                                        Type
                                    </label>

                                    <input
                                        id="source-type"
                                        type="text"
                                        value={form.type}
                                        onChange={(event) =>
                                            updateFormField(
                                                "type",
                                                event.target
                                                    .value
                                            )
                                        }
                                        placeholder="Example: PostgreSQL"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="connection-url">
                                        Connection URL
                                    </label>

                                    <input
                                        id="connection-url"
                                        type="text"
                                        value={
                                            form.connection_url
                                        }
                                        onChange={(event) =>
                                            updateFormField(
                                                "connection_url",
                                                event.target
                                                    .value
                                            )
                                        }
                                        placeholder="Database or API connection"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="source-description">
                                        Description
                                    </label>

                                    <textarea
                                        id="source-description"
                                        rows={4}
                                        value={
                                            form.description
                                        }
                                        onChange={(event) =>
                                            updateFormField(
                                                "description",
                                                event.target
                                                    .value
                                            )
                                        }
                                        placeholder="Describe this data source"
                                    />
                                </div>
                            </div>

                            <footer className="modal-footer">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={closeModal}
                                    className="secondary-button"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="primary-button"
                                >
                                    {submitting
                                        ? "Saving..."
                                        : isEditing
                                            ? "Save Changes"
                                            : "Create Data Source"}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function isDataSourceActive(
    status?: string
): boolean {
    return (
        String(status)
            .trim()
            .toLowerCase() === "active"
    )
}

function formatConnection(value?: string): string {
    if (!value) return "—"

    const cleanedValue = String(value)
        .replace(/\uFFFD/g, "")
        .trim()

    return cleanedValue || "—"
}

function formatDate(value?: string): string {
    if (!value) return "—"

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(date)
}