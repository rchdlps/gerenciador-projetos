import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Building2, User, UserCheck, CheckCircle2, Layout, Activity } from "lucide-react"

interface ProjectHeaderProps {
    project: any
    organization: any
    stakeholders: any[]
    totalPhases: number
    completedPhases: number
}

export function ProjectHeader({ project, organization, stakeholders, totalPhases, completedPhases }: ProjectHeaderProps) {

    // Calculate progress percentage
    const progressPercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0

    // We now prioritize Organization fields for these roles, but could fallback to Stakeholders if needed.
    // For now, let's purely use Organization fields as per the request.
    const secretarioName = organization?.secretario || "-"
    const secretariaAdjuntaName = organization?.secretariaAdjunta || "-"
    const diretoriaTecnicaName = organization?.diretoriaTecnica || "-"

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10" aria-label="Cabeçalho do Projeto">
            {/* Main Info Card - Clean Minimalist */}
            <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl overflow-hidden">
                <CardContent className="p-8 lg:p-10 space-y-10">
                    {/* Organization Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-[0.15em]">
                            <Building2 className="w-4 h-4 text-primary/60" />
                            Órgão Responsável
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                            {organization?.name || "Órgão não definido"}
                        </h2>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Roles Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Secretário */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-[0.15em]">
                                <User className="w-3.5 h-3.5" />
                                Secretário
                            </div>
                            <p className="font-bold text-lg text-slate-900 truncate" title={secretarioName}>
                                {secretarioName}
                            </p>
                        </div>

                        {/* Secretária Adjunta */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-[0.15em]">
                                <UserCheck className="w-3.5 h-3.5" />
                                Secretaria Adjunta
                            </div>
                            <p className="font-bold text-lg text-slate-900 truncate" title={secretariaAdjuntaName}>
                                {secretariaAdjuntaName}
                            </p>
                        </div>

                        {/* Diretora Técnica */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-[0.15em]">
                                <Activity className="w-3.5 h-3.5" />
                                Diretoria Técnica
                            </div>
                            <p className="font-bold text-lg text-slate-900 truncate" title={diretoriaTecnicaName}>
                                {diretoriaTecnicaName}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status Cards Column */}
            <div className="space-y-6">
                {/* Progress Card - Clean */}
                <Card className="bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl group">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] uppercase tracking-[0.15em]">
                                <Layout className="w-4 h-4" />
                                Progresso
                            </div>
                            <span className="text-4xl font-black text-primary tracking-tighter">
                                {progressPercentage}%
                            </span>
                        </div>

                        <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden mb-8 shadow-inner">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                                {completedPhases} concluídas
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
                                {totalPhases} fases no projeto
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Phases Count Card - Clean */}
                <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
                    <CardContent className="p-8 flex items-center justify-between">
                        <div>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">
                                {completedPhases} / {totalPhases}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                Fases do Cronograma
                            </div>
                        </div>
                        <div className="flex items-center justify-center w-14 h-14 bg-primary/5 rounded-2xl border border-primary/10">
                            <CheckCircle2 className="w-7 h-7 text-primary" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
