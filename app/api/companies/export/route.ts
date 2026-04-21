export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

function escapeCSV(val: string | number | null | undefined): string {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''

  const companies = await prisma.company.findMany({
    where: {
      AND: [
        search ? { name: { contains: search } } : {},
        status ? { status } : {},
      ],
    },
    include: { _count: { select: { contacts: true, deals: true } } },
    orderBy: { name: 'asc' },
    take: 10000,
  })

  const headers = ['Name', 'Industry', 'Website', 'HQ Location', 'Revenue', 'Employees', 'Status', 'Tier', 'Contacts', 'Deals', 'LinkedIn']
  const rows = companies.map(c => [
    c.name, c.industry, c.website, c.hqLocation,
    c.revenue, c.employeeCount, c.status, c.tier,
    c._count.contacts, c._count.deals, c.linkedinUrl,
  ])

  const csv = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="companies-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
