import { Building2, ChevronDown, Check, Globe, Search, X } from "lucide-react"
import { useActiveOrg, type Organization } from "@/contexts/org-context"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect, useMemo } from "react"

interface OrgSwitcherProps {
    isSuperAdmin?: boolean
}

// Role label translations
const roleLabels: Record<string, string> = {
    viewer: 'Visualizador',
    gestor: 'Editor',
    secretario: 'Admin'
}

export function OrgSwitcher({ isSuperAdmin = false }: OrgSwitcherProps) {
    const { activeOrg, activeOrgId, organizations, isLoading, switchOrg } = useActiveOrg()
    const [isOpen, setIsOpen] = useState(false)
    const [isSwitching, setIsSwitching] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const dropdownRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setSearchQuery("") // Clear search when closing
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100)
        }
    }, [isOpen])

    // Filter organizations based on search query
    const filteredOrgs = useMemo(() => {
        if (!searchQuery.trim()) return organizations
        const query = searchQuery.toLowerCase()
        return organizations.filter(org =>
            org.name.toLowerCase().includes(query) ||
            org.code.toLowerCase().includes(query)
        )
    }, [organizations, searchQuery])

    const handleSwitch = async (orgId: string | null) => {
        if (orgId === activeOrgId) {
            setIsOpen(false)
            setSearchQuery("")
            return
        }

        setIsSwitching(true)
        try {
            await switchOrg(orgId)
        } catch (err) {
            console.error('Failed to switch org:', err)
            setIsSwitching(false)
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="px-3 py-2">
                <div className="h-10 bg-muted/50 rounded-md animate-pulse" />
            </div>
        )
    }

    // No organizations state (and not super admin)
    if (organizations.length === 0 && !isSuperAdmin) {
        return (
            <div className="px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                    <Building2 className="w-4 h-4" />
                    <span>Nenhuma secretaria vinculada</span>
                </div>
            </div>
        )
    }

    // Single organization (no switching needed) and not super admin
    if (organizations.length === 1 && !isSuperAdmin) {
        return (
            <div className="px-3 py-2">
                <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-md">
                    <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{organizations[0].name}</p>
                        <p className="text-xs text-muted-foreground">{organizations[0].code}</p>
                    </div>
                </div>
            </div>
        )
    }

    // Determine display text
    const isViewingAll = activeOrgId === null
    const showViewAllOption = isSuperAdmin || organizations.length > 1

    let displayName = activeOrg?.name || 'Selecione uma secretaria'
    let displayCode = activeOrg?.code

    if (isViewingAll) {
        if (isSuperAdmin) {
            displayName = "Todas as Secretarias"
            displayCode = "Modo Administrador"
        } else {
            displayName = "Minhas Secretarias"
            displayCode = "Visão Agregada"
        }
    }

    // Show search only when there are many orgs
    const showSearch = organizations.length > 5

    // Multiple organizations OR super admin - show switcher
    return (
        <div className="px-3 py-2" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isSwitching}
                className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-md border transition-all",
                    "hover:bg-accent hover:border-accent-foreground/20",
                    isOpen && "bg-accent border-accent-foreground/20",
                    isSwitching && "opacity-50 cursor-wait",
                    isViewingAll && "border-amber-300/50 bg-amber-50/50"
                )}
            >
                <div className={cn(
                    "w-8 h-8 rounded flex items-center justify-center shrink-0",
                    isViewingAll ? "bg-amber-100" : "bg-primary/10"
                )}>
                    {isViewingAll
                        ? <Globe className="w-4 h-4 text-amber-600" />
                        : <Building2 className="w-4 h-4 text-primary" />
                    }
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    {displayCode && (
                        <p className={cn(
                            "text-xs",
                            isViewingAll ? "text-amber-600" : "text-muted-foreground"
                        )}>{displayCode}</p>
                    )}
                </div>
                <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="mt-1 bg-card border rounded-md shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Search Input */}
                    {showSearch && (
                        <div className="p-2 border-b">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Buscar secretaria..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-8 py-1.5 text-sm bg-muted/50 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="py-1 max-h-64 overflow-y-auto">
                        {/* View All Option (Super Admin OR Multi-Org User) */}
                        {showViewAllOption && !searchQuery && (
                            <>
                                <p className="px-3 py-1.5 text-xs font-semibold text-amber-600 uppercase">
                                    {isSuperAdmin ? "Administrador" : "Geral"}
                                </p>
                                <button
                                    onClick={() => handleSwitch(null)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 text-left",
                                        "hover:bg-accent transition-colors",
                                        isViewingAll && "bg-amber-50"
                                    )}
                                >
                                    <div className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center shrink-0">
                                        <Globe className="w-3 h-3 text-amber-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {isSuperAdmin ? "Todas as Secretarias" : "Minhas Secretarias"}
                                        </p>
                                        <p className="text-xs text-amber-600">
                                            {isSuperAdmin
                                                ? "Ver dados de todas as organizações"
                                                : "Ver dados de todas as minhas organizações"
                                            }
                                        </p>
                                    </div>
                                    {isViewingAll && (
                                        <Check className="w-4 h-4 text-amber-600 shrink-0" />
                                    )}
                                </button>
                                <div className="mx-3 my-1 border-t" />
                            </>
                        )}

                        {/* Organization List */}
                        <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                            {searchQuery
                                ? `Resultados (${filteredOrgs.length})`
                                : showViewAllOption
                                    ? "Ou selecione uma secretaria"
                                    : "Suas Secretarias"
                            }
                        </p>

                        {filteredOrgs.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                <p>Nenhuma secretaria encontrada</p>
                                <p className="text-xs mt-1">Tente outro termo de busca</p>
                            </div>
                        ) : (
                            filteredOrgs.map((org) => (
                                <button
                                    key={org.id}
                                    onClick={() => handleSwitch(org.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 text-left",
                                        "hover:bg-accent transition-colors",
                                        org.id === activeOrgId && "bg-primary/5"
                                    )}
                                >
                                    <div className="w-6 h-6 bg-muted rounded flex items-center justify-center shrink-0">
                                        <Building2 className="w-3 h-3 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{org.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {org.code} • {roleLabels[org.role] || org.role}
                                        </p>
                                    </div>
                                    {org.id === activeOrgId && (
                                        <Check className="w-4 h-4 text-primary shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
