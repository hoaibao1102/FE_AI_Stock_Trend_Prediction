import { useState } from "react"
import { Download, ExternalLink, FileArchive, FileJson } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fetchVisualizationJson, downloadVisualizationCsv } from "@/services/aiReportService"
import { buildZipExportPackage, downloadBlob } from "@/utils/visualizationExport"
import type { AiReportData, AnalyseOneRequest } from "@/types/aiReport"
import { AnalyseServiceError } from "@/types/aiReport"
import type { VisualizationTableName } from "@/types/visualization"
import {
    dataFormulatorEnabled,
    dataFormulatorPublicUrl,
    dataFormulatorPublicUrlIsValid,
    visualizationExportEnabled,
} from "@/lib/config"

const TABLE_OPTIONS: VisualizationTableName[] = [
    "prices",
    "financial_periods",
    "scores",
    "peers",
    "market_context",
    "ai_signals",
    "data_quality",
]

function getExportErrorMessage(error: unknown) {
    if (error instanceof AnalyseServiceError) {
        const status = error.technicalDetails?.httpStatus
        if (status === 401) return "Bạn cần đăng nhập lại để xuất dữ liệu trực quan hóa."
        if (status === 403) return "Bạn cần thêm mã cổ phiếu này vào watchlist trước khi xuất dữ liệu."
        if (status === 404) return "Không tìm thấy dữ liệu trực quan hóa cho báo cáo này."
        if (status && status >= 500) return "Không thể tải dữ liệu trực quan hóa. Vui lòng kiểm tra AI service/analyse logs."
        if (error.kind === "network") return "Không thể kết nối tới AI service. Vui lòng kiểm tra backend/analyse service."
        if (error.kind === "timeout") return "Tải dữ liệu trực quan hóa quá lâu. Vui lòng thử lại."
        return error.message
    }

    return error instanceof Error ? error.message : String(error)
}

export default function DataFormulatorPanel({
    report,
    request,
}: {
    report: AiReportData
    request?: AnalyseOneRequest | null
}) {
    const [selectedTable, setSelectedTable] = useState<VisualizationTableName>("prices")
    const [loadingPackage, setLoadingPackage] = useState(false)
    const [loadingJson, setLoadingJson] = useState(false)
    const [loadingCsv, setLoadingCsv] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    if (!visualizationExportEnabled) return null

    const symbol = (report?.symbol || request?.symbol || "visualization").replace(/\s+/g, "_")

    const handleDownloadJson = async () => {
        setError(null)
        setMessage(null)
        setLoadingJson(true)

        try {
            const payload = await fetchVisualizationJson(request ?? undefined, report?.history_id ?? undefined)
            const data = payload.data
            if (!data) {
                setError("Không tìm thấy dữ liệu trực quan hóa để xuất.")
                return
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" })
            downloadBlob(`${symbol}_visualization_data.json`, blob)
            setMessage("Đã tải JSON tổng. File này phù hợp cho developer hoặc hệ thống đọc schema visualization.v1.")
        } catch (err) {
            setError(getExportErrorMessage(err))
        } finally {
            setLoadingJson(false)
        }
    }

    const handleDownloadFullPackage = async () => {
        setError(null)
        setMessage(null)
        setLoadingPackage(true)

        try {
            const payload = await fetchVisualizationJson(request ?? undefined, report?.history_id ?? undefined)
            const dataset = payload.data
            if (!dataset) {
                setError("Không tìm thấy dữ liệu trực quan hóa để xuất.")
                return
            }

            const zipBlob = await buildZipExportPackage(dataset, dataset.symbol || symbol)
            downloadBlob(`${(dataset.symbol || symbol).replace(/\s+/g, "_")}_visualization_export.zip`, zipBlob)
            setMessage("Đã tải gói dữ liệu đầy đủ. Hãy bắt đầu import thủ công bằng file prices.csv.")
        } catch (err) {
            setError(getExportErrorMessage(err))
        } finally {
            setLoadingPackage(false)
        }
    }

    const handleDownloadCsv = async () => {
        setError(null)
        setMessage(null)
        setLoadingCsv(true)

        try {
            const blob = await downloadVisualizationCsv(selectedTable, request ?? undefined)
            downloadBlob(`${symbol}_${selectedTable}.csv`, blob)
            setMessage(`Đã tải ${selectedTable}.csv. Hãy upload thủ công file này vào Data Formulator.`)
        } catch (err) {
            setError(getExportErrorMessage(err))
        } finally {
            setLoadingCsv(false)
        }
    }

    const handleOpenDataFormulator = () => {
        if (!dataFormulatorEnabled || !dataFormulatorPublicUrlIsValid) {
            setError(
                "Data Formulator chưa được bật. Hãy cấu hình VITE_DATA_FORMULATOR_ENABLED=true và VITE_DATA_FORMULATOR_PUBLIC_URL=http://localhost:5567, sau đó restart frontend."
            )
            return
        }

        window.open(dataFormulatorPublicUrl, "_blank", "noopener,noreferrer")
    }

    if (!dataFormulatorEnabled || !dataFormulatorPublicUrlIsValid) {
        return (
            <section id="data-formulator" className="ai-report-section">
                <div className="ai-report-section__heading">
                    <div>
                        <h2>Data Formulator</h2>
                        <p>Export thủ công dữ liệu visualization.v1.</p>
                    </div>
                    <Badge variant="outline">Manual export</Badge>
                </div>
                <div className="ai-report-empty ai-report-empty--compact">
                    <span>
                        Data Formulator chưa được bật. Hãy cấu hình VITE_DATA_FORMULATOR_ENABLED=true và
                        VITE_DATA_FORMULATOR_PUBLIC_URL=http://localhost:5567, sau đó restart frontend.
                    </span>
                </div>
            </section>
        )
    }

    return (
        <section id="data-formulator" className="ai-report-section">
            <div className="ai-report-section__heading">
                <div>
                    <h2>Data Formulator</h2>
                    <p>
                        Data Formulator là công cụ khám phá nâng cao. Hãy tải CSV theo từng bảng rồi upload thủ công vào Data
                        Formulator. Nên bắt đầu với prices.csv để dựng biểu đồ giá/candlestick/volume.
                    </p>
                </div>
                <Badge variant="outline">Manual export</Badge>
            </div>

            <div className="ai-report-card data-formulator-manual">
                <div className="data-formulator-actions">
                    <Button type="button" onClick={handleDownloadFullPackage} disabled={loadingPackage} variant="secondary">
                        <FileArchive className="size-4" />
                        {loadingPackage ? "Đang tải..." : "Tải gói dữ liệu đầy đủ"}
                    </Button>

                    <Button type="button" onClick={handleDownloadJson} disabled={loadingJson} variant="secondary">
                        <FileJson className="size-4" />
                        {loadingJson ? "Đang tải..." : "Tải JSON tổng"}
                    </Button>

                    <label className="data-formulator-table-select">
                        <span>CSV table</span>
                        <select value={selectedTable} onChange={(event) => setSelectedTable(event.target.value as VisualizationTableName)}>
                            {TABLE_OPTIONS.map((tableName) => (
                                <option key={tableName} value={tableName}>
                                    {tableName}
                                </option>
                            ))}
                        </select>
                    </label>

                    <Button type="button" onClick={handleDownloadCsv} disabled={loadingCsv} variant="secondary">
                        <Download className="size-4" />
                        {loadingCsv ? "Đang tải..." : "Tải CSV đã chọn"}
                    </Button>

                    <Button type="button" variant="outline" onClick={handleOpenDataFormulator}>
                        <ExternalLink className="size-4" />
                        Mở Data Formulator
                    </Button>
                </div>

                <div className="data-formulator-notes">
                    <p>
                        JSON tổng chứa schema visualization.v1 với tables[].rows[], dùng cho hệ thống/developer. Data
                        Formulator có thể preview JSON tổng thành 1 dòng wrapper, nên hãy dùng CSV từng bảng khi import.
                    </p>
                    <ol>
                        <li>Chọn bảng cần tải, ví dụ prices.</li>
                        <li>Bấm Tải CSV.</li>
                        <li>Bấm Mở Data Formulator.</li>
                        <li>Trong Data Formulator, chọn Upload File.</li>
                        <li>Upload file CSV vừa tải.</li>
                    </ol>
                </div>

                {message ? <div className="data-formulator-message is-success">{message}</div> : null}
                {error ? <div className="data-formulator-message is-error">{error}</div> : null}
            </div>
        </section>
    )
}
