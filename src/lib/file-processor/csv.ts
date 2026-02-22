/**
 * Build a CSV buffer from rows of data.
 * Handles quoting for values containing commas or newlines.
 */
export function buildCsvBuffer(rows: Record<string, string | number | boolean | null | undefined>[]): Buffer {
    if (rows.length === 0) return Buffer.from('', 'utf-8')

    const columns = Object.keys(rows[0])

    const escapeCell = (val: unknown): string => {
        const str = String(val ?? '')
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }

    const lines: string[] = []
    lines.push(columns.map(escapeCell).join(','))

    for (const row of rows) {
        lines.push(columns.map(col => escapeCell(row[col])).join(','))
    }

    const bom = '\uFEFF'
    return Buffer.from(bom + lines.join('\n'), 'utf-8')
}
