import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const sequences = await prisma.sequence.findMany({
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sequences);
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  const sequence = await prisma.sequence.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? "active",
      steps: data.steps
        ? {
            create: data.steps.map(
              (
                step: {
                  stepNumber: number;
                  type: string;
                  delayDays: number;
                  subject?: string;
                  body?: string;
                  taskNote?: string;
                },
                i: number
              ) => ({
                stepNumber: step.stepNumber ?? i + 1,
                type: step.type,
                delayDays: step.delayDays ?? 0,
                subject: step.subject ?? null,
                body: step.body ?? null,
                taskNote: step.taskNote ?? null,
              })
            ),
          }
        : undefined,
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      _count: { select: { enrollments: true } },
    },
  });

  return NextResponse.json(sequence, { status: 201 });
}
