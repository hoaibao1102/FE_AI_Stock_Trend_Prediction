import { useCallback, useEffect, useState } from "react"
import { Edit3, Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth.store"
import { Breadcrumb } from "@/shared/components"
import { getAlerts, deleteAlert, updateAlert, type AlertItem } from "@/services/alert.service"
import { getWatchlistStocks } from "@/services/watchlist.service"
import CreateAlertModal from "@/pages/StockDetailPage/CreateAlertModal"
import "./AlertsPage.css"

function formatDate(dateStr: string): string {
    if (!dateStr) return "--"
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

export default function AlertsPage() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const [alerts, setAlerts] = useState<AlertItem[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingAlert, setEditingAlert] = useState<AlertItem | null>(null)
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([])
    const [deleting, setDeleting] = useState<Set<string>>(new Set())
    const [toggling, setToggling] = useState<Set<string>>(new Set())

    const load = useCallback(async () => {
        if (!isAuthenticated) return
        setLoading(true)
        try {
            const [data, stocks] = await Promise.all([
                getAlerts(),
                getWatchlistStocks(),
            ])
            setAlerts(data)
            setWatchlistSymbols(stocks.map((s) => s.symbol))
        } catch (err) {
            toast.error("Failed to load alerts", {
                description: err instanceof Error ? err.message : "An error occurred",
            })
        } finally {
            setLoading(false)
        }
    }, [isAuthenticated])

    useEffect(() => {
        void load()
    }, [load])

    const handleToggle = async (alert: AlertItem) => {
        setToggling((prev) => new Set(prev).add(alert.id))
        try {
            const newStatus = alert.status === "DISABLED" ? "ACTIVE" : "DISABLED"
            await updateAlert(alert.id, { status: newStatus })
            setAlerts((prev) =>
                prev.map((a) =>
                    a.id === alert.id
                        ? { ...a, status: newStatus, triggered_at: null, triggered_value: null }
                        : a
                )
            )
            toast.success(`Alert ${newStatus === "ACTIVE" ? "enabled" : "disabled"}`)
        } catch (err) {
            toast.error("Failed to toggle alert", {
                description: err instanceof Error ? err.message : "An error occurred",
            })
        } finally {
            setToggling((prev) => {
                const next = new Set(prev)
                next.delete(alert.id)
                return next
            })
        }
    }

    const handleDelete = async (id: string) => {
        setDeleting((prev) => new Set(prev).add(id))
        try {
            await deleteAlert(id)
            setAlerts((prev) => prev.filter((a) => a.id !== id))
            toast.success("Alert deleted")
        } catch (err) {
            toast.error("Failed to delete alert", {
                description: err instanceof Error ? err.message : "An error occurred",
            })
        } finally {
            setDeleting((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        }
    }

    return (
        <div className="alerts-page">
            <Breadcrumb items={["Home", "Alerts"]} />

            <div className="alerts-page__header">
                <h1>Alerts</h1>
                <Button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    disabled={watchlistSymbols.length === 0}
                    title={watchlistSymbols.length === 0 ? "Add stocks to your watchlist first" : "Create a new alert"}
                >
                    <Plus className="size-4" /> New Alert
                </Button>
            </div>

            {loading ? (
                <div className="alerts-page__loading">
                    <Loader2 className="size-5 animate-spin" />
                    <span>Loading alerts...</span>
                </div>
            ) : alerts.length === 0 ? (
                <div className="alerts-page__empty">
                    <span>No alerts configured</span>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateModal(true)}
                        disabled={watchlistSymbols.length === 0}
                    >
                        <Plus className="size-4" /> Create your first alert
                    </Button>
                </div>
            ) : (
                <div className="alerts-page__table-wrap">
                    <table className="alerts-page__table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Company</th>
                                <th>Type</th>
                                <th>Threshold</th>
                                <th>Status</th>
                                <th>Latest Price</th>
                                <th>Triggered</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.map((alert) => {
                                const alertColor =
                                    alert.alert_type === "PRICE_ABOVE" ? "#22c55e"
                                        : alert.alert_type === "PRICE_BELOW" ? "#ef4444"
                                            : "#f97316"
                                const isDeleting = deleting.has(alert.id)
                                const isToggling = toggling.has(alert.id)
                                return (
                                    <tr key={alert.id}>
                                        <td className="alerts-page__symbol">
                                            <a href={`/stocks/${alert.symbol}`}>{alert.symbol}</a>
                                        </td>
                                        <td>{alert.company_name}</td>
                                        <td>
                                            <span className="alerts-page__type-badge" style={{ borderColor: alertColor, color: alertColor }}>
                                                {alert.alert_type === "PRICE_ABOVE" ? "↑ Above" : alert.alert_type === "PRICE_BELOW" ? "↓ Below" : "● Volume"}
                                            </span>
                                        </td>
                                        <td className="alerts-page__numeric">{alert.threshold.toLocaleString()}</td>
                                        <td>
                                            <Badge
                                                variant={
                                                    alert.status === "ACTIVE" ? "default"
                                                        : alert.status === "TRIGGERED" ? "destructive"
                                                            : "outline"
                                                }
                                                className="alerts-page__status-badge"
                                            >
                                                {alert.status}
                                            </Badge>
                                        </td>
                                        <td className="alerts-page__numeric">
                                            {alert.latest_price?.close_price?.toLocaleString() ?? "--"}
                                        </td>
                                        <td>
                                            {alert.triggered_at
                                                ? `${formatDate(alert.triggered_at)}${alert.triggered_value ? ` (${alert.triggered_value.toLocaleString()})` : ""}`
                                                : "--"}
                                        </td>
                                        <td>
                                            <div className="alerts-page__actions">
                                                {(isToggling || isDeleting) ? (
                                                    <Loader2 className="size-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="alerts-page__action-btn"
                                                            title={alert.status === "DISABLED" ? "Enable" : "Disable"}
                                                            onClick={() => void handleToggle(alert)}
                                                        >
                                                            {alert.status === "DISABLED" ? (
                                                                <ToggleLeft className="size-4 text-slate-500" />
                                                            ) : (
                                                                <ToggleRight className="size-4 text-green-400" />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="alerts-page__action-btn"
                                                            title="Edit"
                                                            onClick={() => {
                                                                setEditingAlert(alert)
                                                                setShowCreateModal(true)
                                                            }}
                                                        >
                                                            <Edit3 className="size-4 text-slate-400" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="alerts-page__action-btn"
                                                            title="Delete"
                                                            onClick={() => void handleDelete(alert.id)}
                                                        >
                                                            <Trash2 className="size-4 text-red-400" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreateModal && (
                <CreateAlertModal
                    open={showCreateModal}
                    onOpenChange={(v) => { setShowCreateModal(v); if (!v) setEditingAlert(null) }}
                    watchlistSymbols={watchlistSymbols}
                    editingAlert={editingAlert}
                    onAlertCreated={() => {
                        setEditingAlert(null)
                        void load()
                    }}
                />
            )}
        </div>
    )
}
