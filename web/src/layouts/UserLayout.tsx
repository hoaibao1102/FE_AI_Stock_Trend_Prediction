import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react"
import {
    Briefcase,
    History,
    LayoutDashboard,
    Menu,
    Settings,
    ShieldAlert,
    Sparkles,
    TableProperties,
} from "lucide-react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
    TopbarBrand,
    TopbarNotifications,
    TopbarScopeBadges,
    TopbarSearch,
    TopbarUserMenu,
} from "@/components/topbar"
import { buildTopbarAccountActions } from "@/components/topbar/account-actions"
import { cn } from "@/lib/utils"
import { getDefaultHomeRouteByRole } from "@/lib/role-routes"
import { useAuth } from "@/providers/AuthProvider"
import "./user-layout.css"

type ShellData = {
    productName: string
    activeSymbol: string
    activeMarket: string
    activeUniverse: string
    marketStatus: string
    source: string
    verified: boolean
    completeness: string
    lastCrawl: string
}

type LayoutProps = {
    shellData?: Partial<ShellData>
    basePath?: string
    children?: ReactNode
}

type NavItem = {
    label: string
    path: string
    icon: ComponentType<{ className?: string }>
    end?: boolean
}

const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", path: "", icon: LayoutDashboard },
    { label: "Stock List", path: "stock-list", icon: TableProperties },
    { label: "AI phân tích cổ phiếu", path: "stock-analysis", icon: Sparkles, end: true },
    { label: "Lịch sử báo cáo AI", path: "stock-analysis/history", icon: History },
    { label: "Watchlist & Portfolio", path: "watchlist", icon: Briefcase },
    { label: "Alerts", path: "alerts", icon: ShieldAlert },
    // { label: "Comparison", path: "comparison", icon: Scale },
    { label: "Settings", path: "settings", icon: Settings },
]

const DEFAULT_SHELL_DATA: ShellData = {
    productName: "AI Stock Trend",
    activeSymbol: "FPT",
    activeMarket: "HOSE",
    activeUniverse: "VN30",
    marketStatus: "Market Open",
    source: "--",
    verified: false,
    completeness: "--",
    lastCrawl: "--",
}

function toPlaceholder(value?: string) {
    return value?.trim() ? value : "--"
}

function AvatarInitials({ name }: { name?: string | null }) {
    const initials = useMemo(() => {
        if (!name) return "--"
        const parts = name
            .trim()
            .split(/\s+/)
            .filter(Boolean)
        if (!parts.length) return "--"
        return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")
    }, [name])

    return <span>{initials}</span>
}

export default function UserLayout({ shellData, basePath = "/staff", children }: LayoutProps) {
    const navigate = useNavigate()
    const auth = useAuth()
    const [searchQuery, setSearchQuery] = useState("")
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isSigningOut, setIsSigningOut] = useState(false)
    const sidebarRef = useRef<HTMLElement | null>(null)
    const notificationsRef = useRef<HTMLDivElement | null>(null)
    const profileRef = useRef<HTMLDivElement | null>(null)

    const data = { ...DEFAULT_SHELL_DATA, ...shellData }

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node
            if (sidebarRef.current && !sidebarRef.current.contains(target)) {
                setIsMobileNavOpen(false)
            }
            if (notificationsRef.current && !notificationsRef.current.contains(target)) {
                setIsNotificationsOpen(false)
            }
            if (profileRef.current && !profileRef.current.contains(target)) {
                setIsProfileOpen(false)
            }
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsMobileNavOpen(false)
                setIsNotificationsOpen(false)
                setIsProfileOpen(false)
            }
        }

        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleEscape)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleEscape)
        }
    }, [])

    const marketPills = [
        toPlaceholder(data.activeSymbol),
        toPlaceholder(data.activeMarket),
        toPlaceholder(data.activeUniverse),
    ]

    const normalizedBasePath = basePath === "" ? "" : (basePath.replace(/\/$/, "") || "/staff")
    const routeFor = (suffix: string) => {
        if (!suffix) return normalizedBasePath || "/dashboard"
        return normalizedBasePath ? `${normalizedBasePath}/${suffix}` : `/${suffix}`
    }

    const statusText = data.marketStatus?.trim() ? data.marketStatus : "--"

    return (
        <div className="terminal-shell">
            <header className="terminal-shell__topbar">
                <div className="terminal-shell__topbar-left">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="terminal-shell__menu-button md:hidden"
                        aria-label="Open navigation menu"
                        aria-expanded={isMobileNavOpen}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => setIsMobileNavOpen((prev) => !prev)}
                    >
                        <Menu className="size-4" />
                    </Button>

                    <div className="terminal-shell__brand-group">
                        <TopbarBrand
                            text={data.productName}
                            onClick={() => navigate(getDefaultHomeRouteByRole(auth.user?.role))}
                            classNamePrefix="terminal-shell"
                        />
                        <TopbarScopeBadges
                            values={marketPills}
                            marketStatus={statusText}
                            isStatusMuted={statusText === "--"}
                            onValueClick={(value, index) => {
                                if (index === 0 && value !== "--") {
                                    navigate(`/stocks/${encodeURIComponent(value)}`)
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="terminal-shell__topbar-right">
                    <TopbarSearch value={searchQuery} onChange={setSearchQuery} />

                    <TopbarNotifications
                        rootRef={notificationsRef}
                        isOpen={isNotificationsOpen}
                        onToggle={() => setIsNotificationsOpen((prev) => !prev)}
                    />

                    <TopbarUserMenu
                        rootRef={profileRef}
                        isOpen={isProfileOpen}
                        onToggle={() => setIsProfileOpen((prev) => !prev)}
                        avatar={<AvatarInitials name={auth.user?.full_name} />}
                        fullName={auth.user?.full_name}
                        email={auth.user?.email}
                        actions={buildTopbarAccountActions({
                            role: auth.user?.role,
                            navigate,
                            signOut: auth.signOut,
                            onBeforeSignOut: () => setIsSigningOut(true),
                            settingsLabel: "Preferences",
                        }).map((action) =>
                            action.label === "Sign out" ? { ...action, disabled: isSigningOut } : action
                        )}
                    />
                </div>
            </header>

            <aside
                ref={sidebarRef}
                className={cn(
                    "terminal-shell__sidebar",
                    isMobileNavOpen && "is-open"
                )}
                aria-label="Primary navigation"
            >

                <nav className="terminal-shell__nav">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon
                        return (
                            <NavLink
                                key={item.path}
                                to={routeFor(item.path)}
                                end={item.end ?? !item.path}
                                className={({ isActive }) =>
                                    cn(
                                        "terminal-shell__nav-item",
                                        isActive && "is-active"
                                    )
                                }
                                onClick={() => setIsMobileNavOpen(false)}
                            >
                                <Icon className="terminal-shell__nav-icon" />
                                <span>{item.label}</span>
                            </NavLink>
                        )
                    })}
                </nav>

            </aside>

            {isMobileNavOpen ? (
                <button
                    type="button"
                    className="terminal-shell__overlay md:hidden"
                    aria-label="Close navigation menu"
                    onClick={() => setIsMobileNavOpen(false)}
                />
            ) : null}

            <main className="terminal-shell__main">
                <div className="terminal-shell__workspace">
                    {children ?? <Outlet />}
                </div>
            </main>

            <footer className="terminal-shell__statusbar">
                <span>Source: {toPlaceholder(data.source)}</span>
                <span>
                    {data.verified ? (
                        <span className="terminal-shell__verified">
                            <span className="terminal-shell__verified-dot" aria-hidden="true" />
                            Verified
                        </span>
                    ) : (
                        "--"
                    )}
                </span>
                <span>Completeness: {toPlaceholder(data.completeness)}</span>
                <span>Last Crawl: {toPlaceholder(data.lastCrawl)}</span>
                <a href="#" className="terminal-shell__status-link">
                    API Docs
                </a>
            </footer>
        </div>
    )
}
