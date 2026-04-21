export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import OpenAI from "openai"

// Twilio sends a POST here when a call recording is ready
// Set RECORDING_CALLBACK_URL=https://your-domain.com/api/dialer/recording in .env.local
export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const form = await req.formData()
  const callSid = form.get("CallSid")?.toString() ?? ""
  const recordingUrl = form.get("RecordingUrl")?.toString() ?? ""
  const recordingStatus = form.get("RecordingStatus")?.toString() ?? ""
  const recordingDuration = parseInt(form.get("RecordingDuration")?.toString() ?? "0", 10)

  if (recordingStatus !== "completed" || !recordingUrl) {
    return NextResponse.json({ ok: true })
  }

  // Find the call log by Twilio SID (stored when we placed the call)
  const callLog = await prisma.callLog.findFirst({
    where: { kixieCallId: callSid },
    include: { contact: true },
  })

  try {
    // Download the recording (MP3) from Twilio with Basic Auth
    const authHeader = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64")

    const audioRes = await fetch(`${recordingUrl}.mp3`, {
      headers: { Authorization: `Basic ${authHeader}` },
    })
    if (!audioRes.ok) throw new Error("Failed to download recording")

    const audioBuffer = await audioRes.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" })
    const audioFile = new File([audioBlob], "call-recording.mp3", { type: "audio/mpeg" })

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    })
    const transcript = transcription.text

    if (!transcript?.trim()) {
      return NextResponse.json({ ok: true })
    }

    // Generate a brief summary
    const summaryRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a CRM assistant. Summarize this phone call transcript in 2-3 sentences. Be concise and focus on key outcomes and next steps.",
        },
        { role: "user", content: transcript },
      ],
      max_tokens: 150,
    })
    const summary = summaryRes.choices[0]?.message?.content ?? ""

    const durationStr = recordingDuration > 0
      ? ` (${Math.floor(recordingDuration / 60)}m ${recordingDuration % 60}s)`
      : ""

    const noteContent = summary
      ? `📞 Call Recording${durationStr}\n\n${summary}\n\n---\n*Full transcript available in call log.*`
      : `📞 Call Recording Transcript${durationStr}\n\n${transcript}`

    // Save note and update call log recording URL
    await Promise.all([
      callLog?.contact?.id
        ? prisma.note.create({
            data: {
              content: noteContent,
              source: "call",
              transcript,
              contactId: callLog.contact.id,
            },
          })
        : Promise.resolve(),
      callLog
        ? prisma.callLog.update({
            where: { id: callLog.id },
            data: { recording: recordingUrl },
          })
        : Promise.resolve(),
    ])
  } catch (err) {
    console.error("[recording webhook]", err)
  }

  return NextResponse.json({ ok: true })
}
