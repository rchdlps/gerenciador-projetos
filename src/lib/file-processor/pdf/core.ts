import PDFDocument from 'pdfkit'

export const COLORS = {
    primary: '#0369A1',
    secondary: '#64748B',
    text: '#1E293B',
    lightBg: '#F1F5F9',
    border: '#CBD5E1',
    white: '#FFFFFF',
    success: '#059669',
    warning: '#D97706',
}

export const FONTS = {
    title: 18,
    subtitle: 14,
    sectionTitle: 12,
    body: 10,
    small: 8,
}

export const PAGE = {
    margin: 50,
    width: 595.28,
    height: 841.89,
    contentWidth: 595.28 - 100,
}

export function createPdfBuffer(
    builder: (doc: PDFKit.PDFDocument) => void,
    options?: { landscape?: boolean }
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            layout: options?.landscape ? 'landscape' : 'portrait',
            margin: PAGE.margin,
            bufferPages: true,
            info: { Title: 'Gerenciador de Projetos', Author: 'Sistema de Gerenciamento' },
        })

        const chunks: Buffer[] = []
        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        try {
            builder(doc)
        } catch (err) {
            reject(err)
            return
        }

        const totalPages = doc.bufferedPageRange().count
        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i)
            doc.fontSize(FONTS.small)
                .fillColor(COLORS.secondary)
                .text(`Página ${i + 1} de ${totalPages}`, PAGE.margin, PAGE.height - 30, { align: 'center', width: PAGE.contentWidth })
        }

        doc.end()
    })
}

export function drawTable(
    doc: PDFKit.PDFDocument,
    headers: string[],
    rows: string[][],
    options?: { columnWidths?: number[]; startY?: number }
) {
    const startY = options?.startY ?? doc.y
    const colWidths = options?.columnWidths ?? headers.map(() => PAGE.contentWidth / headers.length)
    const rowHeight = 22
    const cellPadding = 5
    let y = startY

    doc.fontSize(FONTS.small).fillColor(COLORS.white)
    let x = PAGE.margin
    for (let i = 0; i < headers.length; i++) {
        doc.rect(x, y, colWidths[i], rowHeight).fill(COLORS.primary)
        doc.fillColor(COLORS.white)
            .text(headers[i], x + cellPadding, y + 6, { width: colWidths[i] - cellPadding * 2, height: rowHeight, ellipsis: true })
        x += colWidths[i]
    }
    y += rowHeight

    for (let r = 0; r < rows.length; r++) {
        if (y + rowHeight > PAGE.height - 60) {
            doc.addPage()
            y = PAGE.margin
        }
        const bgColor = r % 2 === 0 ? COLORS.white : COLORS.lightBg
        x = PAGE.margin
        doc.fontSize(FONTS.small).fillColor(COLORS.text)
        for (let i = 0; i < headers.length; i++) {
            doc.rect(x, y, colWidths[i], rowHeight).fill(bgColor)
            doc.fillColor(COLORS.text)
                .text(rows[r][i] ?? '', x + cellPadding, y + 6, { width: colWidths[i] - cellPadding * 2, height: rowHeight, ellipsis: true })
            x += colWidths[i]
        }
        y += rowHeight
    }
    doc.y = y + 10
}
