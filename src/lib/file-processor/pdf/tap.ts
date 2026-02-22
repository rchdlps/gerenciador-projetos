import { db } from '@/lib/db'
import { projectCharters, projectMilestones } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { createPdfBuffer, drawTable, COLORS, FONTS, PAGE } from './core'

interface TapPdfOptions {
    projectName: string
    orgName: string
    projectId: string
}

export async function generateTapPdf(options: TapPdfOptions): Promise<Buffer> {
    const { projectName, orgName, projectId } = options

    const [charter, milestones] = await Promise.all([
        db.query.projectCharters.findFirst({
            where: eq(projectCharters.projectId, projectId),
        }),
        db.query.projectMilestones.findMany({
            where: eq(projectMilestones.projectId, projectId),
        }),
    ])

    return createPdfBuffer((doc) => {
        // Header
        doc.fontSize(FONTS.small).fillColor(COLORS.secondary)
            .text(orgName, { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(FONTS.title).fillColor(COLORS.primary)
            .text('Termo de Abertura do Projeto (TAP)', { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(FONTS.subtitle).fillColor(COLORS.text)
            .text(projectName, { align: 'center' })
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

        if (!charter) {
            doc.fontSize(FONTS.body).fillColor(COLORS.secondary)
                .text('Nenhum Termo de Abertura cadastrado para este projeto.', { align: 'center' })
            return
        }

        // Justificativa
        doc.fontSize(FONTS.sectionTitle).fillColor(COLORS.primary)
            .text('1. Justificativa')
        doc.moveDown(0.5)
        doc.fontSize(FONTS.body).fillColor(COLORS.text)
            .text(charter.justification || 'Não informada.')
        doc.moveDown(1)

        // Objetivos SMART
        doc.fontSize(FONTS.sectionTitle).fillColor(COLORS.primary)
            .text('2. Objetivos SMART')
        doc.moveDown(0.5)
        if (charter.smartObjectives) {
            const objectives = charter.smartObjectives.split('\n').filter((o) => o.trim())
            for (const obj of objectives) {
                doc.fontSize(FONTS.body).fillColor(COLORS.text)
                    .text(`• ${obj.trim()}`, { indent: 10 })
                doc.moveDown(0.2)
            }
        } else {
            doc.fontSize(FONTS.body).fillColor(COLORS.text)
                .text('Não informados.')
        }
        doc.moveDown(1)

        // Critérios de Sucesso
        doc.fontSize(FONTS.sectionTitle).fillColor(COLORS.primary)
            .text('3. Critérios de Sucesso')
        doc.moveDown(0.5)
        if (charter.successCriteria) {
            const criteria = charter.successCriteria.split('\n').filter((c) => c.trim())
            for (const criterion of criteria) {
                doc.fontSize(FONTS.body).fillColor(COLORS.text)
                    .text(`• ${criterion.trim()}`, { indent: 10 })
                doc.moveDown(0.2)
            }
        } else {
            doc.fontSize(FONTS.body).fillColor(COLORS.text)
                .text('Não informados.')
        }
        doc.moveDown(1)

        // Marcos
        doc.fontSize(FONTS.sectionTitle).fillColor(COLORS.primary)
            .text('4. Marcos do Projeto')
        doc.moveDown(0.5)

        if (milestones.length > 0) {
            const headers = ['Nome', 'Fase', 'Data Prevista']
            const rows = milestones.map((m) => [
                m.name,
                m.phase,
                m.expectedDate.toLocaleDateString('pt-BR'),
            ])
            drawTable(doc, headers, rows, {
                columnWidths: [PAGE.contentWidth * 0.4, PAGE.contentWidth * 0.3, PAGE.contentWidth * 0.3],
            })
        } else {
            doc.fontSize(FONTS.body).fillColor(COLORS.text)
                .text('Nenhum marco cadastrado.')
        }
    })
}
