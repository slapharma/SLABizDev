import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const pipelineWebhook = process.env.N8N_PIPELINE_WEBHOOK;

  if (!pipelineWebhook) {
    return NextResponse.json(
      { error: "N8N_PIPELINE_WEBHOOK environment variable is not set." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(pipelineWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_leads" }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`n8n get_leads failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    return NextResponse.json({ leads: data.leads ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
