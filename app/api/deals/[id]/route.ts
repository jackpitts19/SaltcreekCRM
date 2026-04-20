import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      company: true,
      assignedTo: true,
      contacts: { include: { contact: { include: { company: true } } } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      activities: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();

  const existing = await prisma.deal.findUnique({ where: { id }, select: { stage: true } });

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      name: data.name,
      dealType: data.dealType,
      stage: data.stage,
      value: data.value !== undefined ? parseFloat(data.value) : undefined,
      probability: data.probability !== undefined ? parseInt(data.probability) : undefined,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
      actualCloseDate: data.actualCloseDate ? new Date(data.actualCloseDate) : undefined,
      description: data.description,
      companyId: data.companyId,
      assignedToId: data.assignedToId,
      lostReason: data.lostReason,
      source: data.source,
    },
    include: { company: true, assignedTo: true },
  });

  // Log stage change
  if (data.stage && existing && data.stage !== existing.stage) {
    await prisma.activity.create({
      data: {
        type: "deal_stage_change",
        description: `Stage changed from "${existing.stage}" → "${data.stage}"`,
        dealId: id,
      },
    });
  }

  return NextResponse.json(deal);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.deal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
