export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage") ?? "";
  const companyId = searchParams.get("companyId") ?? "";
  const search = searchParams.get("search") ?? "";

  const deals = await prisma.deal.findMany({
    where: {
      AND: [
        stage ? { stage } : {},
        companyId ? { companyId } : {},
        search ? { name: { contains: search } } : {},
      ],
    },
    include: {
      company: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      contacts: { include: { contact: { select: { id: true, firstName: true, lastName: true, title: true } } } },
      _count: { select: { notes: true, activities: true } },
    },
    orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  const deal = await prisma.deal.create({
    data: {
      name: data.name,
      dealType: data.dealType ?? "ma_sellside",
      stage: data.stage ?? "prospect",
      value: data.value ? parseFloat(data.value) : null,
      probability: 0,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      description: data.description ?? null,
      companyId: data.companyId ?? null,
      assignedToId: data.assignedToId ?? null,
      source: data.source ?? null,
    },
    include: {
      company: true,
      assignedTo: true,
    },
  });

  // Link contact to deal if provided
  if (data.contactId) {
    await prisma.dealContact.create({
      data: { dealId: deal.id, contactId: data.contactId, role: data.contactRole ?? null },
    });
  }

  await prisma.activity.create({
    data: {
      type: "deal_created",
      description: `Deal "${deal.name}" created`,
      dealId: deal.id,
      companyId: deal.companyId ?? undefined,
      contactId: data.contactId ?? undefined,
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
