import { useEffect, useState } from "react"
import { Loader2, PlusCircle, MinusCircle } from "lucide-react"
import { toast } from "sonner"

import {
    formatAverageCost,
    formatDate,
    formatMoney,
    formatNumber,
    formatPrice,
} from "@/components/holdings/holdings-format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    getHoldingTransactions,
    HoldingsServiceError,
    recordTransaction,
} from "@/services/holdings.service"
import { TableEmpty, TableLoading } from "@/shared/components"
import type { HoldingItem, HoldingTransactionItem, TransactionType } from "@/types/holdings"

type TransactionFormState = {
    trade_date: string
    quantity: string
    price: string
    fee: string
    tax: string
    note: string
}

const EMPTY_FORM: TransactionFormState = {
    trade_date: "",
    quantity: "",
    price: "",
    fee: "0",
    tax: "0",
    note: "",
}

function getYesterdayLabel() {
    const now = new Date()
    const vietnamNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    vietnamNow.setDate(vietnamNow.getDate() - 1)
    return vietnamNow.toISOString().slice(0, 10)
}

function getFriendlyError(error: unknown, fallback: string) {
    if (error instanceof HoldingsServiceError) {
        if (error.code === "INSUFFICIENT_QUANTITY") {
            return "Sell quantity exceeds your current holding."
        }
        return error.message || fallback
    }
    return error instanceof Error ? error.message : fallback
}

type HoldingTransactionsSectionProps = {
    symbol: string
    holding: HoldingItem | null
    latestMarketPrice?: number | null
    onHoldingChange: () => Promise<void> | void
}

export default function HoldingTransactionsSection({
    symbol,
    holding,
    latestMarketPrice,
    onHoldingChange,
}: HoldingTransactionsSectionProps) {
    const [activeType, setActiveType] = useState<TransactionType>("BUY")
    const [form, setForm] = useState<TransactionFormState>({ ...EMPTY_FORM, trade_date: getYesterdayLabel() })
    const [transactions, setTransactions] = useState<HoldingTransactionItem[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const maxTradeDate = getYesterdayLabel()

    const loadTransactions = async () => {
        if (!symbol) return

        setIsLoadingHistory(true)
        try {
            const result = await getHoldingTransactions(symbol, { limit: 50 })
            setTransactions(result.items)
        } catch {
            setTransactions([])
        } finally {
            setIsLoadingHistory(false)
        }
    }

    useEffect(() => {
        void loadTransactions()
    }, [symbol, holding?.holding_id, holding?.quantity])

    const handleChange = (field: keyof TransactionFormState, value: string) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!symbol) return

        if (form.trade_date > maxTradeDate) {
            toast.error("Invalid trade date", {
                description: "Trade date must be a past date before today.",
            })
            return
        }

        if (activeType === "SELL" && holding && Number(form.quantity) > holding.quantity) {
            toast.error("Insufficient quantity", {
                description: `You can sell at most ${formatNumber(holding.quantity)} shares.`,
            })
            return
        }

        setIsSubmitting(true)
        try {
            await recordTransaction(symbol, {
                transaction_type: activeType,
                trade_date: form.trade_date,
                quantity: Number(form.quantity),
                price: Number(form.price),
                fee: form.fee.trim() === "" ? 0 : Number(form.fee),
                tax: form.tax.trim() === "" ? 0 : Number(form.tax),
                note: form.note.trim() || undefined,
            })

            toast.success(activeType === "BUY" ? "Buy recorded" : "Sell recorded", {
                description: `${symbol} position has been updated.`,
            })

            setForm({ ...EMPTY_FORM, trade_date: getYesterdayLabel() })
            await Promise.all([loadTransactions(), onHoldingChange()])
        } catch (error) {
            toast.error("Unable to record transaction", {
                description: getFriendlyError(error, "Please review the entered values and try again."),
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <section className="stock-holding-page__section">
                <div className="stock-holding-page__section-header">
                    <div>
                        <h2>Record Transaction</h2>
                        <p>
                            Mua thêm sẽ cộng dồn số lượng và tính lại giá vốn trung bình. Bán sẽ trừ số lượng và
                            giữ nguyên giá vốn.
                        </p>
                    </div>
                </div>

                <div className="stock-holding-page__txn-tabs">
                    <button
                        type="button"
                        className={`stock-holding-page__txn-tab ${activeType === "BUY" ? "is-active" : ""}`}
                        onClick={() => setActiveType("BUY")}
                    >
                        <PlusCircle className="mr-1.5 size-4" />
                        Buy
                    </button>
                    <button
                        type="button"
                        className={`stock-holding-page__txn-tab ${activeType === "SELL" ? "is-active" : ""}`}
                        onClick={() => setActiveType("SELL")}
                        disabled={!holding}
                    >
                        <MinusCircle className="mr-1.5 size-4" />
                        Sell
                    </button>
                </div>

                {activeType === "SELL" && holding ? (
                    <div className="stock-holding-page__holding-banner">
                        Available to sell: <strong>{formatNumber(holding.quantity)}</strong> shares at avg cost{" "}
                        {formatAverageCost(holding.average_cost)}.
                    </div>
                ) : null}

                <form className="stock-holding-page__form" onSubmit={handleSubmit}>
                    <div className="stock-holding-page__form-grid">
                        <div className="stock-holding-page__field">
                            <label htmlFor="trade_date">Trade Date</label>
                            <Input
                                id="trade_date"
                                type="date"
                                value={form.trade_date}
                                max={maxTradeDate}
                                onChange={(event) => handleChange("trade_date", event.target.value)}
                                required
                            />
                        </div>

                        <div className="stock-holding-page__field">
                            <label htmlFor="txn_quantity">Quantity</label>
                            <Input
                                id="txn_quantity"
                                type="number"
                                min="1"
                                step="1"
                                value={form.quantity}
                                onChange={(event) => handleChange("quantity", event.target.value)}
                                placeholder="e.g. 100"
                                required
                            />
                        </div>

                        <div className="stock-holding-page__field">
                            <label htmlFor="txn_price">Price</label>
                            <Input
                                id="txn_price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={(event) => handleChange("price", event.target.value)}
                                placeholder={latestMarketPrice ? String(latestMarketPrice) : "e.g. 25000"}
                                required
                            />
                        </div>

                        <div className="stock-holding-page__field">
                            <label htmlFor="txn_fee">Fee</label>
                            <Input
                                id="txn_fee"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.fee}
                                onChange={(event) => handleChange("fee", event.target.value)}
                            />
                        </div>

                        <div className="stock-holding-page__field">
                            <label htmlFor="txn_tax">Tax</label>
                            <Input
                                id="txn_tax"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.tax}
                                onChange={(event) => handleChange("tax", event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="stock-holding-page__field">
                        <label htmlFor="txn_note">Note</label>
                        <textarea
                            id="txn_note"
                            className="stock-holding-page__textarea"
                            value={form.note}
                            onChange={(event) => handleChange("note", event.target.value)}
                            placeholder="Optional note about this transaction"
                            rows={3}
                        />
                    </div>

                    <div className="stock-holding-page__actions">
                        <div className="stock-holding-page__hint">
                            Latest market price: {formatPrice(latestMarketPrice)}
                        </div>
                        <Button type="submit" disabled={isSubmitting || (activeType === "SELL" && !holding)}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                                    Saving...
                                </>
                            ) : activeType === "BUY" ? (
                                "Record Buy"
                            ) : (
                                "Record Sell"
                            )}
                        </Button>
                    </div>
                </form>
            </section>

            <section className="stock-holding-page__section">
                <div className="stock-holding-page__section-header">
                    <div>
                        <h2>Transaction History</h2>
                        <p>All buy and sell records for this stock.</p>
                    </div>
                </div>

                {isLoadingHistory ? (
                    <TableLoading />
                ) : transactions.length === 0 ? (
                    <TableEmpty message="No transactions recorded yet." />
                ) : (
                    <div className="stock-holding-page__table-wrap">
                        <table className="stock-holding-page__table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Fee</th>
                                    <th>Total</th>
                                    <th>Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => {
                                    const total = txn.quantity * txn.price + (txn.fee || 0) + (txn.tax || 0)
                                    return (
                                        <tr key={txn.transaction_id}>
                                            <td>{formatDate(txn.trade_date, "date")}</td>
                                            <td>
                                                <span
                                                    className={
                                                        txn.transaction_type === "BUY"
                                                            ? "stock-holding-page__txn-buy"
                                                            : "stock-holding-page__txn-sell"
                                                    }
                                                >
                                                    {txn.transaction_type}
                                                </span>
                                            </td>
                                            <td>{formatNumber(txn.quantity)}</td>
                                            <td>{formatPrice(txn.price)}</td>
                                            <td>{formatMoney(txn.fee)}</td>
                                            <td>{formatMoney(total)}</td>
                                            <td>{txn.note || "--"}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    )
}
