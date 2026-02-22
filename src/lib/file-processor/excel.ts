import ExcelJS from 'exceljs'

export interface ExcelBuildOptions {
    sheetName: string
    projectName: string
    rows: Record<string, string | number | boolean | null | undefined>[]
}

/**
 * Build an Excel workbook from rows of data.
 * Returns a Buffer of the .xlsx file.
 */
export async function buildExcelWorkbook(options: ExcelBuildOptions): Promise<Buffer> {
    const { sheetName, projectName, rows } = options
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Gerenciador de Projetos'
    wb.created = new Date()

    const ws = wb.addWorksheet(sheetName)

    // Title row
    const titleRow = ws.addRow([`${projectName} — ${sheetName}`])
    titleRow.font = { bold: true, size: 14 }
    ws.addRow([]) // spacer

    if (rows.length === 0) {
        ws.addRow(['Nenhum dado encontrado'])
        const buf = await wb.xlsx.writeBuffer()
        return Buffer.from(buf)
    }

    // Header row from first row's keys
    const columns = Object.keys(rows[0])
    const headerRow = ws.addRow(columns)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0369A1' },
        }
        cell.alignment = { horizontal: 'center' }
    })

    // Data rows
    for (const row of rows) {
        ws.addRow(columns.map(col => row[col] ?? ''))
    }

    // Auto-width columns
    ws.columns.forEach((col) => {
        let maxLen = 10
        col.eachCell?.({ includeEmpty: false }, (cell) => {
            const len = String(cell.value ?? '').length
            if (len > maxLen) maxLen = len
        })
        col.width = Math.min(maxLen + 4, 60)
    })

    const buf = await wb.xlsx.writeBuffer()
    return Buffer.from(buf)
}
