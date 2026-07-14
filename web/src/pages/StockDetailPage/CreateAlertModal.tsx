import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { createAlert, updateAlert, type AlertType, type AlertItem } from "@/services/alert.service"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    preSelectedSymbol?: string
    watchlistSymbols: string[]
    onAlertCreated: () => void
    editingAlert?: AlertItem | null
}

const ALERT_TYPES: { value: AlertType; label: string }[] = [
    { value: "PRICE_ABOVE", label: "Price Above" },
    { value: "PRICE_BELOW", label: "Price Below" },
    { value: "VOLUME_SPIKE", label: "Volume Spike" },
]

export default function CreateAlertModal({
    open,
    onOpenChange,
    preSelectedSymbol,
    watchlistSymbols,
    onAlertCreated,
    editingAlert,
}: Props) {
    const [symbol, setSymbol] = useState(preSelectedSymbol ?? "")
    const [alertType, setAlertType] = useState<AlertType>("PRICE_ABOVE")
    const [threshold, setThreshold] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const isEdit = !!editingAlert

    useEffect(() => {
        if (open) {
            if (editingAlert) {
                setSymbol(editingAlert.symbol)
                setAlertType(editingAlert.alert_type)
                setThreshold(String(editingAlert.threshold))
            } else {
                setSymbol(preSelectedSymbol ?? "")
                setAlertType("PRICE_ABOVE")
                setThreshold("")
            }
        }
    }, [open, editingAlert, preSelectedSymbol])

    const isValid = (preSelectedSymbol || symbol) && alertType && Number(threshold) > 0

    const handleSubmit = async () => {
        if (!isValid) return
        setSubmitting(true)
        try {
            if (isEdit && editingAlert) {
                await updateAlert(editingAlert.id, {
                    threshold: Number(threshold),
                })
                toast.success("Alert updated", {
                    description: `Threshold changed to ${Number(threshold).toLocaleString()}`,
                })
            } else {
                await createAlert({
                    symbol: preSelectedSymbol ?? symbol,
                    alert_type: alertType,
                    threshold: Number(threshold),
                })
                toast.success("Alert created", {
                    description: `${alertType.replace("_", " ")} alert set at ${Number(threshold).toLocaleString()}`,
                })
            }
            onOpenChange(false)
            onAlertCreated()
        } catch (err) {
            toast.error(isEdit ? "Failed to update alert" : "Failed to create alert", {
                description: err instanceof Error ? err.message : "An unexpected error occurred",
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Alert" : "Create Alert"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update the threshold for this alert." : "Set a price or volume threshold for this stock."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    {/* Symbol */}
                    <div className="grid gap-1.5">
                        <label className="text-sm text-[#94A3B8]">Stock</label>
                        {preSelectedSymbol || isEdit ? (
                            <div className="flex h-10 items-center rounded-md border border-[#334155] bg-[#1E293B] px-3 text-sm text-[#F8FAFC]">
                                {symbol}
                            </div>
                        ) : (
                            <select
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                className="h-10 w-full rounded-md border border-[#334155] bg-[#111827] px-3 text-sm text-[#F8FAFC] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40"
                            >
                                <option value="">Select a stock</option>
                                {watchlistSymbols.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Alert Type */}
                    <div className="grid gap-1.5">
                        <label className="text-sm text-[#94A3B8]">Alert Type</label>
                        {isEdit ? (
                            <div className="flex h-10 items-center rounded-md border border-[#334155] bg-[#1E293B] px-3 text-sm text-[#F8FAFC]">
                                {alertType === "PRICE_ABOVE" ? "Price Above" : alertType === "PRICE_BELOW" ? "Price Below" : "Volume Spike"}
                            </div>
                        ) : (
                            <select
                                value={alertType}
                                onChange={(e) => setAlertType(e.target.value as AlertType)}
                                className="h-10 w-full rounded-md border border-[#334155] bg-[#111827] px-3 text-sm text-[#F8FAFC] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40"
                            >
                                {ALERT_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Threshold */}
                    <div className="grid gap-1.5">
                        <label className="text-sm text-[#94A3B8]">Threshold</label>
                        <Input
                            type="number"
                            step="any"
                            min={0}
                            placeholder="e.g. 140000"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={!isValid || submitting}
                    >
                        {submitting && <Loader2 className="mr-1 size-4 animate-spin" />}
                        {isEdit ? "Save" : "Create Alert"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
