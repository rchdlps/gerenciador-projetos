import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, FileText, Plus, Trash2, StickyNote, Lightbulb, Phone, Package, Landmark } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useUserRole } from "@/hooks/use-user-role"

export default function ProcurementView({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()
    const { isViewer } = useUserRole()

    // 1. Query Data
    const { data, isLoading } = useQuery({
        queryKey: ['procurement', projectId],
        queryFn: async () => {
            const res = await api.procurement[":projectId"].$get({ param: { projectId } })
            if (!res.ok) throw new Error("Failed to fetch procurement data")
            return res.json()
        },
        staleTime: 1000 * 60 * 2,
    })

    // 2. Mutations
    // Notes
    const updateNotes = useMutation({
        mutationFn: async (content: string) => {
            const res = await api.procurement[":projectId"].notes.$put({
                param: { projectId },
                json: { content }
            })
            if (!res.ok) throw new Error("Failed to update notes")
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['procurement', projectId] })
    })

    // Suppliers
    const addSupplier = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.procurement[":projectId"].suppliers.$post({
                param: { projectId },
                json: data
            })
            if (!res.ok) throw new Error("Failed to add supplier")
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['procurement', projectId] })
            toast.success("Fornecedor adicionado!")
        }
    })

    const deleteSupplier = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.procurement.suppliers[":id"].$delete({ param: { id } })
            if (!res.ok) throw new Error("Failed to delete supplier")
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['procurement', projectId] })
    })

    // Contracts
    const addContract = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.procurement[":projectId"].contracts.$post({
                param: { projectId },
                json: data
            })
            if (!res.ok) throw new Error("Failed to add contract")
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['procurement', projectId] })
            toast.success("Contrato adicionado!")
        }
    })

    const deleteContract = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.procurement.contracts[":id"].$delete({ param: { id } })
            if (!res.ok) throw new Error("Failed to delete contract")
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['procurement', projectId] })
    })

    // 3. Local State
    const [notes, setNotes] = useState("")
    const [supplierForm, setSupplierForm] = useState({ name: "", itemService: "", contact: "" })
    const [contractForm, setContractForm] = useState({ description: "", value: "", validity: "", status: "Em negociação" })

    // Sync notes
    if (data?.notes && notes === "") setNotes(data.notes)

    const handleSaveNotes = () => {
        updateNotes.mutate(notes)
        toast.success("Notas salvas!")
    }

    if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}</div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* 1. FORNECEDORES */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg text-[#1d4e46]">
                        <ShoppingCart className="w-5 h-5 text-slate-600" />
                        Fornecedores
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-4 rounded-r-md">
                        <p className="text-sm text-slate-700">
                            <span className="font-bold">Gestão de Fornecedores:</span> Cadastre e acompanhe fornecedores do projeto.
                        </p>
                    </div>

                    {/* Form */}
                    {!isViewer && (
                        <div className="space-y-4 pb-6 border-b">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        <Landmark className="w-3 h-3" /> Nome do Fornecedor
                                    </Label>
                                    <Input
                                        value={supplierForm.name}
                                        onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        <Package className="w-3 h-3" /> Item/Serviço
                                    </Label>
                                    <Input
                                        value={supplierForm.itemService}
                                        onChange={e => setSupplierForm({ ...supplierForm, itemService: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        <Phone className="w-3 h-3" /> Contato
                                    </Label>
                                    <Input
                                        value={supplierForm.contact}
                                        onChange={e => setSupplierForm({ ...supplierForm, contact: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button
                                className="bg-[#1d4e46] hover:bg-[#256056] text-white"
                                disabled={!supplierForm.name || !supplierForm.itemService || addSupplier.isPending}
                                onClick={() => {
                                    addSupplier.mutate(supplierForm)
                                    setSupplierForm({ name: "", itemService: "", contact: "" })
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Adicionar Fornecedor
                            </Button>
                        </div>
                    )}

                    {/* List */}
                    <div className="space-y-2">
                        {data?.suppliers?.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm italic">
                                Nenhum fornecedor cadastrado
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {data?.suppliers?.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg group hover:border-[#1d4e46] transition-all">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Fornecedor</div>
                                                <div className="font-medium text-sm text-slate-800">{item.name}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Item/Serviço</div>
                                                <div className="text-sm text-slate-700">{item.itemService}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Contato</div>
                                                <div className="text-sm text-slate-700">{item.contact}</div>
                                            </div>
                                        </div>
                                        {!isViewer && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => deleteSupplier.mutate(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 2. CONTRATOS */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg text-[#1d4e46]">
                        <FileText className="w-5 h-5 text-slate-600" />
                        Contratos
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Form */}
                    {!isViewer && (
                        <div className="space-y-4 pb-6 border-b">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        📄 Descrição
                                    </Label>
                                    <Input
                                        value={contractForm.description}
                                        onChange={e => setContractForm({ ...contractForm, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        💵 Valor (R$)
                                    </Label>
                                    <Input
                                        value={contractForm.value}
                                        onChange={e => setContractForm({ ...contractForm, value: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        🗓️ Vigência
                                    </Label>
                                    <Input
                                        type="date"
                                        value={contractForm.validity}
                                        onChange={e => setContractForm({ ...contractForm, validity: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        ✅ Status
                                    </Label>
                                    <Select
                                        value={contractForm.status}
                                        onValueChange={v => setContractForm({ ...contractForm, status: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Em negociação">Em negociação</SelectItem>
                                            <SelectItem value="Assinado">Assinado</SelectItem>
                                            <SelectItem value="Em execução">Em execução</SelectItem>
                                            <SelectItem value="Finalizado">Finalizado</SelectItem>
                                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button
                                className="bg-[#1d4e46] hover:bg-[#256056] text-white"
                                disabled={!contractForm.description || !contractForm.value || addContract.isPending}
                                onClick={() => {
                                    addContract.mutate(contractForm)
                                    setContractForm({ description: "", value: "", validity: "", status: "Em negociação" })
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Adicionar Contrato
                            </Button>
                        </div>
                    )}

                    {/* List */}
                    <div className="space-y-2">
                        {data?.contracts?.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm italic">
                                Nenhum contrato registrado
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {data?.contracts?.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg group hover:border-[#1d4e46] transition-all">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Descrição</div>
                                                <div className="font-medium text-sm text-slate-800">{item.description}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Valor</div>
                                                <div className="text-sm text-slate-700">{item.value}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Vigência</div>
                                                <div className="text-sm text-slate-700">
                                                    {item.validity ? format(new Date(item.validity), "dd/MM/yyyy") : "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Status</div>
                                                <div className="text-sm text-slate-700">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === 'Assinado' ? 'bg-green-100 text-green-700' :
                                                        item.status === 'Em negociação' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {!isViewer && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => deleteContract.mutate(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 3. NOTAS GERAIS */}
            <Card className="border-t-4 border-yellow-400">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-yellow-400 p-2 rounded">
                            <StickyNote className="w-5 h-5 text-yellow-900" />
                        </div>
                        <CardTitle className="text-lg font-bold text-yellow-900">Notas Gerais</CardTitle>
                    </div>
                    {!isViewer && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSaveNotes}
                            disabled={updateNotes.isPending}
                            className="border-yellow-400 text-yellow-900 h-8 hover:bg-yellow-50"
                        >
                            <Plus className="w-3 h-3 mr-2 hidden" />
                            Salvar Notas
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-3 text-sm text-amber-900 flex gap-2">
                        <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            <span className="font-bold">Espaço para anotações livres:</span> Use este campo para documentar informações importantes, observações, decisões, lições aprendidas ou qualquer outra informação relevante sobre esta área de conhecimento.
                        </p>
                    </div>

                    <div className="relative">
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="min-h-[150px] resize-y bg-white border-slate-200 focus:border-yellow-400 focus:ring-yellow-400"
                            placeholder="Adicione anotações gerais, observações importantes, decisões tomadas, lições aprendidas..."
                            disabled={isViewer}
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                            {updateNotes.isPending && "Salvando..."}
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
