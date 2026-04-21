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
      cells.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  cells.push(current.trim())
  return cells
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const rawHeaders = parseCSVRow(lines[0])
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/[\s_\-\.]+/g, '_'))
  return lines.slice(1).map(line => {
    const values = parseCSVRow(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  }).filter(row => Object.values(row).some(v => v.trim()))
}

// Tries multiple common column name variants
function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const k = key.toLowerCase().replace(/[\s_\-\.]+/g, '_')
    const val = row[k]?.trim()
    if (val) return val
  }
  return ''
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (rows.length === 0) return NextResponse.json({ error: 'No data rows found in CSV' }, { status: 400 })

  let created = 0
  let skipped = 0
  let errors = 0
  const newCompanyIds: string[] = []

  for (const row of rows) {
    try {
      const firstName = pick(row, 'first_name', 'firstname', 'first', 'fname', 'given_name')
      const lastName = pick(row, 'last_name', 'lastname', 'last', 'lname', 'surname', 'family_name')

      // Need at least a name to create a contact
      if (!firstName && !lastName) { skipped++; continue }

      const email = pick(row, 'email', 'email_address', 'e_mail', 'work_email', 'personal_email')
      const phone = pick(row, 'phone', 'phone_number', 'work_phone', 'direct_phone', 'office_phone', 'mobile', 'cell', 'cell_phone', 'mobile_phone')
      const title = pick(row, 'title', 'job_title', 'position', 'role', 'job_role', 'occupation')
      const companyName = pick(row, 'company', 'company_name', 'organization', 'account', 'employer', 'business', 'firm')
      const linkedinUrl = pick(row, 'linkedin', 'linkedin_url', 'linkedin_profile', 'linkedin_link', 'profile_url')
      const tags = pick(row, 'tags', 'tag', 'labels', 'lists')
      const status = pick(row, 'status', 'contact_status') || 'prospect'

      // Skip duplicates by email
      if (email) {
        const existing = await prisma.contact.findFirst({ where: { email } })
        if (existing) { skipped++; continue }
      }

      // Auto-create or find company
      let companyId: string | null = null
      if (companyName) {
        const existingCo = await prisma.company.findFirst({
          where: { name: { equals: companyName } },
        })
        if (existingCo) {
          companyId = existingCo.id
        } else {
          const newCo = await prisma.company.create({
            data: { name: companyName, type: 'other', status: 'prospect' },
          })
          companyId = newCo.id
          newCompanyIds.push(companyId)
        }
      }

      await prisma.contact.create({
        data: {
          firstName: firstName || '(Unknown)',
          lastName: lastName || '',
          email: email || null,
          phone: phone || null,
          title: title || null,
          linkedinUrl: linkedinUrl || null,
          companyId,
          status,
          tags: tags || '',
        },
      })
      created++
    } catch {
      errors++
    }
  }

  // Trigger AI enrichment for new companies (fire-and-forget)
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  for (const companyId of newCompanyIds) {
    fetch(`${baseUrl}/api/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    }).catch(() => {})
  }

  return NextResponse.json({
    created,
    skipped,
    errors,
    total: rows.length,
    newCompanies: newCompanyIds.length,
  })
}
