import { FileIcon, Trash2, Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes } from '@/lib/utils'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'


export type Attachment = {
    id: string
    fileName: string
    fileType: string
    fileSize: number
    url?: string
    createdAt: string
    uploadedBy: string
}

interface AttachmentListProps {
    attachments: Attachment[]
    onDelete: (id: string) => void
    isDeleting: string | null // ID of file being deleted
    readonly?: boolean
}

export function AttachmentList({ attachments, onDelete, isDeleting, readonly = false }: AttachmentListProps) {
    if (attachments.length === 0) {
        return (
            <div className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                Nenhum anexo encontrado.
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Lista de Anexos">
            {attachments.map((file) => {
                const isImage = file.fileType.startsWith('image/')
                return (
                    <Card key={file.id} className="group relative overflow-hidden">
                        <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 shrink-0 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                                    {isImage && file.url ? (
                                        <img src={file.url} alt={file.fileName} className="h-full w-full object-cover" loading="lazy" />
                                    ) : (
                                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate" title={file.fileName}>
                                        {file.fileName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatBytes(file.fileSize)}
                                        <span className="mx-1">•</span>
                                        {new Date(file.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="absolute top-2 right-2 flex gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm">
                                {isImage && file.url && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                                            <img src={file.url} alt={file.fileName} className="w-full h-auto rounded-lg" loading="lazy" />
                                        </DialogContent>
                                    </Dialog>
                                )}

                                {file.url && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" download>
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}

                                {!readonly && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => onDelete(file.id)}
                                        disabled={isDeleting === file.id}
                                    >
                                        {isDeleting === file.id ? (
                                            <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
