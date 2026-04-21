export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/sequences/process
// Advances all active enrollments whose next step is due.
// Creates a Task for each due step so the user knows what to do.
export async function POST() {
  // Load all active enrollments with their sequence steps
  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: { status: "active" },
    include: {
      sequence: {
        include: { steps: { orderBy: { stepNumber: "asc" } } },
      },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  let processed = 0;
  const now = new Date();

  for (const enrollment of enrollments) {
    const steps = enrollment.sequence.steps;
    const nextStepIndex = enrollment.currentStep; // 0-based index into steps array

    if (nextStepIndex >= steps.length) {
      // All steps done — mark complete
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "completed", completedAt: now },
      });
      continue;
    }

    const step = steps[nextStepIndex];

    // Calculate when this step is due
    // Step 0: due immediately (at enrolledAt + 0 days)
    // Step N: due at enrolledAt + sum of all delayDays up to this step
    const totalDelayDays = steps
      .slice(0, nextStepIndex + 1)
      .reduce((sum, s) => sum + s.delayDays, 0);

    const dueAt = new Date(enrollment.enrolledAt);
    dueAt.setDate(dueAt.getDate() + totalDelayDays);

    if (dueAt > now) continue; // not due yet

    // Create a task for this step
    const taskTitle = step.type === "email"
      ? `Send email: "${step.subject ?? "Follow-up"}" to ${enrollment.contact.firstName} ${enrollment.contact.lastName}`
      : step.type === "call"
      ? `Call ${enrollment.contact.firstName} ${enrollment.contact.lastName}`
      : step.type === "linkedin"
      ? `LinkedIn outreach to ${enrollment.contact.firstName} ${enrollment.contact.lastName}`
      : `${enrollment.sequence.name} — Step ${step.stepNumber}: ${step.taskNote ?? "Complete task"}`;

    await prisma.task.create({
      data: {
        title: taskTitle,
        description: step.body ?? step.taskNote ?? null,
        type: step.type === "email" ? "email" : step.type === "call" ? "call" : "other",
        status: "pending",
        priority: "medium",
        dueDate: dueAt,
        contactId: enrollment.contactId,
      },
    });

    // Advance the enrollment to the next step
    const isLast = nextStepIndex + 1 >= steps.length;
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentStep: nextStepIndex + 1,
        ...(isLast ? { status: "completed", completedAt: now } : {}),
      },
    });

    processed++;
  }

  return NextResponse.json({ processed });
}
