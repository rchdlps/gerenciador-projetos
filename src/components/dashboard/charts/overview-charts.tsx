"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, PieChart as PieChartIcon, Target, Activity } from "lucide-react"

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#14b8a6'] // indigo, emerald, amber, pink, teal
const STATUS_COLORS = {
    "Em Andamento": "#6366f1", // indigo-500
    "Concluídos": "#10b981",   // emerald-500
    "Atrasados": "#f43f5e"     // rose-500
}

const dataType = [
    { name: 'Programa', value: 400 },
    { name: 'Serviço', value: 300 },
    { name: 'Aquisição', value: 300 },
    { name: 'Evento', value: 200 },
    { name: 'Obra', value: 278 },
];

const dataStatus = [
    { name: 'Em Andamento', value: 45 },
    { name: 'Concluídos', value: 20 },
    { name: 'Atrasados', value: 10 },
];

const dataSecretariats = [
    { name: 'SME', progress: 80 },
    { name: 'SMS', progress: 45 },
    { name: 'SMOB', progress: 60 },
    { name: 'SMPO', progress: 90 },
    { name: 'DEMO', progress: 30 },
    { name: 'SMT', progress: 50 },
    { name: 'SAD', progress: 70 },
];

export function OverviewCharts() {
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
                                            data={dataType}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {dataType.map((entry, index) => (
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
                        <CardContent>
                            <div className="h-[250px] w-full min-h-[250px] min-w-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dataStatus}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {dataStatus.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />
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
                        <CardContent className="flex flex-col items-center justify-center h-[250px] relative">
                            {/* Simple CSS Overlay Gauge for "Pro Max" look without complex RadialBar */}
                            <div className="relative w-40 h-40">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        fill="transparent"
                                        stroke="#e2e8f0"
                                        strokeWidth="15"
                                    />
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        fill="transparent"
                                        stroke="#10b981" // emerald-500
                                        strokeWidth="15"
                                        strokeDasharray={440}
                                        strokeDashoffset={440 - (440 * 0.1)} // 10% progress
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-slate-800">20/200</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-widest mt-1">Concluídos</span>
                                </div>
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
                                <BarChart data={dataSecretariats}>
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
                                            dataSecretariats.map((entry, index) => (
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
