import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File as FileIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
    onUpload: (files: File[]) => Promise<void>
    className?: string
}

export function FileUpload({ onUpload, className }: FileUploadProps) {
    const [uploading, setUploading] = useState(false)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return

        setUploading(true)
        try {
            await onUpload(acceptedFiles)
        } catch (error) {
            console.error("Upload failed", error)
        } finally {
            setUploading(false)
        }
    }, [onUpload])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true
    })

    return (
        <div
            {...getRootProps()}
            className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                uploading && "opacity-50 cursor-default pointer-events-none",
                className
            )}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-background rounded-full border shadow-sm">
                    {uploading ? (
                        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Upload className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
                <div className="text-sm text-muted-foreground">
                    {isDragActive ? (
                        <p className="font-medium text-primary">Solte os arquivos aqui...</p>
                    ) : (
                        <p>
                            <span className="font-semibold text-foreground">Clique para enviar</span> ou arraste e solte
                            <br />
                            <span className="text-xs">Imagens, PDF, Docs (max 50MB)</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
