import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Coins, Receipt, Paperclip, Plus, Trash2, Save, Loader2, CalendarDays, FileText, DollarSign } from "lucide-react"
import { toast } from "sonner"
import { NotesSection } from "./notes-section"
import { FileUpload } from "@/components/ui/file-upload"
import { AttachmentList, type Attachment } from "@/components/attachments/attachment-list"
import { useUserRole } from "@/hooks/use-user-role"

interface CostViewProps {
    projectId: string
}

interface BudgetItem {
    id: string
    category: string
    budgetedValue: number
    spentValue: number
}

interface ExpenseRecord {
    id: string
    description: string
    value: number
    date: string
}

export default function CostView({ projectId }: CostViewProps) {
    const queryClient = useQueryClient()
    const [isDeletingAttachment, setIsDeletingAttachment] = useState<string | null>(null)
    const { isViewer } = useUserRole()

    // Budget State
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
    const [newCategory, setNewCategory] = useState("")
    const [newBudgetedValue, setNewBudgetedValue] = useState("")

    // Expense State
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
    const [newExpenseDesc, setNewExpenseDesc] = useState("")
    const [newExpenseValue, setNewExpenseValue] = useState("")
    const [newExpenseDate, setNewExpenseDate] = useState("")

    // Fetch cost data
    const { data: ka, isLoading } = useQuery({
        queryKey: ['ka-detail', projectId, 'custos'],
        queryFn: async () => {
            const res = await api['knowledge-areas'][':projectId'][':area'].$get({
                param: { projectId, area: 'custos' }
            })
            if (!res.ok) throw new Error()
            const data = await res.json()

            // Parse stored content
            if (data.content) {
                try {
                    const parsed = JSON.parse(data.content)
                    setBudgetItems(parsed.budgetItems || [])
                    setExpenses(parsed.expenses || [])
                } catch { }
            }
            return data
        }
    })

    // Attachments Query
    const { data: attachments = [], refetch: refetchAttachments } = useQuery({
        queryKey: ['attachments', ka?.id],
        queryFn: async () => {
            if (!ka?.id) return []
            const res = await api.storage[':entityId'].$get({ param: { entityId: ka.id } })
            if (!res.ok) return []
            return res.json() as Promise<Attachment[]>
        },
        enabled: !!ka?.id
    })

    // Save cost data
    const saveCostMutation = useMutation({
        mutationFn: async () => {
            const content = JSON.stringify({
                budgetItems,
                expenses
            })
            const res = await api['knowledge-areas'][':projectId'][':area'].$patch({
                param: { projectId, area: 'custos' },
                json: { content }
            })
            if (!res.ok) throw new Error()
        },
        onSuccess: () => {
            toast.success("Dados salvos com sucesso!")
            queryClient.invalidateQueries({ queryKey: ['ka-detail', projectId, 'custos'] })
        },
        onError: () => toast.error("Erro ao salvar")
    })

    // Calculate totals
    const totalBudget = budgetItems.reduce((sum, item) => sum + item.budgetedValue, 0)
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.value, 0)
    const available = totalBudget - totalSpent
    const spentPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

    // Add Budget Item
    const addBudgetItem = () => {
        if (!newCategory.trim()) {
            toast.error("Categoria é obrigatória")
            return
        }
        const value = parseFloat(newBudgetedValue) || 0
        const newItem: BudgetItem = {
            id: crypto.randomUUID(),
            category: newCategory,
            budgetedValue: value,
            spentValue: 0
        }
        setBudgetItems([...budgetItems, newItem])
        setNewCategory("")
        setNewBudgetedValue("")
    }

    // Add Expense
    const addExpense = () => {
        if (!newExpenseDesc.trim()) {
            toast.error("Descrição é obrigatória")
            return
        }
        const value = parseFloat(newExpenseValue) || 0
        const newExp: ExpenseRecord = {
            id: crypto.randomUUID(),
            description: newExpenseDesc,
            value: value,
            date: newExpenseDate || new Date().toISOString().split('T')[0]
        }
        setExpenses([...expenses, newExp])
        setNewExpenseDesc("")
        setNewExpenseValue("")
        setNewExpenseDate("")
    }

    const handleUpload = async (files: File[]) => {
        if (!ka?.id) return
        for (const file of files) {
            try {
                const initRes = await api.storage['presigned-url'].$post({
                    json: {
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        entityId: ka.id,
                        entityType: 'knowledge_area'
                    }
                })
                if (!initRes.ok) {
                    const data = await initRes.json().catch(() => ({ error: 'Erro ao obter URL de upload' }))
                    throw new Error((data as any).error || 'Erro ao obter URL de upload')
                }
                const { url, key } = await initRes.json()
                await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

                const confirmRes = await api.storage.confirm.$post({
                    json: { fileName: file.name, fileType: file.type, fileSize: file.size, key, entityId: ka.id, entityType: 'knowledge_area' }
                })
                if (!confirmRes.ok) {
                    const data = await confirmRes.json().catch(() => ({ error: 'Erro ao confirmar upload' }))
                    throw new Error((data as any).error || 'Erro ao confirmar upload')
                }

                toast.success(`Upload de ${file.name} concluído!`)
            } catch (error) {
                toast.error((error as Error).message || `Erro ao enviar ${file.name}`)
            }
        }
        refetchAttachments()
    }

    const handleDeleteAttachment = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este anexo?")) return
        setIsDeletingAttachment(id)
        try {
            const res = await api.storage[':id'].$delete({ param: { id } })
            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: 'Erro ao excluir anexo' }))
                throw new Error((data as any).error || 'Erro ao excluir anexo')
            }
            toast.success("Anexo excluído")
            refetchAttachments()
        } catch (error) {
            toast.error((error as Error).message || "Erro ao excluir anexo")
        } finally {
            setIsDeletingAttachment(null)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Orçamento do Projeto */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-[#1d4e46] p-2 rounded">
                        <Coins className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#1d4e46]">Orçamento do Projeto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-3 text-sm text-slate-800">
                        <p><span className="font-bold">Orçamento:</span> Planeje os custos por categoria. Monitore gastos vs. planejado.</p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-sky-600">{formatCurrency(totalBudget)}</div>
                            <div className="text-sm text-slate-600">Orçamento Total</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalSpent)}</div>
                            <div className="text-sm text-slate-600">Gasto Atual ({spentPercentage}%)</div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                            <div className={`text-2xl font-bold ${available >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(available)}</div>
                            <div className="text-sm text-slate-600">Disponível</div>
                        </div>
                    </div>

                    {/* Add Budget Item Form */}
                    {!isViewer && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <FileText className="w-3 h-3" /> Categoria
                                </Label>
                                <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Ex: Equipamentos, RH, Consultoria" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <DollarSign className="w-3 h-3" /> Valor Orçado (R$)
                                </Label>
                                <Input type="number" step="0.01" value={newBudgetedValue} onChange={e => setNewBudgetedValue(e.target.value)} placeholder="0.00" />
                            </div>
                        </div>
                    )}

                    {!isViewer && (
                        <Button onClick={addBudgetItem} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Item ao Orçamento
                        </Button>
                    )}

                    {budgetItems.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum item no orçamento</p>
                    ) : (
                        <div className="space-y-2">
                            {budgetItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded border bg-slate-50 group hover:border-[#1d4e46] transition-all">
                                    <div className="flex-1">
                                        <span className="font-medium">{item.category}</span>
                                        <div className="text-sm text-muted-foreground">{formatCurrency(item.budgetedValue)}</div>
                                    </div>
                                    {!isViewer && (
                                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setBudgetItems(budgetItems.filter(b => b.id !== item.id))}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {budgetItems.length > 0 && !isViewer && (
                        <Button onClick={() => saveCostMutation.mutate()} disabled={saveCostMutation.isPending} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Save className="w-4 h-4 mr-2" /> Salvar Orçamento
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* 2. Registro de Despesas */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-[#1d4e46] p-2 rounded">
                        <Receipt className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#1d4e46]">Registro de Despesas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    {!isViewer && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <FileText className="w-3 h-3" /> Descrição
                                </Label>
                                <Input value={newExpenseDesc} onChange={e => setNewExpenseDesc(e.target.value)} placeholder="Ex: Compra de servidores" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <DollarSign className="w-3 h-3" /> Valor (R$)
                                </Label>
                                <Input type="number" step="0.01" value={newExpenseValue} onChange={e => setNewExpenseValue(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <CalendarDays className="w-3 h-3" /> Data
                                </Label>
                                <Input type="date" value={newExpenseDate} onChange={e => setNewExpenseDate(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {!isViewer && (
                        <Button onClick={addExpense} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Plus className="w-4 h-4 mr-2" /> Registrar Despesa
                        </Button>
                    )}

                    {expenses.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhuma despesa registrada</p>
                    ) : (
                        <div className="space-y-2">
                            {expenses.map(exp => (
                                <div key={exp.id} className="flex items-center justify-between p-3 rounded border bg-slate-50 group hover:border-[#1d4e46] transition-all">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Descrição</div>
                                            <span className="font-medium text-sm">{exp.description}</span>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Valor</div>
                                            <span className="text-sm text-rose-600 font-medium">{formatCurrency(exp.value)}</span>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Data</div>
                                            <span className="text-sm">{exp.date ? new Date(exp.date).toLocaleDateString('pt-BR') : '-'}</span>
                                        </div>
                                    </div>
                                    {!isViewer && (
                                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setExpenses(expenses.filter(e => e.id !== exp.id))}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {expenses.length > 0 && !isViewer && (
                        <Button onClick={() => saveCostMutation.mutate()} disabled={saveCostMutation.isPending} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Save className="w-4 h-4 mr-2" /> Salvar Despesas
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* 3. Notas Gerais */}
            <NotesSection projectId={projectId} area="custos" initialContent={""} />

            {/* 4. Documentos Anexados */}
            <Card className="border-t-4 border-slate-600">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-slate-600 p-2 rounded">
                        <Paperclip className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-800">Documentos Anexados ({attachments.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-slate-50 border-l-4 border-slate-400 p-3 text-sm text-slate-800 flex gap-2">
                        <Paperclip className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            <span className="font-bold">Anexe documentos relevantes:</span> Notas fiscais, recibos, orçamentos, contratos de fornecedores, ou qualquer documento financeiro.
                        </p>
                    </div>
                    {!isViewer && <FileUpload onUpload={handleUpload} />}
                    <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment} isDeleting={isDeletingAttachment} readonly={isViewer} />
                </CardContent>
            </Card>
        </div>
    )
}
