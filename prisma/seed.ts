import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean slate
  await prisma.activity.deleteMany();
  await prisma.sequenceEnrollment.deleteMany();
  await prisma.sequenceStep.deleteMany();
  await prisma.sequence.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.callLog.deleteMany();
  await prisma.note.deleteMany();
  await prisma.dealContact.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const user = await prisma.user.create({
    data: { name: "Jack Pitts", email: "jack@saltcreekadvisory.com", role: "managing_director", title: "Managing Director" },
  });
  const associate = await prisma.user.create({
    data: { name: "Connor Pitts", email: "connor@saltcreekadvisory.com", role: "associate", title: "Associate" },
  });

  // Companies
  const blackstone = await prisma.company.create({ data: { name: "Blackstone Capital", industry: "Private Equity", tier: "1", website: "https://blackstone.com", hqLocation: "New York, NY" } });
  const apex = await prisma.company.create({ data: { name: "Apex Industrial Partners", industry: "Manufacturing", tier: "2", revenue: 840, website: "https://apexindustrial.com", hqLocation: "Chicago, IL" } });
  const meridian = await prisma.company.create({ data: { name: "Meridian Healthcare Group", industry: "Healthcare", tier: "1", revenue: 2100, website: "https://meridianhealthcare.com", hqLocation: "Boston, MA" } });
  const vantage = await prisma.company.create({ data: { name: "Vantage Tech Solutions", industry: "Technology", tier: "2", revenue: 120, website: "https://vantagetech.com", hqLocation: "Austin, TX" } });
  const harbor = await prisma.company.create({ data: { name: "Harbor Logistics Corp", industry: "Logistics", tier: "3", revenue: 310, website: "https://harborlogistics.com", hqLocation: "Houston, TX" } });
  const summit = await prisma.company.create({ data: { name: "Summit Renewables", industry: "Energy", tier: "2", revenue: 450, website: "https://summitrenewables.com", hqLocation: "Denver, CO" } });

  // Contacts
  const michael = await prisma.contact.create({ data: { firstName: "Michael", lastName: "Ross", email: "michael.ross@blackstone.com", phone: "+1 212 555 0100", title: "Managing Director", status: "active", leadSource: "referral", companyId: blackstone.id, lastContactedAt: new Date(Date.now() - 2 * 86400000) } });
  await prisma.contact.create({ data: { firstName: "Jessica", lastName: "Wang", email: "jessica.wang@blackstone.com", phone: "+1 212 555 0101", title: "Vice President", status: "active", leadSource: "referral", companyId: blackstone.id, lastContactedAt: new Date(Date.now() - 5 * 86400000) } });
  const david = await prisma.contact.create({ data: { firstName: "David", lastName: "Chen", email: "david.chen@apexindustrial.com", phone: "+1 312 555 0200", title: "CEO", status: "prospect", leadSource: "linkedin", companyId: apex.id, lastContactedAt: new Date(Date.now() - 10 * 86400000) } });
  const karen = await prisma.contact.create({ data: { firstName: "Karen", lastName: "Miller", email: "karen.miller@meridian.com", phone: "+1 617 555 0300", title: "CFO", status: "active", leadSource: "conference", companyId: meridian.id, lastContactedAt: new Date(Date.now() - 1 * 86400000) } });
  const tom = await prisma.contact.create({ data: { firstName: "Tom", lastName: "Davidson", email: "tom.davidson@meridian.com", phone: "+1 617 555 0301", title: "CEO", status: "active", leadSource: "conference", companyId: meridian.id, lastContactedAt: new Date(Date.now() - 3 * 86400000) } });
  const alex = await prisma.contact.create({ data: { firstName: "Alex", lastName: "Kumar", email: "alex.kumar@vantagetech.com", phone: "+1 512 555 0400", title: "Founder & CEO", status: "prospect", leadSource: "linkedin", companyId: vantage.id, lastContactedAt: new Date(Date.now() - 7 * 86400000) } });
  const robert = await prisma.contact.create({ data: { firstName: "Robert", lastName: "Kim", email: "robert.kim@harborlogistics.com", phone: "+1 713 555 0500", title: "Owner", status: "prospect", leadSource: "cold_outreach", companyId: harbor.id, lastContactedAt: new Date(Date.now() - 14 * 86400000) } });
  const lisa = await prisma.contact.create({ data: { firstName: "Lisa", lastName: "Park", email: "lisa.park@summitrenewables.com", phone: "+1 303 555 0600", title: "CFO", status: "active", leadSource: "inbound", companyId: summit.id, lastContactedAt: new Date(Date.now() - 4 * 86400000) } });

  // Deals
  const meridianDeal = await prisma.deal.create({ data: { name: "Meridian Healthcare — M&A Sell-Side", stage: "diligence", dealType: "ma_sellside", value: 2800, probability: 65, expectedCloseDate: new Date(Date.now() + 90 * 86400000), description: "Full sell-side advisory mandate. 4 LOIs received, strategic buyer process underway.", assignedToId: user.id, companyId: meridian.id } });
  const apexDeal = await prisma.deal.create({ data: { name: "Apex Industrial — M&A Buy-Side", stage: "pitch", dealType: "ma_buyside", value: 450, probability: 35, expectedCloseDate: new Date(Date.now() + 120 * 86400000), description: "Advising Blackstone Capital on acquisition of Apex Industrial Partners.", assignedToId: user.id, companyId: apex.id } });
  const summitDeal = await prisma.deal.create({ data: { name: "Summit Renewables — Project Finance", stage: "loi", dealType: "debt", value: 320, probability: 70, expectedCloseDate: new Date(Date.now() + 60 * 86400000), description: "Green energy debt financing for 200MW wind portfolio. Term sheet submitted.", assignedToId: associate.id, companyId: summit.id } });
  const vantageDeal = await prisma.deal.create({ data: { name: "Vantage Tech — Series D Equity", stage: "initial_contact", dealType: "equity", value: 75, probability: 20, expectedCloseDate: new Date(Date.now() + 180 * 86400000), description: "Equity raise advisory for Vantage Tech Series D.", assignedToId: associate.id, companyId: vantage.id } });
  const harborDeal = await prisma.deal.create({ data: { name: "Harbor Logistics — Owner Liquidity", stage: "prospecting", dealType: "ma_sellside", value: 180, probability: 15, expectedCloseDate: new Date(Date.now() + 240 * 86400000), description: "Owner exploring liquidity options. Strategic sale or recap.", assignedToId: user.id, companyId: harbor.id } });

  // Deal contacts
  await prisma.dealContact.createMany({ data: [
    { dealId: meridianDeal.id, contactId: karen.id, role: "Primary Contact" },
    { dealId: meridianDeal.id, contactId: tom.id, role: "Executive Sponsor" },
    { dealId: apexDeal.id, contactId: david.id, role: "Target CEO" },
    { dealId: apexDeal.id, contactId: michael.id, role: "Buyer" },
    { dealId: summitDeal.id, contactId: lisa.id, role: "Primary Contact" },
    { dealId: vantageDeal.id, contactId: alex.id, role: "Founder" },
    { dealId: harborDeal.id, contactId: robert.id, role: "Owner" },
  ]});

  // Notes
  await prisma.note.createMany({ data: [
    { content: "Strong relationship with MD. Ready to move on Apex acquisition if valuation is right. Prefers weekly updates.", contactId: michael.id, authorId: user.id, isPinned: true },
    { content: "Confirmed 4 LOIs received. Blackstone and two strategics are frontrunners. Final bids expected by end of Q1.", dealId: meridianDeal.id, authorId: user.id, isPinned: true },
    { content: "Karen flagged interest in management rollover for any transaction. Should structure deal accordingly.", contactId: karen.id, dealId: meridianDeal.id, authorId: user.id },
    { content: "David Chen open to a sale but wants to stay involved post-close as President. May need earnout structure.", contactId: david.id, companyId: apex.id, authorId: user.id },
    { content: "Lisa confirmed financing needs to close before Q3 to hit construction timeline. Green light to proceed.", contactId: lisa.id, dealId: summitDeal.id, authorId: associate.id },
    { content: "Robert is 62, kids not interested in the business. Motivated seller but needs 6-month transition post-close.", contactId: robert.id, companyId: harbor.id, authorId: user.id },
  ]});

  // Emails
  await prisma.emailLog.createMany({ data: [
    { subject: "Meridian Healthcare — Process Update", body: "Karen, wanted to share a quick update on the process. We have received 4 LOIs and are evaluating the bids...", direction: "outbound", fromEmail: "jack@saltcreekadvisory.com", toEmail: "karen.miller@meridian.com", status: "sent", contactId: karen.id, sentAt: new Date(Date.now() - 1 * 86400000) },
    { subject: "Re: Meridian Healthcare — Process Update", body: "Jack, thank you for the update. Can we schedule a call to discuss the LOIs?", direction: "inbound", fromEmail: "karen.miller@meridian.com", toEmail: "jack@saltcreekadvisory.com", status: "opened", contactId: karen.id, sentAt: new Date(Date.now() - 23 * 3600000) },
    { subject: "Apex Industrial — Initial Pitch Materials", body: "Michael, please find attached our preliminary analysis on Apex Industrial...", direction: "outbound", fromEmail: "jack@saltcreekadvisory.com", toEmail: "michael.ross@blackstone.com", status: "sent", contactId: michael.id, sentAt: new Date(Date.now() - 5 * 86400000) },
    { subject: "Summit Renewables — Term Sheet Follow-up", body: "Lisa, following up on the term sheet we sent last week. Happy to walk through any questions...", direction: "outbound", fromEmail: "connor@saltcreekadvisory.com", toEmail: "lisa.park@summitrenewables.com", status: "opened", contactId: lisa.id, sentAt: new Date(Date.now() - 3 * 86400000) },
    { subject: "Introduction — Investment Banking Services", body: "Robert, I hope this message finds you well. I'm reaching out as we've been following Harbor Logistics...", direction: "outbound", fromEmail: "jack@saltcreekadvisory.com", toEmail: "robert.kim@harborlogistics.com", status: "sent", contactId: robert.id, sentAt: new Date(Date.now() - 14 * 86400000) },
  ]});

  // Calls
  await prisma.callLog.createMany({ data: [
    { direction: "outbound", duration: 1800, status: "completed", fromNumber: "+12125559999", toNumber: "+16175550300", notes: "Discussed Meridian process. Karen confirmed management team is aligned. Set next call Monday.", contactId: karen.id, calledAt: new Date(Date.now() - 1 * 86400000) },
    { direction: "outbound", duration: 2700, status: "completed", fromNumber: "+12125559999", toNumber: "+12125550100", notes: "Michael very bullish on Apex. Wants updated financials. Said Blackstone could move fast.", contactId: michael.id, calledAt: new Date(Date.now() - 2 * 86400000) },
    { direction: "outbound", duration: 0, status: "voicemail", fromNumber: "+12125559999", toNumber: "+13035550600", notes: "Left voicemail about term sheet status.", contactId: lisa.id, calledAt: new Date(Date.now() - 4 * 86400000) },
    { direction: "inbound", duration: 900, status: "completed", fromNumber: "+16175550301", toNumber: "+12125559999", notes: "Tom called to discuss board update. Wants deal closed before fiscal year end.", contactId: tom.id, calledAt: new Date(Date.now() - 3 * 86400000) },
    { direction: "outbound", duration: 1200, status: "completed", fromNumber: "+12125559999", toNumber: "+17135550500", notes: "Warm reception from Robert. Interested in exploring options. Agreed to meet next week.", contactId: robert.id, calledAt: new Date(Date.now() - 10 * 86400000) },
  ]});

  // Sequences
  const seq1 = await prisma.sequence.create({ data: { name: "M&A Sell-Side Outreach", description: "Initial outreach for potential sell-side mandates", status: "active", createdById: user.id } });
  const seq2 = await prisma.sequence.create({ data: { name: "PE Firm Coverage", description: "Regular touch-base for private equity relationships", status: "active", createdById: user.id } });

  await prisma.sequenceStep.createMany({ data: [
    { sequenceId: seq1.id, stepNumber: 1, type: "email", delayDays: 0, subject: "Introduction from [Your Name]", body: "Hi {{firstName}},\n\nI'm reaching out from [Firm] to introduce our M&A advisory services. We specialize in your sector and have a strong track record of premium valuations.\n\nWould you be open to a brief call?\n\nBest,\n[Name]" },
    { sequenceId: seq1.id, stepNumber: 2, type: "call", delayDays: 3, taskNote: "Follow-up call. Ask about M&A readiness and timeline." },
    { sequenceId: seq1.id, stepNumber: 3, type: "email", delayDays: 7, subject: "Relevant transaction comparables", body: "Hi {{firstName}},\n\nFollowing up — sharing some relevant comparables in your sector...\n\nBest,\n[Name]" },
    { sequenceId: seq1.id, stepNumber: 4, type: "linkedin", delayDays: 14, taskNote: "Connect on LinkedIn referencing our email exchange." },
    { sequenceId: seq2.id, stepNumber: 1, type: "email", delayDays: 0, subject: "Deal flow update — Q1 highlights", body: "Hi {{firstName}},\n\nWanted to share a few highlights from our current deal flow that might fit your investment thesis...\n\nBest,\n[Name]" },
    { sequenceId: seq2.id, stepNumber: 2, type: "call", delayDays: 5, taskNote: "Quarterly touch-base. Discuss new opportunities and market outlook." },
    { sequenceId: seq2.id, stepNumber: 3, type: "email", delayDays: 30, subject: "Dinner invitation — Banker Roundtable", body: "Hi {{firstName}},\n\nI'd like to invite you to our annual banker roundtable dinner...\n\nBest,\n[Name]" },
  ]});

  // Activities
  const acts = [
    { type: "deal_created", description: "Deal created: Meridian Healthcare — M&A Sell-Side", dealId: meridianDeal.id, userId: user.id, h: 96 },
    { type: "stage_changed", description: "Deal moved to Diligence: Meridian Healthcare", dealId: meridianDeal.id, userId: user.id, h: 72 },
    { type: "deal_created", description: "Deal created: Summit Renewables — Project Finance", dealId: summitDeal.id, userId: associate.id, h: 48 },
    { type: "stage_changed", description: "Deal moved to LOI: Summit Renewables", dealId: summitDeal.id, userId: associate.id, h: 36 },
    { type: "contact_created", description: "Contact added: Karen Miller (Meridian Healthcare)", contactId: karen.id, userId: user.id, h: 120 },
    { type: "note", description: "Note added on Meridian Healthcare deal", dealId: meridianDeal.id, userId: user.id, h: 24 },
    { type: "call", description: "Outbound call with Karen Miller — 30 min", contactId: karen.id, userId: user.id, h: 23 },
    { type: "email", description: "Email sent: Meridian Healthcare Process Update", contactId: karen.id, userId: user.id, h: 22 },
    { type: "email", description: "Email reply received from Karen Miller", contactId: karen.id, userId: user.id, h: 1 },
  ];

  for (const { h, ...a } of acts) {
    await prisma.activity.create({ data: { ...a, createdAt: new Date(Date.now() - h * 3600000) } });
  }

  console.log("✅ Seed complete! 6 companies · 8 contacts · 5 deals · 2 sequences");
}

main().catch(console.error).finally(() => prisma.$disconnect());
