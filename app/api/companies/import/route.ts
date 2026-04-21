export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

function parseCSVRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      cells.push(current.trim()); current = ''
    } else { current += c }
  }
  cells.push(current.trim())
  return cells
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().replace(/[\s_\-\.]+/g, '_'))
  return lines.slice(1).map(line => {
    const values = parseCSVRow(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  }).filter(row => Object.values(row).some(v => v.trim()))
}

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key.toLowerCase().replace(/[\s_\-\.]+/g, '_')]?.trim()
    if (val) return val
  }
  return ''
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const rows = parseCSV(await file.text())
  if (rows.length === 0) return NextResponse.json({ error: 'No data rows found' }, { status: 400 })

  let created = 0, skipped = 0, errors = 0

  for (const row of rows) {
    try {
      const name = pick(row, 'company', 'company_name', 'name', 'organization', 'firm')
      if (!name) { skipped++; continue }

      const existing = await prisma.company.findFirst({ where: { name: { equals: name } } })
      if (existing) { skipped++; continue }

      const revenue = pick(row, 'revenue', 'annual_revenue', 'arr')
      const employees = pick(row, 'employees', 'employee_count', 'headcount', 'size')

      await prisma.company.create({
        data: {
          name,
          industry: pick(row, 'industry', 'sector', 'vertical') || null,
          website: pick(row, 'website', 'url', 'domain', 'web') || null,
          hqLocation: pick(row, 'location', 'hq', 'hq_location', 'city', 'headquarters') || null,
          description: pick(row, 'description', 'about', 'notes', 'summary') || null,
          revenue: revenue ? parseFloat(revenue.replace(/[$,]/g, '')) || null : null,
          employeeCount: employees ? parseInt(employees.replace(/[,]/g, '')) || null : null,
          status: pick(row, 'status') || 'prospect',
          tier: pick(row, 'tier') || 'tier3',
          linkedinUrl: pick(row, 'linkedin', 'linkedin_url') || null,
        },
      })
      created++
    } catch { errors++ }
  }

  return NextResponse.json({ created, skipped, errors, total: rows.length })
}
