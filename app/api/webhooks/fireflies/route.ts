export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface FirefliesSummary {
  keywords?: string[];
  action_items?: string[];
  overview?: string;
  short_summary?: string;
  outline?: string;
}

interface FirefliesPayload {
  meetingId?: string;
  title?: string;
  date?: number; // Unix timestamp (seconds)
  duration?: number; // seconds
  transcript?: string;
  summary?: FirefliesSummary;
  participants?: string[]; // email addresses
  host_email?: string;
  video_url?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Optional secret token validation — add FIREFLIES_WEBHOOK_SECRET to .env
    // and append it to the webhook URL as ?secret=yourtoken
    const secret = process.env.FIREFLIES_WEBHOOK_SECRET;
    if (secret) {
      const provided = req.nextUrl.searchParams.get("secret");
      if (provided !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const payload: FirefliesPayload = await req.json();
    const {
      title,
      date,
      duration,
      transcript,
      summary,
      participants = [],
      host_email,
      video_url,
    } = payload;

    const meetingDate = date ? new Date(date * 1000) : new Date();
    const meetingTitle = title ?? "Untitled Meeting";
    const durationStr = duration
      ? `${Math.floor(duration / 60)}m ${duration % 60}s`
      : null;

    // Build note content from AI summary
    const summaryText = summary?.overview ?? summary?.short_summary ?? "";
    const actionItems = summary?.action_items ?? [];

    let noteContent = summaryText ? `**Summary**\n${summaryText}\n\n` : "";
    if (actionItems.length > 0) {
      noteContent += `**Action Items**\n${actionItems.map((a) => `- ${a}`).join("\n")}\n\n`;
    }
    if (summary?.outline) {
      noteContent += `**Outline**\n${summary.outline}\n\n`;
    }
    if (video_url) noteContent += `[View Recording on Fireflies](${video_url})`;
    if (!noteContent.trim()) noteContent = `Meeting recorded: ${meetingTitle}`;

    // Collect all participant emails (deduplicated)
    const allEmails = [...new Set([...participants, ...(host_email ? [host_email] : [])])];

    // Find CRM contacts matching any participant email
    const matchedContacts =
      allEmails.length > 0
        ? await prisma.contact.findMany({
            where: { email: { in: allEmails } },
            select: { id: true, email: true, firstName: true, lastName: true },
          })
        : [];

    if (matchedContacts.length > 0) {
      await Promise.all([
        // Create a note on each matched contact
        ...matchedContacts.map((contact) =>
          prisma.note.create({
            data: {
              content: noteContent,
              source: "fireflies",
              meetingTitle,
              transcript: transcript ?? null,
              meetingDate,
              contactId: contact.id,
            },
          })
        ),
        // Create an activity entry for each matched contact
        ...matchedContacts.map((contact) =>
          prisma.activity.create({
            data: {
              type: "meeting",
              description: `Fireflies: ${meetingTitle}${durationStr ? ` (${durationStr})` : ""}`,
              contactId: contact.id,
            },
          })
        ),
        // Update lastContactedAt
        ...matchedContacts.map((contact) =>
          prisma.contact.update({
            where: { id: contact.id },
            data: { lastContactedAt: meetingDate },
          })
        ),
      ]);
    } else {
      // No contacts matched — save as an unlinked note so the transcript isn't lost
      await prisma.note.create({
        data: {
          content: noteContent,
          source: "fireflies",
          meetingTitle,
          transcript: transcript ?? null,
          meetingDate,
        },
      });
    }

    const matched = matchedContacts.map((c) => `${c.firstName} ${c.lastName}`);
    console.log(
      `[Fireflies] "${meetingTitle}" — matched ${matchedContacts.length} contact(s)${matched.length ? `: ${matched.join(", ")}` : ""}`
    );

    return NextResponse.json({ ok: true, matched: matchedContacts.length, contacts: matched });
  } catch (err) {
    console.error("[Fireflies Webhook Error]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Fireflies webhook endpoint active" });
}
