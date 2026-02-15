"use client"

import * as React from "react"
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import { Activity, Target } from "lucide-react"

const TYPE_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
]

const STATUS_COLORS: Record<string, string> = {
    "Em Andamento": "hsl(199 89% 48%)",
    "Concluído": "hsl(160 60% 45%)",
    "Suspenso": "hsl(44 89% 62%)",
    "Cancelado": "hsl(0 84% 60%)",
    "Recorrente": "hsl(271 91% 65%)",
    "Proposta": "hsl(215 16% 47%)",
    "Planejamento": "hsl(187 86% 42%)",
}

interface OverviewChartsProps {
    projectsByType: { name: string; value: number }[];
    projectsByStatus: { name: string; value: number }[];
    projectsByOrg: { name: string; progress: number }[];
    completionRate: { completed: number; recorrente: number; total: number };
}

function buildTypeConfig(data: { name: string; value: number }[]): ChartConfig {
    const config: ChartConfig = {}
    data.forEach((item, i) => {
        config[item.name] = { label: item.name, color: TYPE_COLORS[i % TYPE_COLORS.length] }
    })
    return config
}

function buildStatusConfig(data: { name: string; value: number }[]): ChartConfig {
    const config: ChartConfig = {}
    data.forEach((item) => {
        config[item.name] = { label: item.name, color: STATUS_COLORS[item.name] ?? "hsl(var(--chart-1))" }
    })
    return config
}

const barChartConfig = {
    progress: { label: "Progresso (%)", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig

function ChartSkeleton({ height = "280px" }: { height?: string }) {
    return (
        <div className={`animate-pulse rounded-lg bg-muted/50`} style={{ height }} />
    )
}

export function OverviewCharts({ projectsByType, projectsByStatus, projectsByOrg, completionRate }: OverviewChartsProps) {
    const { completed, recorrente, total } = completionRate;
    const totalCompleted = completed + recorrente;

    const typeConfig = React.useMemo(() => buildTypeConfig(projectsByType), [projectsByType])
    const statusConfig = React.useMemo(() => buildStatusConfig(projectsByStatus), [projectsByStatus])

    const typeData = React.useMemo(() =>
        projectsByType.map((item, i) => ({ ...item, fill: TYPE_COLORS[i % TYPE_COLORS.length] })),
        [projectsByType]
    )

    const statusData = React.useMemo(() =>
        projectsByStatus.map((item) => ({ ...item, fill: STATUS_COLORS[item.name] ?? "hsl(var(--chart-1))" })),
        [projectsByStatus]
    )

    const barData = React.useMemo(() =>
        projectsByOrg.map((item) => ({ ...item, fill: item.progress < 50 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-5))' })),
        [projectsByOrg]
    )

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Section 1: Detailed Analysis */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">

                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Projects by Type */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Projetos por Tipo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <React.Suspense fallback={<ChartSkeleton />}>
                            <ChartContainer config={typeConfig} className="h-[280px] w-full min-h-[280px] min-w-[200px]">
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={55}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="name"
                                    />
                                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                    <ChartLegend
                                        verticalAlign="bottom"
                                        content={<ChartLegendContent nameKey="name" className="flex-wrap gap-2 text-xs pt-0 mt-0" />}
                                    />
                                </PieChart>
                            </ChartContainer>
                            </React.Suspense>
                        </CardContent>
                    </Card>

                    {/* General Status */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Activity className="w-4 h-4 text-teal-500" />
                                Status Geral dos Projetos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-10">
                            <React.Suspense fallback={<ChartSkeleton />}>
                            <ChartContainer config={statusConfig} className="h-[280px] w-full min-h-[280px] min-w-[200px]">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="45%"
                                        outerRadius={75}
                                        dataKey="value"
                                        nameKey="name"
                                    />
                                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                    <ChartLegend
                                        verticalAlign="bottom"
                                        content={<ChartLegendContent nameKey="name" className="flex-wrap gap-2 text-xs pt-0 mt-0" />}
                                    />
                                </PieChart>
                            </ChartContainer>
                            </React.Suspense>
                        </CardContent>
                    </Card>

                    {/* Completion Gauge - kept as custom SVG */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Target className="w-4 h-4 text-rose-500" />
                                Conclusão Geral
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center h-[280px] relative pb-10">
                            {(() => {
                                const circumference = 389;
                                const completedPercent = total > 0 ? (completed / total) * 100 : 0;
                                const recorrentePercent = total > 0 ? (recorrente / total) * 100 : 0;
                                const completedArc = (circumference * completedPercent) / 100;
                                const recorrenteArc = (circumference * recorrentePercent) / 100;

                                return (
                                    <div className="relative w-36 h-36">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="72"
                                                cy="72"
                                                r="62"
                                                fill="transparent"
                                                stroke="#e2e8f0"
                                                strokeWidth="12"
                                            />
                                            <circle
                                                cx="72"
                                                cy="72"
                                                r="62"
                                                fill="transparent"
                                                stroke="#8b5cf6"
                                                strokeWidth="12"
                                                strokeDasharray={`${recorrenteArc} ${circumference - recorrenteArc}`}
                                                strokeDashoffset={-completedArc}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                            <circle
                                                cx="72"
                                                cy="72"
                                                r="62"
                                                fill="transparent"
                                                stroke="#10b981"
                                                strokeWidth="12"
                                                strokeDasharray={`${completedArc} ${circumference - completedArc}`}
                                                strokeDashoffset={0}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold text-slate-800">{totalCompleted}/{total}</span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Finalizados</span>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Concluído: {completed}
                                </span>
                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                                    Recorrente: {recorrente}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Section 2: Executive Dashboard */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-800">Visão Geral</h2>
                        <p className="text-sm text-slate-500">Progresso de todos os projetos por secretaria</p>
                    </div>
                </div>

                <Card className="hover:shadow-md transition-shadow border-emerald-100/50">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-emerald-700">Progresso Geral por Secretaria</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <React.Suspense fallback={<ChartSkeleton height="300px" />}>
                        <ChartContainer config={barChartConfig} className="h-[300px] w-full min-h-[300px] min-w-[200px]">
                            <BarChart data={barData} accessibilityLayer>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={12}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={12}
                                    tickFormatter={(value) => `${value}%`}
                                />
                                <ChartTooltip
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    content={<ChartTooltipContent />}
                                />
                                <Bar
                                    dataKey="progress"
                                    radius={[4, 4, 0, 0]}
                                    name="Progresso (%)"
                                />
                            </BarChart>
                        </ChartContainer>
                        </React.Suspense>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
