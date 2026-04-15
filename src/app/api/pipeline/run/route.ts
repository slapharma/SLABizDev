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
  // Guard: verify required env vars are present before doing anything
  const baseUrl = process.env.N8N_BASE_URL;
  const pipelineWebhook = process.env.N8N_PIPELINE_WEBHOOK;

  if (!baseUrl || !pipelineWebhook) {
    const missing = [
      !baseUrl && "N8N_BASE_URL",
      !pipelineWebhook && "N8N_PIPELINE_WEBHOOK",
    ].filter(Boolean).join(", ");
    return NextResponse.json(
      { error: `Missing environment variables: ${missing}. Set them in the Vercel dashboard → Settings → Environment Variables.` },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { countries, stage, priority, operator, sheet_id, apollo_key, qualify_prompt } = body as {
    countries?: string[];
    stage?: string;
    priority?: string;
    operator?: string;
    sheet_id?: string;
    apollo_key?: string;
    qualify_prompt?: string;
  };

  if (!countries?.length || !stage) {
    return NextResponse.json({ error: "countries[] and stage required" }, { status: 400 });
  }

  const path = STAGE_WEBHOOKS[stage] ?? "anatop-source";
  const sheetId = sheet_id ?? process.env.GOOGLE_SHEET_ID;
  const apolloKey = apollo_key ?? process.env.APOLLO_API_KEY;
  const results: Record<string, unknown>[] = [];

  for (const country of countries) {
    // Log the trigger attempt before calling n8n so it's always visible
    await logTrigger(country, stage, operator ?? "SCF", pipelineWebhook);

    let status = 0;
    let data: Record<string, unknown> = {};

    try {
      const res = await fetch(`${baseUrl}/webhook/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          priority: priority ?? "P1",
          operator: operator ?? "SCF",
          sheet_id: sheetId,
          apollo_key: apolloKey,
          ...(qualify_prompt ? { qualify_prompt } : {}),
        }),
      });
      status = res.status;
      data = await res.json().catch(() => ({}));

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
              res.ok ? "n8n_accepted" : "n8n_rejected",
              `n8n responded ${res.status} for ${stage}/${country}${!res.ok ? ` — ${JSON.stringify(data)}` : ""}`,
              operator ?? "SCF",
            ],
          }),
        });
      } catch { /* non-fatal */ }

    } catch (err) {
      // Network / URL error — log it and continue to next country
      const msg = err instanceof Error ? err.message : String(err);
      status = 0;
      data = { error: msg };

      try {
        await fetch(pipelineWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "append_activity",
            row: [
              new Date().toISOString(),
              "",
              "n8n_rejected",
              `fetch failed for ${stage}/${country} — ${msg}`,
              operator ?? "SCF",
            ],
          }),
        });
      } catch { /* non-fatal */ }
    }

    results.push({ country, status, ...data });
  }

  return NextResponse.json({ triggered: results });
}
