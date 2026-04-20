export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [company, emailLogs, callLogs] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      include: {
        contacts: { include: { _count: { select: { emailLogs: true, callLogs: true } } } },
        deals: { include: { assignedTo: true } },
        notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    }),
    prisma.emailLog.findMany({
      where: { contact: { companyId: id } },
      include: { contact: { select: { id: true, firstName: true, lastName: true } }, user: { select: { id: true, name: true } } },
      orderBy: { sentAt: "desc" },
      take: 200,
    }),
    prisma.callLog.findMany({
      where: { contact: { companyId: id } },
      include: { contact: { select: { id: true, firstName: true, lastName: true } }, user: { select: { id: true, name: true } } },
      orderBy: { calledAt: "desc" },
      take: 200,
    }),
  ]);

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...company, emailLogs, callLogs });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: data.name,
      domain: data.domain,
      industry: data.industry,
      subIndustry: data.subIndustry,
      description: data.description,
      website: data.website,
      linkedinUrl: data.linkedinUrl,
      hqLocation: data.hqLocation,
      employeeCount: data.employeeCount ? parseInt(data.employeeCount) : undefined,
      revenue: data.revenue ? parseFloat(data.revenue) : undefined,
      status: data.status,
      tier: data.tier,
    },
  });

  return NextResponse.json(company);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.company.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
