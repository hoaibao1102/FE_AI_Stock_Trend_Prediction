import { useEffect, useState } from "react"
import { Eye, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    TableLoading,
    TableError,
    TableEmpty,
    Breadcrumb,
    StatusBadge,
    placeholder,
    formatNumber,
} from "@/shared/components"
import { getCrawlLogs, getCrawlLogById, type CrawlLog, type CrawlLogDetailResponse } from "@/services/crawl.service"
import "@/shared/components/shared-stock.css"
import "./CrawlLogsPage.css"

export default function CrawlLogsPage() {
    const [logs, setLogs] = useState<CrawlLog[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    const [statusFilter, setStatusFilter] = useState<string>("")
    const [dateFilter, setDateFilter] = useState<string>("")

    const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
    const [logDetailData, setLogDetailData] = useState<CrawlLogDetailResponse | null>(null)
    const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false)

    const loadLogs = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await getCrawlLogs({
                status: statusFilter || undefined,
                date: dateFilter || undefined,
                page: 1,
                limit: 50,
            })
            setLogs(data.items || [])
        } catch (err: any) {
            setError(err.message || "Failed to load crawl logs")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadLogs()
    }, [statusFilter, dateFilter])

    const handleViewDetail = async (id: string) => {
        setSelectedLogId(id)
        setIsDetailLoading(true)
        try {
            const detailData = await getCrawlLogById(id)
            setLogDetailData(detailData)
        } catch (err: any) {
            alert(err.message || "Failed to load log details")
        } finally {
            setIsDetailLoading(false)
        }
    }

    return (
        <div className="p-6 text-[var(--foreground)] flex flex-col gap-4">
            <Breadcrumb items={["Staff", "Crawl Logs"]} />

            <div className="flex justify-between items-end bg-[#111827] p-4 rounded-lg border border-[var(--border)]">
                <div className="flex gap-4 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-[var(--muted-foreground)]">Status</label>
                        <select
                            className="bg-[#0f172a] border border-[var(--border)] rounded px-3 py-1.5 text-sm outline-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="SUCCESS">Success</option>
                            <option value="FAILED">Failed</option>
                            <option value="PARTIAL_SUCCESS">Partial Success</option>
                            <option value="RUNNING">Running</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-[var(--muted-foreground)]">Date</label>
                        <Input
                            type="date"
                            className="h-8 bg-[#0f172a] border-[var(--border)] text-sm"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
                    <RefreshCw className="mr-1.5 size-3.5" />
                    Refresh
                </Button>
            </div>

            <div className="bg-[#111827] p-3 rounded-lg border border-[var(--border)] min-h-[400px]">
                {isLoading ? (
                    <TableLoading />
                ) : error ? (
                    <TableError message={error} onRetry={loadLogs} />
                ) : logs.length === 0 ? (
                    <TableEmpty message="No crawl logs found." />
                ) : (
                    <div className="overflow-auto border border-[var(--border)]/50 rounded-md">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="bg-[#0f172a] sticky top-0">
                                <tr>
                                    <th className="p-3 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)]/70">ID</th>
                                    <th className="p-3 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)]/70">Start Time</th>
                                    <th className="p-3 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)]/70">Status</th>
                                    <th className="p-3 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)]/70">Fetched</th>
                                    <th className="p-3 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)]/70">Inserted</th>
                                    <th className="p-3 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)]/70">Updated</th>
                                    <th className="p-3 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)]/70">Failed</th>
                                    <th className="p-3 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)]/70 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => {

                                    const isFailed = log.status === "FAILED";

                                    return (
                                        <tr
                                            key={log.id}
                                            className={`border-b border-[var(--border)]/50 last:border-0 text-sm transition-colors ${isFailed ? "bg-red-950/10 hover:bg-red-950/20" : "hover:bg-slate-800/40"
                                                }`}
                                        >
                                            <td className={`p-3 font-mono text-xs ${isFailed ? "text-red-300" : "text-blue-100"}`}>
                                                {log.id.slice(0, 8)}
                                            </td>
                                            <td className={`p-3 ${isFailed ? "text-red-200" : "text-slate-300"}`}>
                                                {new Date(log.started_at).toLocaleString()}
                                            </td>
                                            <td className="p-3">
                                                <StatusBadge status={log.status} />
                                            </td>
                                            <td className={`p-3 font-medium ${isFailed ? "text-red-300" : ""}`}>{formatNumber(log.records_fetched)}</td>
                                            <td className="p-3 text-green-400 font-medium">{formatNumber(log.records_inserted)}</td>
                                            <td className="p-3 text-blue-400 font-medium">{formatNumber(log.records_updated)}</td>
                                            <td className={`p-3 font-medium ${isFailed ? "text-red-400" : "text-red-400"}`}>{formatNumber(log.records_failed)}</td>
                                            <td className="p-3 text-right">
                                                <Button variant="ghost" size="icon-xs" onClick={() => handleViewDetail(log.id)}>
                                                    <Eye className="size-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Dialog open={!!selectedLogId} onOpenChange={(open) => !open && setSelectedLogId(null)}>
                <DialogContent className="max-w-4xl bg-[#111827] text-white border-slate-700 max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Crawl Log Details</DialogTitle>
                    </DialogHeader>
                    {isDetailLoading ? (
                        <div className="py-10 text-center text-slate-400">Loading details...</div>
                    ) : logDetailData ? (
                        <div className="space-y-6 pt-4">

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm bg-[#0f172a] p-4 rounded border border-slate-700">
                                <div className="col-span-2 lg:col-span-4 border-b border-slate-700 pb-2 mb-2 flex justify-between items-center">
                                    <div><span className="text-slate-400 mr-2">ID:</span><span className="font-mono text-blue-200">{logDetailData.crawl_log.id}</span></div>
                                    <StatusBadge status={logDetailData.crawl_log.status} />
                                </div>
                                <div><span className="text-slate-400 block mb-1">Started At</span> {new Date(logDetailData.crawl_log.started_at).toLocaleString()}</div>
                                <div><span className="text-slate-400 block mb-1">Ended At</span> {logDetailData.crawl_log.ended_at ? new Date(logDetailData.crawl_log.ended_at).toLocaleString() : "Running"}</div>
                                <div><span className="text-slate-400 block mb-1">Inserted</span> <span className="text-green-400 font-medium">{logDetailData.crawl_log.records_inserted}</span></div>
                                <div><span className="text-slate-400 block mb-1">Failed</span> <span className="text-red-400 font-medium">{logDetailData.crawl_log.records_failed}</span></div>

                                {logDetailData.crawl_log.error_message && (
                                    <div className="col-span-2 lg:col-span-4 mt-2 pt-2 border-t border-slate-700">
                                        <span className="text-red-400 font-semibold block mb-1">Error Message:</span>
                                        <span className="text-slate-300">{logDetailData.crawl_log.error_message}</span>
                                    </div>
                                )}
                            </div>

                            {logDetailData.details && logDetailData.details.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-slate-200 mb-3">Record Details ({logDetailData.details.length})</h4>
                                    <div className="bg-[#0f172a] rounded border border-slate-700 overflow-hidden max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-[#1e293b] sticky top-0">
                                                <tr>
                                                    <th className="p-3 border-b border-slate-700 text-slate-300 font-medium">Symbol</th>
                                                    <th className="p-3 border-b border-slate-700 text-slate-300 font-medium">Type</th>
                                                    <th className="p-3 border-b border-slate-700 text-slate-300 font-medium">Status</th>
                                                    <th className="p-3 border-b border-slate-700 text-slate-300 font-medium">Message</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {logDetailData.details.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50 transition-colors">
                                                        <td className="p-3 font-bold">{item.symbol || item.stock?.symbol || "--"}</td>
                                                        <td className="p-3 text-slate-400 text-xs">{item.data_type}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === "SUCCESS" ? "bg-green-500/10 text-green-400" :
                                                                    item.status === "FAILED" ? "bg-red-500/10 text-red-400" :
                                                                        "bg-yellow-500/10 text-yellow-400"
                                                                }`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-slate-300 text-xs max-w-[300px] truncate" title={item.message}>
                                                            {item.message || "--"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-10 text-center text-red-400">Failed to load details.</div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}