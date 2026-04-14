import { NextRequest, NextResponse } from "next/server";

const STAGE_WEBHOOKS: Record<string, string> = {
  source: "anatop-source",
  contacts: "anatop-contacts",
  drafts: "anatop-drafts",
  all: "anatop-source",
};

export async function POST(req: NextRequest) {
  const { countries, stage, priority, operator, sheet_id, apollo_key } = await req.json();
  if (!countries?.length || !stage) {
    return NextResponse.json({ error: "countries[] and stage required" }, { status: 400 });
  }

  const path = STAGE_WEBHOOKS[stage] ?? "anatop-source";
  const baseUrl = process.env.N8N_BASE_URL!;
  const sheetId = sheet_id ?? process.env.GOOGLE_SHEET_ID;
  const apolloKey = apollo_key ?? process.env.APOLLO_API_KEY;
  const results: Record<string, unknown>[] = [];

  for (const country of countries) {
    const res = await fetch(`${baseUrl}/webhook/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country,
        priority: priority ?? "P1",
        operator: operator ?? "SCF",
        sheet_id: sheetId,
        apollo_key: apolloKey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    results.push({ country, status: res.status, ...data });
  }

  return NextResponse.json({ triggered: results });
}
