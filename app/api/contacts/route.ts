export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const companyId = searchParams.get("companyId") ?? "";

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
        companyId ? { companyId } : {},
      ],
    },
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { emailLogs: true, callLogs: true, notes: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  // Auto-create company if a name was provided but no companyId
  let companyId = data.companyId ?? null;
  let isNewCompany = false;

  if (!companyId && data.companyName?.trim()) {
    const name = data.companyName.trim();
    const existing = await prisma.company.findFirst({
      where: { name: { equals: name } },
    });
    if (existing) {
      companyId = existing.id;
    } else {
      const created = await prisma.company.create({
        data: {
          name,
          type: data.companyType ?? "other",
          status: "prospect",
        },
      });
      companyId = created.id;
      isNewCompany = true;
    }
  }

  const contact = await prisma.contact.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      mobile: data.mobile ?? null,
      title: data.title ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      companyId,
      status: data.status ?? "prospect",
      leadSource: data.leadSource ?? null,
      tags: data.tags ?? "",
    },
    include: { company: true },
  });

  await prisma.activity.create({
    data: {
      type: "contact_created",
      description: `Contact ${contact.firstName} ${contact.lastName} created`,
      contactId: contact.id,
    },
  });

  // Kick off AI enrichment in the background for new companies
  if (isNewCompany && companyId) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    fetch(`${baseUrl}/api/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    }).catch(() => {}); // fire-and-forget
  }

  return NextResponse.json({ ...contact, isNewCompany }, { status: 201 });
}
