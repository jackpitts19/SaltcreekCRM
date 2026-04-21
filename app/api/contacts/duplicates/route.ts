export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// POST /api/contacts/duplicates/merge
// Merge sourceId into targetId (target is kept)
export async function POST(req: NextRequest) {
  const { targetId, sourceId } = await req.json()
  if (!targetId || !sourceId || targetId === sourceId) {
    return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })
  }

  // Re-assign all related records from source -> target
  await Promise.all([
    prisma.note.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } }),
    prisma.emailLog.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } }),
    prisma.callLog.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } }),
    prisma.activity.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } }),
    prisma.task.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } }),
  ])

  // Merge deal connections (avoid duplicates)
  const sourceDeals = await prisma.dealContact.findMany({ where: { contactId: sourceId } })
  const targetDeals = await prisma.dealContact.findMany({ where: { contactId: targetId }, select: { dealId: true } })
  const targetDealIds = new Set(targetDeals.map(d => d.dealId))
  for (const dc of sourceDeals) {
    if (!targetDealIds.has(dc.dealId)) {
      await prisma.dealContact.create({ data: { contactId: targetId, dealId: dc.dealId } })
    }
  }
  await prisma.dealContact.deleteMany({ where: { contactId: sourceId } })

  // Fill in missing fields on target from source
  const [target, source] = await Promise.all([
    prisma.contact.findUnique({ where: { id: targetId } }),
    prisma.contact.findUnique({ where: { id: sourceId } }),
  ])
  if (target && source) {
    await prisma.contact.update({
      where: { id: targetId },
      data: {
        phone: target.phone || source.phone || null,
        title: target.title || source.title || null,
        linkedinUrl: target.linkedinUrl || source.linkedinUrl || null,
        companyId: target.companyId || source.companyId || null,
        tags: [target.tags, source.tags].filter(Boolean).join(', ') || '',
      },
    })
  }

  // Delete source
  await prisma.contact.delete({ where: { id: sourceId } })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const contacts = await prisma.contact.findMany({
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, companyId: true, title: true },
    take: 5000,
  })

  const groups: { contacts: typeof contacts }[] = []
  const seen = new Set<string>()

  // Group by matching email
  const byEmail: Record<string, typeof contacts> = {}
  for (const c of contacts) {
    if (!c.email) continue
    const key = c.email.toLowerCase().trim()
    if (!byEmail[key]) byEmail[key] = []
    byEmail[key].push(c)
  }
  for (const group of Object.values(byEmail)) {
    if (group.length < 2) continue
    const ids = group.map(c => c.id)
    if (ids.some(id => seen.has(id))) continue
    ids.forEach(id => seen.add(id))
    groups.push({ contacts: group })
  }

  // Group by same full name (case-insensitive)
  const byName: Record<string, typeof contacts> = {}
  for (const c of contacts) {
    if (seen.has(c.id)) continue
    const key = `${c.firstName} ${c.lastName}`.toLowerCase().trim()
    if (key.length < 3) continue
    if (!byName[key]) byName[key] = []
    byName[key].push(c)
  }
  for (const group of Object.values(byName)) {
    if (group.length < 2) continue
    group.forEach(c => seen.add(c.id))
    groups.push({ contacts: group })
  }

  return NextResponse.json(groups)
}
