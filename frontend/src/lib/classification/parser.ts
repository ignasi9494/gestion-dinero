import Papa from 'papaparse'

export interface RawTransaction {
  concept: string
  conceptNormalized: string
  date: string // YYYY-MM-DD
  amount: number
  balance: number | null
}

export interface ParseResult {
  transactions: RawTransaction[]
  errors: string[]
  totalRows: number
}

/**
 * Parse a CaixaBank-style amount string.
 * Formats: "-21,30EUR", "+2392,42EUR", "1.234,56EUR", "-1.234,56"
 * Strips EUR suffix, handles thousands separator (dot), decimal separator (comma).
 */
function parseAmount(raw: string): number {
  const cleaned = raw
    .replace(/\s/g, '')
    .replace(/EUR$/i, '')
    .replace(/\./g, '')   // remove thousands separator
    .replace(',', '.')    // decimal comma -> dot
  const value = parseFloat(cleaned)
  if (isNaN(value)) throw new Error(`Importe no valido: ${raw}`)
  return value
}

/**
 * Parse a date string from DD/MM/YYYY to YYYY-MM-DD.
 */
function parseDate(raw: string): string {
  const parts = raw.trim().split('/')
  if (parts.length !== 3) throw new Error(`Fecha no valida: ${raw}`)
  const [day, month, year] = parts
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  if (isNaN(d) || isNaN(m) || isNaN(y)) throw new Error(`Fecha no valida: ${raw}`)
  if (m < 1 || m > 12) throw new Error(`Mes fuera de rango: ${raw}`)
  if (d < 1 || d > 31) throw new Error(`Dia fuera de rango: ${raw}`)
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Parse a CaixaBank CSV file.
 * Expected format: semicolon-delimited with headers "Concepto;Fecha;Importe;Saldo"
 */
export function parseCaixaBankCSV(fileContent: string): ParseResult {
  const errors: string[] = []
  const transactions: RawTransaction[] = []

  const result = Papa.parse(fileContent, {
    delimiter: ';',
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  })

  // Validate required headers
  const headers = result.meta.fields || []
  const requiredHeaders = ['Concepto', 'Fecha', 'Importe']
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
  if (missingHeaders.length > 0) {
    return {
      transactions: [],
      errors: [`Faltan columnas obligatorias: ${missingHeaders.join(', ')}`],
      totalRows: 0,
    }
  }

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i] as Record<string, string>
    try {
      const concept = (row['Concepto'] || '').trim()
      if (!concept) {
        errors.push(`Fila ${i + 2}: concepto vacio`)
        continue
      }

      const fecha = (row['Fecha'] || '').trim()
      if (!fecha) {
        errors.push(`Fila ${i + 2}: fecha vacia`)
        continue
      }

      const importe = (row['Importe'] || '').trim()
      if (!importe) {
        errors.push(`Fila ${i + 2}: importe vacio`)
        continue
      }

      const date = parseDate(fecha)
      const amount = parseAmount(importe)
      const saldo = (row['Saldo'] || '').trim()
      const balance = saldo ? parseAmount(saldo) : null

      transactions.push({
        concept,
        conceptNormalized: concept.toUpperCase(),
        date,
        amount,
        balance,
      })
    } catch (err) {
      errors.push(
        `Fila ${i + 2}: ${err instanceof Error ? err.message : 'error desconocido'}`
      )
    }
  }

  return {
    transactions,
    errors,
    totalRows: result.data.length,
  }
}
