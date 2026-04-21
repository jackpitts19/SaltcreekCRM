export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import OpenAI from "openai"

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const { companyId } = await req.json()
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 })

  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

  const isPE = company.type === "buy_side" || company.tags.includes("pe-firm") || company.tags.includes("family-office")

  const prompt = isPE
    ? `You are a research assistant for Salt Creek Advisory, a lower-middle market M&A investment bank focusing on 1-5mm EBITDA family-owned businesses.

Research the private equity firm or family office: "${company.name}"

Return a JSON object with these fields (use null for anything you can't find):
{
  "description": "2-3 sentence description of what this firm does and their investment focus",
  "industry": "primary industry focus (e.g. 'Private Equity', 'Family Office')",
  "website": "their website URL",
  "linkedinUrl": "their LinkedIn company page URL",
  "hqLocation": "City, State",
  "employeeCount": number or null,
  "recentDeals": ["deal 1 description", "deal 2 description", "deal 3 description"],
  "investmentCriteria": "description of their typical deal size, industry focus, and target criteria",
  "aum": "assets under management if known",
  "tags": ["pe-firm", "buy-side"] or ["family-office", "buy-side"] etc
}

Only return valid JSON, no markdown.`
    : `You are a research assistant for Salt Creek Advisory, a lower-middle market M&A investment bank focusing on 1-5mm EBITDA family-owned businesses.

Research the company: "${company.name}"

Return a JSON object with these fields (use null for anything you can't find):
{
  "description": "2-3 sentence description of what this company does",
  "industry": "primary industry (e.g. 'Manufacturing', 'Business Services', 'Healthcare')",
  "subIndustry": "more specific sub-industry",
  "website": "their website URL",
  "linkedinUrl": "their LinkedIn company page URL",
  "hqLocation": "City, State",
  "employeeCount": estimated number or null,
  "revenue": estimated annual revenue in millions as a number, or null,
  "tags": ["sell-side"] if owner/business, ["service-provider"] if law firm/accounting/lender, ["other"] otherwise
}

Only return valid JSON, no markdown.`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    })

    const raw = response.choices[0].message.content ?? "{}"
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const data = JSON.parse(cleaned)

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        description: data.description ?? company.description,
        industry: data.industry ?? company.industry,
        subIndustry: data.subIndustry ?? company.subIndustry,
        website: data.website ?? company.website,
        linkedinUrl: data.linkedinUrl ?? company.linkedinUrl,
        hqLocation: data.hqLocation ?? company.hqLocation,
        employeeCount: data.employeeCount ?? company.employeeCount,
        revenue: data.revenue ?? company.revenue,
        tags: Array.isArray(data.tags) ? data.tags.join(",") : (data.tags ?? company.tags),
        enrichedAt: new Date(),
      },
    })

    return NextResponse.json({
      company: updated,
      extras: {
        recentDeals: data.recentDeals ?? null,
        investmentCriteria: data.investmentCriteria ?? null,
        aum: data.aum ?? null,
      },
    })
  } catch (err) {
    console.error("Enrichment error:", err)
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 })
  }
}
