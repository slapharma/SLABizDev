import { NextRequest, NextResponse } from "next/server";

const STAGE_WEBHOOKS: Record<string, string> = {
  source: "anatop-source",
  contacts: "anatop-contacts",
  drafts: "anatop-drafts",
  all: "anatop-source",
};

async function logTrigger(country: string, stage: string, operator: string, pipelineWebhook: string) {
  try {
    await fetch(pipelineWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "append_activity",
        row: [
          new Date().toISOString(),
          "",
          "pipeline_triggered",
          `${stage} triggered for ${country}`,
          operator,
        ],
      }),
    });
  } catch {
    // Non-fatal — don't block the pipeline trigger if logging fails
  }
}

export async function POST(req: NextRequest) {
  const { countries, stage, priority, operator, sheet_id, apollo_key } = await req.json();
  if (!countries?.length || !stage) {
    return NextResponse.json({ error: "countries[] and stage required" }, { status: 400 });
  }

  const path = STAGE_WEBHOOKS[stage] ?? "anatop-source";
  const baseUrl = process.env.N8N_BASE_URL!;
  const pipelineWebhook = process.env.N8N_PIPELINE_WEBHOOK!;
  const sheetId = sheet_id ?? process.env.GOOGLE_SHEET_ID;
  const apolloKey = apollo_key ?? process.env.APOLLO_API_KEY;
  const results: Record<string, unknown>[] = [];

  for (const country of countries) {
    // Log the trigger attempt before calling n8n so it's always visible
    await logTrigger(country, stage, operator ?? "SCF", pipelineWebhook);

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
    const n8nOk = res.ok;

    // Log n8n trigger result (accepted vs rejected)
    try {
      await fetch(pipelineWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "append_activity",
          row: [
            new Date().toISOString(),
            "",
            n8nOk ? "n8n_accepted" : "n8n_rejected",
            `n8n responded ${res.status} for ${stage}/${country}${!n8nOk ? ` — ${JSON.stringify(data)}` : ""}`,
            operator ?? "SCF",
          ],
        }),
      });
    } catch { /* non-fatal */ }

    results.push({ country, status: res.status, ...data });
  }

  return NextResponse.json({ triggered: results });
}
