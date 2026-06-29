import { useEffect, useState } from "react"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    TableLoading,
    TableError,
    TableEmpty,
    Breadcrumb,
} from "@/shared/components"
import { getGlobalFailedSymbols, getMissingData, type FailedSymbol, type MissingDataRecord } from "@/services/crawl.service"

export default function DataValidationPage() {
    const [missingData, setMissingData] = useState<MissingDataRecord[]>([])
    const [failedSymbols, setFailedSymbols] = useState<FailedSymbol[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    const loadData = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [missing, failed] = await Promise.all([
                getMissingData(),
                getGlobalFailedSymbols()
            ])
            setMissingData(missing)
            setFailedSymbols(failed)
        } catch (err: any) {
            setError(err.message || "Failed to load validation data")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    return (
        <div className="p-6 text-[var(--foreground)] flex flex-col gap-6">
            <Breadcrumb items={["Staff", "Data Validation"]} />

            <div className="flex justify-between items-center bg-[#111827] p-4 rounded-lg border border-[var(--border)]">
                <div>
                    <h1 className="text-xl font-bold">Data Quality Overview</h1>
                    <p className="text-sm text-[var(--muted-foreground)]">Monitor missing records and global crawling failures.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                    <RefreshCw className="mr-1.5 size-3.5" />
                    Refresh Data
                </Button>
            </div>

            {isLoading ? (
                <div className="bg-[#111827] p-6 rounded-lg border border-[var(--border)]"><TableLoading /></div>
            ) : error ? (
                <div className="bg-[#111827] p-6 rounded-lg border border-[var(--border)]"><TableError message={error} onRetry={loadData} /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    
                    <div className="bg-[#111827] rounded-lg border border-[var(--border)] overflow-hidden">
                        <div className="p-4 bg-[#0f172a] border-b border-[var(--border)] flex items-center gap-2">
                            <AlertTriangle className="size-4 text-yellow-500" />
                            <h2 className="font-semibold text-yellow-500">Missing Data Records</h2>
                        </div>
                        <div className="p-3 max-h-[600px] overflow-auto">
                            {missingData.length === 0 ? (
                                <TableEmpty message="No missing data records found." />
                            ) : (
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-[#0f172a] sticky top-0">
                                        <tr>
                                            <th className="p-2 text-[var(--muted-foreground)] font-semibold border-b border-[var(--border)]">Symbol</th>
                                            <th className="p-2 text-[var(--muted-foreground)] font-semibold border-b border-[var(--border)]">Missing Dates</th>
                                            <th className="p-2 text-[var(--muted-foreground)] font-semibold border-b border-[var(--border)]">Last Updated</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {missingData.map((record, idx) => (
                                            <tr key={idx} className="border-b border-[var(--border)]/50 last:border-0">
                                                <td className="p-2 font-bold">{record.symbol}</td>
                                                <td className="p-2 text-yellow-200 text-xs">
                                                    {record.missing_dates.slice(0, 3).join(", ")}
                                                    {record.missing_dates.length > 3 && ` ...(+${record.missing_dates.length - 3})`}
                                                </td>
                                                <td className="p-2 text-slate-400">{new Date(record.last_updated).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#111827] rounded-lg border border-[var(--border)] overflow-hidden">
                        <div className="p-4 bg-[#0f172a] border-b border-[var(--border)] flex items-center gap-2">
                            <AlertTriangle className="size-4 text-red-400" />
                            <h2 className="font-semibold text-red-400">Recent Failed Symbols</h2>
                        </div>
                        <div className="p-3 max-h-[600px] overflow-auto">
                            {failedSymbols.length === 0 ? (
                                <TableEmpty message="No failed symbols found." />
                            ) : (
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-[#0f172a] sticky top-0">
                                        <tr>
                                            <th className="p-2 text-[var(--muted-foreground)] font-semibold border-b border-[var(--border)]">Symbol</th>
                                            <th className="p-2 text-[var(--muted-foreground)] font-semibold border-b border-[var(--border)]">Reason</th>
                                            <th className="p-2 text-[var(--muted-foreground)] font-semibold border-b border-[var(--border)]">Failed At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {failedSymbols.map((fs, idx) => (
                                            <tr key={idx} className="border-b border-[var(--border)]/50 last:border-0 hover:bg-slate-800/30">
                                                <td className="p-2 font-bold text-red-300">{fs.symbol}</td>
                                                <td className="p-2 text-slate-300 text-xs">{fs.reason}</td>
                                                <td className="p-2 text-slate-400 whitespace-nowrap">{new Date(fs.failed_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    )
}