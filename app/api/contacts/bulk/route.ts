export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { ids, action, value } = await req.json()

  if (!ids?.length) return NextResponse.json({ error: 'No contacts selected' }, { status: 400 })

  switch (action) {
    case 'delete':
      await prisma.contact.deleteMany({ where: { id: { in: ids } } })
      return NextResponse.json({ ok: true, count: ids.length })

    case 'status':
      if (!value) return NextResponse.json({ error: 'No status provided' }, { status: 400 })
      await prisma.contact.updateMany({ where: { id: { in: ids } }, data: { status: value } })
      return NextResponse.json({ ok: true, count: ids.length })

    case 'tag': {
      if (!value) return NextResponse.json({ error: 'No tag provided' }, { status: 400 })
      const contacts = await prisma.contact.findMany({ where: { id: { in: ids } }, select: { id: true, tags: true } })
      await Promise.all(contacts.map(c => {
        const existing = c.tags ? c.tags.split(',').map(t => t.trim()).filter(Boolean) : []
        if (existing.includes(value)) return Promise.resolve()
        const newTags = [...existing, value].join(', ')
        return prisma.contact.update({ where: { id: c.id }, data: { tags: newTags } })
      }))
      return NextResponse.json({ ok: true, count: ids.length })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
