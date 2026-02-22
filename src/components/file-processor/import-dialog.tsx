import { useState, useCallback } from 'react'
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ImportDialogProps {
    projectId: string
    entity: 'tasks' | 'stakeholders'
    invalidateKeys: string[][]
    label?: string
}

export function ImportDialog({ projectId, entity, invalidateKeys, label = 'Importar' }: ImportDialogProps) {
    const queryClient = useQueryClient()
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) setFile(acceptedFiles[0])
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/csv': ['.csv'],
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024,
    })

    const handleImport = async () => {
        if (!file) return
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('entity', entity)
            formData.append('projectId', projectId)

            const res = await fetch('/api/file-processor/import', { method: 'POST', body: formData })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
                throw new Error(err.error || `HTTP ${res.status}`)
            }

            toast.success('Arquivo enviado! Processando importação...')
            setOpen(false)
            setFile(null)

            setTimeout(() => {
                for (const key of invalidateKeys) {
                    queryClient.invalidateQueries({ queryKey: key })
                }
            }, 3000)
        } catch (err) {
            toast.error(`Erro ao importar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFile(null) }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="cursor-pointer text-foreground">
                    <Upload className="h-4 w-4 mr-1" />
                    {label}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Importar {entity === 'tasks' ? 'Tarefas' : 'Stakeholders'}</DialogTitle>
                </DialogHeader>
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                >
                    <input {...getInputProps()} />
                    {file ? (
                        <div className="flex items-center justify-center gap-2">
                            <FileSpreadsheet className="h-8 w-8 text-primary" />
                            <div className="text-left">
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Arraste um arquivo .xlsx ou .csv aqui, ou clique para selecionar</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleImport} disabled={!file || uploading}>
                        {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Enviando...</> : 'Importar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
