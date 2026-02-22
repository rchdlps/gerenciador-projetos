import { db } from '@/lib/db'
import { projectPhases, stakeholders, projectQualityMetrics } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { createPdfBuffer, drawTable, COLORS, FONTS, PAGE } from './core'

interface SummaryPdfOptions {
    project: {
        id: string
        name: string
        type: string
        status: string
        description: string | null
    }
    orgName: string
}

const STATUS_LABELS: Record<string, string> = {
    em_andamento: 'Em Andamento',
    concluido: 'Concluído',
    suspenso: 'Suspenso',
    cancelado: 'Cancelado',
}

export async function generateSummaryPdf(options: SummaryPdfOptions): Promise<Buffer> {
    const { project, orgName } = options

    const [phases, projectStakeholders, qualityMetrics] = await Promise.all([
        db.query.projectPhases.findMany({
            where: eq(projectPhases.projectId, project.id),
            with: { tasks: true },
        }),
        db.select().from(stakeholders).where(eq(stakeholders.projectId, project.id)),
        db.select().from(projectQualityMetrics).where(eq(projectQualityMetrics.projectId, project.id)),
    ])

    // Calculate progress
    const allTasks = phases.flatMap((p) => p.tasks)
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter((t) => t.status === 'done').length
    const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return createPdfBuffer((doc) => {
        // Header
        doc.fontSize(FONTS.small).fillColor(COLORS.secondary)
            .text(orgName, { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(FONTS.title).fillColor(COLORS.primary)
            .text('Resumo do Projeto', { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(FONTS.subtitle).fillColor(COLORS.text)
            .text(project.name, { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(FONTS.small).fillColor(COLORS.secondary)
            .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' })
        doc.moveDown(1)

        // Divider
        doc.moveTo(PAGE.margin, doc.y)
            .lineTo(PAGE.margin + PAGE.contentWidth, doc.y)
            .strokeColor(COLORS.border)
            .stroke()
        doc.moveDown(1)

        // Overview
        doc.fontSize(FONTS.sectionTitle).fillColor(COLORS.primary)
            .text('1. Visão Geral')
        doc.moveDown(0.5)
        doc.fontSize(FONTS.body).fillColor(COLORS.text)
        doc.text(`Tipo: ${project.type}`)
        doc.text(`Status: ${STATUS_LABELS[project.status] ?? project.status}`)
        doc.text(`Progresso: ${progressPct}% (${completedTasks}/${totalTasks} tarefas concluídas)`)
        if (project.description) {
            doc.moveDown(0.3)
            doc.text(`Descrição: ${project.description}`)
        }
        doc.moveDown(1)

        // Phases table
        doc.fontSize(FONTS.sectionTitle).fillColor(COLORS.primary)
            .text('2. Fases do Projeto')
        doc.moveDown(0.5)
        if (phases.length > 0) {
            const phaseHeaders = ['Fase', 'Tarefas', 'Concluídas', 'Progresso']
            const phaseRows = phases.map((p) => {
                const total = p.tasks.length
                const done = p.tasks.filter((t) => t.status === 'done').length
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return [p.name, String(total), String(done), `${pct}%`]
            })
            drawTable(doc, phaseHeaders, phaseRows, {
                columnWidths: [
                    PAGE.contentWidth * 0.4,
                    PAGE.contentWidth * 0.2,
                    PAGE.contentWidth * 0.2,
                    PAGE.contentWidth * 0.2,
                ],
            })
        } else {
            doc.fontSize(FONTS.body).fillColor(COLORS.text)
                .text('Nenhuma fase cadastrada.')
        }
        doc.moveDown(1)

        // Stakeholders table
        doc.fontSize(FONTS.sectionTitle).fillColor(COLORS.primary)
            .text('3. Partes Interessadas')
        doc.moveDown(0.5)
        if (projectStakeholders.length > 0) {
            const stHeaders = ['Nome', 'Papel', 'Nível']
            const stRows = projectStakeholders.map((s) => [s.name, s.role, s.level])
            drawTable(doc, stHeaders, stRows, {
                columnWidths: [
                    PAGE.contentWidth * 0.4,
                    PAGE.contentWidth * 0.3,
                    PAGE.contentWidth * 0.3,
                ],
            })
        } else {
            doc.fontSize(FONTS.body).fillColor(COLORS.text)
                .text('Nenhuma parte interessada cadastrada.')
        }
        doc.moveDown(1)

        // Quality Metrics table
        doc.fontSize(FONTS.sectionTitle).fillColor(COLORS.primary)
            .text('4. Métricas de Qualidade')
        doc.moveDown(0.5)
        if (qualityMetrics.length > 0) {
            const qHeaders = ['Indicador', 'Meta', 'Valor Atual']
            const qRows = qualityMetrics.map((m) => [m.name, m.target, m.currentValue])
            drawTable(doc, qHeaders, qRows, {
                columnWidths: [
                    PAGE.contentWidth * 0.4,
                    PAGE.contentWidth * 0.3,
                    PAGE.contentWidth * 0.3,
                ],
            })
        } else {
            doc.fontSize(FONTS.body).fillColor(COLORS.text)
                .text('Nenhuma métrica de qualidade cadastrada.')
        }
    })
}
