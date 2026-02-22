import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface ExportDropdownProps {
    projectId: string
    entity: string
    formats?: ('xlsx' | 'csv' | 'pdf')[]
    label?: string
}

export function ExportDropdown({
    projectId,
    entity,
    formats = ['xlsx', 'csv'],
    label = 'Exportar',
}: ExportDropdownProps) {
    const [loading, setLoading] = useState<string | null>(null)

    const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
        setLoading(format)
        try {
            const res = await fetch('/api/file-processor/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entity, projectId, format, sync: true }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
                throw new Error(err.error || `HTTP ${res.status}`)
            }

            const blob = await res.blob()
            const disposition = res.headers.get('Content-Disposition') || ''
            const fileNameMatch = disposition.match(/filename="?([^"]+)"?/)
            const fileName = fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : `export.${format}`

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast.success('Arquivo exportado com sucesso!')
        } catch (err) {
            toast.error(`Erro ao exportar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
        } finally {
            setLoading(null)
        }
    }

    const formatLabels: Record<string, { label: string; icon: typeof FileSpreadsheet }> = {
        xlsx: { label: 'Excel (.xlsx)', icon: FileSpreadsheet },
        csv: { label: 'CSV (.csv)', icon: FileText },
        pdf: { label: 'PDF (.pdf)', icon: FileText },
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!!loading} className="cursor-pointer">
                    {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                    {label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {formats.map((format) => {
                    const { label: formatLabel, icon: Icon } = formatLabels[format]
                    return (
                        <DropdownMenuItem key={format} onClick={() => handleExport(format)} disabled={!!loading} className="cursor-pointer">
                            <Icon className="h-4 w-4 mr-2" />
                            {formatLabel}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
