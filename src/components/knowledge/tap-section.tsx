import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
    ClipboardList,
    Target,
    CheckSquare,
    Save,
    FileDown,
    Loader2,
    Info,
    TrendingUp
} from "lucide-react"
import { toast } from "sonner"

export function TAPSection({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()
    const [justification, setJustification] = useState("")
    const [smartObjectives, setSmartObjectives] = useState("")
    const [successCriteria, setSuccessCriteria] = useState("")

    const { data: tap, isLoading } = useQuery({
        queryKey: ['project-charter', projectId],
        queryFn: async () => {
            const res = await api['project-charter'][':projectId'].$get({
                param: { projectId }
            })
            if (!res.ok) throw new Error()
            return res.json()
        }
    })

    useEffect(() => {
        if (tap) {
            setJustification(tap.justification || "")
            setSmartObjectives(tap.smartObjectives || "")
            setSuccessCriteria(tap.successCriteria || "")
        }
    }, [tap])

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api['project-charter'][':projectId'].$put({
                param: { projectId },
                json: data
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-charter', projectId] })
            toast.success("TAP salvo com sucesso!")
        },
        onError: () => {
            toast.error("Erro ao salvar TAP.")
        }
    })

    const handleSave = () => {
        mutation.mutate({
            justification,
            smartObjectives,
            successCriteria
        })
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

    return (
        <Card className="border-t-4 border-[#1d4e46]">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl text-[#1d4e46]">
                    <ClipboardList className="w-6 h-6" />
                    Termo de Abertura do Projeto (TAP)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Description Alert */}
                <div className="bg-sky-50 border-l-4 border-sky-400 p-4 rounded-r-md flex gap-3">
                    <div className="text-blue-600 shrink-0 mt-0.5 font-bold text-sm">TAP:</div>
                    <p className="text-sm text-slate-700">
                        Documento que autoriza formalmente o projeto e o gerente de projetos.
                    </p>
                </div>

                {/* Justificativa */}
                <div className="space-y-2">
                    <label htmlFor="tap-justification" className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-tight">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        Justificativa do Projeto
                    </label>
                    <Textarea
                        id="tap-justification"
                        placeholder="Por que este projeto é necessário?"
                        className="min-h-[100px] bg-white"
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                    />
                </div>

                {/* Objetivos SMART */}
                <div className="space-y-2">
                    <label htmlFor="tap-smart" className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-tight">
                        <Target className="w-4 h-4 text-orange-500" />
                        Objetivos SMART
                    </label>
                    <Textarea
                        id="tap-smart"
                        placeholder="Específicos, Mensuráveis, Atingíveis, Relevantes e Temporais"
                        className="min-h-[100px] bg-white"
                        value={smartObjectives}
                        onChange={(e) => setSmartObjectives(e.target.value)}
                    />
                </div>

                {/* Critérios de Sucesso */}
                <div className="space-y-2">
                    <label htmlFor="tap-criteria" className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-tight">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        Critérios de Sucesso
                    </label>
                    <Textarea
                        id="tap-criteria"
                        placeholder="Como saberemos que o projeto foi bem-sucedido?"
                        className="min-h-[100px] bg-white"
                        value={successCriteria}
                        onChange={(e) => setSuccessCriteria(e.target.value)}
                    />
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap gap-3 pt-4">
                    <Button
                        onClick={handleSave}
                        className="bg-[#1d4e46] hover:bg-[#256056] text-white"
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar TAP
                    </Button>
                    <Button
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => toast.info("Funcionalidade de geração de documento em desenvolvimento.")}
                    >
                        <FileDown className="w-4 h-4 mr-2" />
                        Gerar Documento TAP
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
