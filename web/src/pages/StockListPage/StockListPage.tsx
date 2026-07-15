import { useEffect, useMemo, useState } from "react"
import { ArrowDownUp, Download, RefreshCw } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getStockList, type StockItem, type StockListMeta, type StockListQuery } from "@/services/stock.service"
import {
    SearchInput,
    StatusBadge,
    Breadcrumb,
    DataTablePagination,
    TableLoading,
    TableError,
    TableEmpty,
    TableNoMatch,
    placeholder,
} from "@/shared/components"
import "./StockListPage.css"

type SortKey = "symbol" | "companyName"
type SortDirection = "asc" | "desc"

type LoadState = {
    items: StockItem[]
    meta: StockListMeta
    isLoading: boolean
    error: string | null
}

const DEFAULT_QUERY: StockListQuery = {
    page: 1,
    limit: 400,
    market: "HOSE",
}

const LOCAL_PAGE_SIZE_OPTIONS = [20, 25, 50]

function downloadCsv(rows: StockItem[]) {
    const header = ["Symbol", "Company Name", "Market", "Status"]
    const csvRows = rows.map((item) => [
        item.symbol,
        item.companyName ?? "",
        item.market ?? "",
        item.status ?? "",
    ])
    const csv = [header, ...csvRows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "stock-list.csv"
    link.click()
    URL.revokeObjectURL(url)
}

export default function StockListPage() {
    const navigate = useNavigate()
    const [query, setQuery] = useState<StockListQuery>(DEFAULT_QUERY)
    const [state, setState] = useState<LoadState>({
        items: [],
        meta: {},
        isLoading: true,
        error: null,
    })
    const [searchText, setSearchText] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [sortKey, setSortKey] = useState<SortKey>("symbol")
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
    const [tablePage, setTablePage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(25)

    const activeMarketLabel = useMemo(() => {
        const marketValues = Array.from(new Set(
            state.items
                .map((item) => item.market?.trim().toUpperCase())
                .filter((market): market is string => Boolean(market)),
        ))

        if (marketValues.length === 1) return marketValues[0]
        return query.market?.trim().toUpperCase() || "Selected"
    }, [query.market, state.items])

    useEffect(() => {
        let isMounted = true

        async function load() {
            setState((current) => ({ ...current, isLoading: true, error: null }))
            try {
                const result = await getStockList(query)
                if (!isMounted) return
                setState({
                    items: result.items,
                    meta: result.meta,
                    isLoading: false,
                    error: null,
                })
            } catch (error) {
                if (!isMounted) return
                setState((current) => ({
                    ...current,
                    isLoading: false,
                    error: error instanceof Error ? error.message : "Unable to load stock list",
                }))
            }
        }

        void load()

        return () => {
            isMounted = false
        }
    }, [query])

    const endpoint = `/api/stocks?page=${query.page}&limit=${query.limit}&market=${query.market}`

    const statuses = useMemo(() => {
        const values = new Set<string>()
        state.items.forEach((item) => {
            if (item.status) values.add(item.status)
        })
        return Array.from(values).sort((a, b) => a.localeCompare(b))
    }, [state.items])

    const filteredItems = useMemo(() => {
        const search = searchText.trim().toLowerCase()
        return state.items.filter((item) => {
            const matchesSearch = !search
                || item.symbol.toLowerCase().includes(search)
                || item.companyName?.toLowerCase().includes(search)
            const matchesStatus = statusFilter === "all" || item.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [searchText, state.items, statusFilter])

    const sortedItems = useMemo(() => {
        const direction = sortDirection === "asc" ? 1 : -1
        return [...filteredItems].sort((left, right) => {
            const getValue = (item: StockItem) => {
                switch (sortKey) {
                    case "symbol":
                        return item.symbol
                    case "companyName":
                        return item.companyName ?? ""
                }
            }

            const leftValue = getValue(left)
            const rightValue = getValue(right)
            return leftValue.localeCompare(rightValue) * direction
        })
    }, [filteredItems, sortDirection, sortKey])

    const totalPages = Math.max(1, Math.ceil(sortedItems.length / rowsPerPage))

    useEffect(() => {
        setTablePage(1)
    }, [searchText, sortDirection, sortKey, statusFilter, rowsPerPage])

    useEffect(() => {
        if (tablePage > totalPages) setTablePage(totalPages)
    }, [tablePage, totalPages])

    const paginatedItems = useMemo(() => {
        const start = (tablePage - 1) * rowsPerPage
        return sortedItems.slice(start, start + rowsPerPage)
    }, [rowsPerPage, sortedItems, tablePage])

    const handleSort = (nextKey: SortKey) => {
        if (nextKey === sortKey) {
            setSortDirection((current) => current === "asc" ? "desc" : "asc")
            return
        }

        setSortKey(nextKey)
        setSortDirection("asc")
    }

    const clearFilters = () => {
        setSearchText("")
        setStatusFilter("all")
    }

    const handleMarketChange = (market: string) => {
        setQuery((current) => ({ ...current, market, page: 1 }))
        setStatusFilter("all")
        setTablePage(1)
    }

    const handleNavigateToStock = (symbol: string) => {
        navigate(`/stocks/${encodeURIComponent(symbol)}`)
    }

    return (
        <div className="stock-list">
            <Breadcrumb items={["Home", "Stock List"]} />

            <section className="stock-list__header">
                <div>
                    <h1>Stock List</h1>
                    <p>Browse {activeMarketLabel}-listed stocks</p>
                </div>
                <div className="stock-list__header-status">
                    <span><strong>Market</strong>{activeMarketLabel}</span>
                    <span><strong>Total stocks</strong>{state.meta.total ?? state.items.length ?? "--"}</span>
                </div>
            </section>

            <section className="stock-list__controls">
                <SearchInput value={searchText} onChange={setSearchText} />

                <select
                    value={query.market}
                    className="stock-list__select"
                    onChange={(event) => handleMarketChange(event.target.value)}
                >
                    {["HOSE", "HNX", "UPCOM"].map((market) => (
                        <option key={market} value={market}>{market}</option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    className="stock-list__select"
                    onChange={(event) => setStatusFilter(event.target.value)}
                >
                    <option value="all">All statuses</option>
                    {statuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>

                <div className="stock-list__actions">
                    <Button type="button" variant="outline" size="sm" onClick={() => setQuery((current) => ({ ...current }))}>
                        <RefreshCw className="size-3.5" /> Refresh
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => downloadCsv(sortedItems)} disabled={!sortedItems.length}>
                        <Download className="size-3.5" /> Export
                    </Button>
                </div>
            </section>

            <section className="stock-list__table-card">
                <div className="stock-list__table-header">
                    <div>
                        <h2>{activeMarketLabel} Stock Universe</h2>
                        <p>{sortedItems.length} filtered rows from {state.items.length} fetched records</p>
                    </div>
                    <div className="stock-list__pagination">
                        <select
                            value={rowsPerPage}
                            className="stock-list__select stock-list__select--compact"
                            onChange={(event) => setRowsPerPage(Number(event.target.value))}
                        >
                            {LOCAL_PAGE_SIZE_OPTIONS.map((size) => (
                                <option key={size} value={size}>{size} / page</option>
                            ))}
                        </select>
                    </div>
                </div>

                {state.isLoading ? (
                    <TableLoading />
                ) : state.error ? (
                    <TableError message={state.error} endpoint={endpoint} onRetry={() => setQuery((current) => ({ ...current }))} />
                ) : !state.items.length ? (
                    <TableEmpty message="No stocks are available for the selected market." />
                ) : !sortedItems.length ? (
                    <TableNoMatch onClear={clearFilters} />
                ) : (
                    <>
                        <div className="stock-list__table-wrap">
                            <table className="stock-list__table">
                                <thead>
                                    <tr>
                                        {([
                                            ["Symbol", "symbol"],
                                            ["Company Name", "companyName"],
                                            ["Market", null],
                                            ["Status", null],
                                        ] as const).map(([label, key]) => (
                                            <th key={label}>
                                                {key ? (
                                                    <button
                                                        type="button"
                                                        className="stock-list__sort-button"
                                                        onClick={() => handleSort(key)}
                                                    >
                                                        {label}
                                                        <ArrowDownUp className="size-3" />
                                                    </button>
                                                ) : label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.map((item) => (
                                        <tr
                                            key={item.symbol}
                                            className="stock-list__table-row"
                                            onClick={() => handleNavigateToStock(item.symbol)}
                                        >
                                            <td className="stock-list__symbol-cell">{item.symbol}</td>
                                            <td>{placeholder(item.companyName)}</td>
                                            <td><Badge variant="outline">{placeholder(item.market)}</Badge></td>
                                            <td>
                                                <StatusBadge status={item.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <DataTablePagination
                            page={tablePage}
                            totalPages={totalPages}
                            from={(tablePage - 1) * rowsPerPage + 1}
                            to={Math.min(tablePage * rowsPerPage, sortedItems.length)}
                            total={sortedItems.length}
                            onPageChange={setTablePage}
                        />
                    </>
                )}
            </section>
        </div>
    )
}
