export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get("contactId") ?? ""
  const companyId = searchParams.get("companyId") ?? ""
  const dealId = searchParams.get("dealId") ?? ""
  const status = searchParams.get("status") ?? ""

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        contactId ? { contactId } : {},
        companyId ? { companyId } : {},
        dealId ? { dealId } : {},
        status ? { status } : {},
      ],
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
      deal: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const data = await req.json()

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority ?? "medium",
      status: "pending",
      contactId: data.contactId ?? null,
      companyId: data.companyId ?? null,
      dealId: data.dealId ?? null,
      assignedToId: data.assignedToId ?? null,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
      deal: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(task, { status: 201 })
}
