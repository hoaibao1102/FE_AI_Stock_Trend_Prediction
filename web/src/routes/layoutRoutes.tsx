import type { ReactElement } from "react"
import { Navigate } from "react-router-dom"

import AdminShell from "@/pages/Admin"
import AdminUserManagement from "@/pages/Admin/AdminUserManagement/AdminUserManagement"
import AdminStaffManagement from "@/pages/Admin/StaffManagement/AdminStaffManagement"
import AdminStockList from "@/pages/Admin/StockManagement/AdminStockList"
import AlertsPage from "@/pages/AlertsPage"
import AiReportHistoryPage from "@/pages/AiReportHistoryPage"
import ComparisonPage from "@/pages/ComparisonPage"
import SettingsPage from "@/pages/SettingsPage"
import StockAnalysisPage from "@/pages/StockAnalysisPage"
import StockDetailPage from "@/pages/StockDetailPage/StockDetailPage"
import StockHoldingDetailPage from "@/pages/StockHoldingDetailPage/StockHoldingDetailPage"
import StockListPage from "@/pages/StockListPage/StockListPage"
import UserDashboard from "@/pages/UserDashboard/UserDashboard"
import WatchlistPage from "@/pages/WatchlistPage/WatchList"
import UserProfilePage from "@/pages/UserProfilePage/UserProfilePage"
import CrawlJobsPage from "@/pages/CrawlJobsPage"
import StaffDashboardPage from "@/pages/StaffDashboardPage"
import DataSourcesPage from "@/pages/DataSourcesPage/DataSourcesPage"
import CrawlLogsPage from "@/pages/CrawlLogsPage"
import EtlMonitorPage from "@/pages/EtlMonitorPage/EtlMonitorPage"
import DataValidationPage from "@/pages/DataValidationPage"
import ImportHistoryPage from "@/pages/ImportHistoryPage"
import StockDataMonitorPage from "@/pages/StockDataMonitorPage"
import AdminSubscriptionManagement from "@/pages/Admin/SubscriptionManagement/AdminSubscriptionManagement"
import AdminSubscriptionDetail from "@/pages/Admin/SubscriptionDetail/AdminSubscriptionDetail"
import SubscriptionStats from "@/pages/Admin/SubscriptionStats/SubscriptionStats"
import TransactionLog from "@/pages/Admin/TransactionLog/TransactionLog"
import StaffSubscriptionManagement from "@/pages/Staff/StaffSubscriptionManagement/StaffSubscriptionManagement"
import StaffSubscriptionDetail from "@/pages/Staff/StaffSubscriptionManagement/StaffSubscriptionDetail"
import UpgradePage from "@/pages/UpgradePage/UpgradePage"

export type LayoutRoute = {
    path: string
    element: ReactElement
}

export const USER_ROUTES: LayoutRoute[] = [
    { path: "/dashboard", element: <UserDashboard /> },
    { path: "/profile", element: <UserProfilePage /> },
    { path: "/stocks", element: <StockDetailPage /> },
    { path: "/stocks/:symbol", element: <StockDetailPage /> },
    { path: "/stock-list", element: <StockListPage /> },
    { path: "/stock-analysis", element: <StockAnalysisPage /> },
    { path: "/stock-analysis/history", element: <AiReportHistoryPage /> },
    { path: "/stock-analysis/history/:historyId", element: <AiReportHistoryPage /> },
    { path: "/watchlist", element: <WatchlistPage /> },
    { path: "/watchlist/:symbol/holding", element: <StockHoldingDetailPage /> },
    { path: "/alerts", element: <AlertsPage /> },
    { path: "/comparison", element: <ComparisonPage /> },
    { path: "/settings", element: <SettingsPage /> },
    { path: "/upgrade", element: <UpgradePage /> },
]

export const STAFF_ROUTES: LayoutRoute[] = [
    { path: "/staff", element: <Navigate to="/staff/crawl-jobs" replace /> },
    { path: "/staff/dashboard", element: <StaffDashboardPage /> },
    { path: "/staff/profile", element: <UserProfilePage /> },
    { path: "/staff/data-sources", element: <DataSourcesPage /> },
    { path: "/staff/crawl-jobs", element: <CrawlJobsPage /> },
    { path: "/staff/crawl-logs", element: <CrawlLogsPage /> },
    { path: "/staff/etl-monitor", element: <EtlMonitorPage /> },
    { path: "/staff/data-validation", element: <DataValidationPage /> },
    { path: "/staff/import-history", element: <ImportHistoryPage /> },
    { path: "/staff/stock-data-monitor", element: <StockDataMonitorPage /> },
    { path: "/staff/settings", element: <SettingsPage /> },
    { path: "/staff/subscriptions", element: <StaffSubscriptionManagement /> },
    { path: "/staff/subscriptions/:userId", element: <StaffSubscriptionDetail /> },
]

export const ADMIN_ROUTES: LayoutRoute[] = [
    { path: "/admin/dashboard", element: <AdminShell /> },
    { path: "/admin/users", element: <AdminUserManagement /> },
    { path: "/admin/staff", element: <AdminStaffManagement /> },
    { path: "/admin/market-coverage", element: <AdminShell /> },
    { path: "/admin/alerts", element: <AdminShell /> },
    { path: "/admin/roles", element: <AdminShell /> },
    { path: "/admin/logs", element: <AdminShell /> },
    { path: "/admin/settings", element: <AdminShell /> },
    { path: "/admin/profile", element: <UserProfilePage /> },
    { path: "/admin/stocks", element: <AdminStockList /> },
    { path: "/admin/subscriptions", element: <AdminSubscriptionManagement /> },
    { path: "/admin/subscriptions/stats", element: <SubscriptionStats /> },
    { path: "/admin/subscriptions/transactions", element: <TransactionLog /> },
    { path: "/admin/subscriptions/:userId", element: <AdminSubscriptionDetail /> },
]
