export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

function escapeCSV(val: string | null | undefined): string {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''

  const contacts = await prisma.contact.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } },
                { title: { contains: search } },
              ],
            }
          : {},
        status ? { status } : {},
      ],
    },
    include: {
      company: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 10000,
  })

  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Title',
    'Company',
    'Status',
    'LinkedIn',
    'Tags',
  ]

  const rows = contacts.map(c => [
    c.firstName,
    c.lastName,
    c.email,
    c.phone,
    c.title,
    c.company?.name,
    c.status,
    c.linkedinUrl,
    c.tags,
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(escapeCSV).join(','))
    .join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
