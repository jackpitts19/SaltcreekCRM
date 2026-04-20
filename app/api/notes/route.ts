import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const companyId = searchParams.get("companyId");
  const dealId = searchParams.get("dealId");

  const notes = await prisma.note.findMany({
    where: {
      AND: [
        contactId ? { contactId } : {},
        companyId ? { companyId } : {},
        dealId ? { dealId } : {},
      ],
    },
    include: {
      author: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
      deal: { select: { id: true, name: true } },
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  const note = await prisma.note.create({
    data: {
      content: data.content,
      authorId: data.authorId ?? null,
      contactId: data.contactId ?? null,
      companyId: data.companyId ?? null,
      dealId: data.dealId ?? null,
      isPinned: data.isPinned ?? false,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  await prisma.activity.create({
    data: {
      type: "note",
      description: `Note added: "${data.content.slice(0, 60)}${data.content.length > 60 ? "..." : ""}"`,
      contactId: data.contactId ?? undefined,
      companyId: data.companyId ?? undefined,
      dealId: data.dealId ?? undefined,
    },
  });

  return NextResponse.json(note, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data = await req.json();

  const note = await prisma.note.update({
    where: { id },
    data: {
      content: data.content,
      isPinned: data.isPinned,
    },
  });

  return NextResponse.json(note);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
