export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const companies = await prisma.company.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search } },
                { industry: { contains: search } },
                { hqLocation: { contains: search } },
              ],
            }
          : {},
        status ? { status } : {},
      ],
    },
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  const company = await prisma.company.create({
    data: {
      name: data.name,
      domain: data.domain ?? null,
      industry: data.industry ?? null,
      subIndustry: data.subIndustry ?? null,
      description: data.description ?? null,
      website: data.website ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      hqLocation: data.hqLocation ?? null,
      employeeCount: data.employeeCount ? parseInt(data.employeeCount) : null,
      revenue: data.revenue ? parseFloat(data.revenue) : null,
      status: data.status ?? "prospect",
      tier: data.tier ?? "tier3",
    },
  });

  return NextResponse.json(company, { status: 201 });
}
