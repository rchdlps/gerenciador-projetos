"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, PieChart as PieChartIcon, Target, Activity } from "lucide-react"

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#14b8a6'] // indigo, emerald, amber, pink, teal
const STATUS_COLORS: Record<string, string> = {
    "Em Andamento": "#0ea5e9",  // sky-500
    "Concluído": "#10b981",     // emerald-500
    "Suspenso": "#f59e0b",      // amber-500
    "Cancelado": "#f43f5e",     // rose-500
    "Recorrente": "#8b5cf6",    // violet-500
    "Proposta": "#64748b",      // slate-500
    "Planejamento": "#06b6d4"   // cyan-500
}

interface OverviewChartsProps {
    projectsByType: { name: string; value: number }[];
    projectsByStatus: { name: string; value: number }[];
    projectsByOrg: { name: string; progress: number }[];
    completionRate: { completed: number; recorrente: number; total: number };
}

export function OverviewCharts({ projectsByType, projectsByStatus, projectsByOrg, completionRate }: OverviewChartsProps) {
    const { completed, recorrente, total } = completionRate;
    const totalCompleted = completed + recorrente;
    // Prevent division by zero
    const completionPercentage = total > 0 ? (totalCompleted / total) * 100 : 0;
    const dashOffset = 440 - (440 * (completionPercentage / 100));

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
                            <div className="h-[250px] w-full min-h-[250px] min-w-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={projectsByType}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {projectsByType.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
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
                            <div className="h-[250px] w-full min-h-[250px] min-w-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={projectsByStatus}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {projectsByStatus.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Completion Gauge */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Target className="w-4 h-4 text-rose-500" />
                                Conclusão Geral
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center h-[280px] relative pb-10">
                            {/* Multi-segment gauge showing both statuses */}
                            {(() => {
                                const circumference = 389;
                                const completedPercent = total > 0 ? (completed / total) * 100 : 0;
                                const recorrentePercent = total > 0 ? (recorrente / total) * 100 : 0;
                                const completedArc = (circumference * completedPercent) / 100;
                                const recorrenteArc = (circumference * recorrentePercent) / 100;
                                const completedOffset = circumference - completedArc;
                                const recorrenteOffset = circumference - recorrenteArc;

                                return (
                                    <div className="relative w-36 h-36">
                                        <svg className="w-full h-full transform -rotate-90">
                                            {/* Background circle */}
                                            <circle
                                                cx="72"
                                                cy="72"
                                                r="62"
                                                fill="transparent"
                                                stroke="#e2e8f0"
                                                strokeWidth="12"
                                            />
                                            {/* Recorrente arc (violet) - starts after Concluído */}
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
                                            {/* Concluído arc (emerald) - starts at beginning */}
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
                            {/* Status Tags */}
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
                        <div className="h-[300px] w-full min-h-[300px] min-w-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={projectsByOrg}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}%`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f1f5f9' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar
                                        dataKey="progress"
                                        fill="#4ade80" // green-400
                                        radius={[4, 4, 0, 0]}
                                        name="Progresso (%)"
                                    >
                                        {
                                            projectsByOrg.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.progress < 50 ? '#fbbf24' : '#34d399'} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
