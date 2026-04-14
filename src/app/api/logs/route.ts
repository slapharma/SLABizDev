import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ActivityRow {
  timestamp: string;
  leadId: string;
  action: string;
  detail: string;
  by: string;
}

interface Lead {
  id: string;
  country: string;
  status: string;
}

export async function GET() {
  const pipelineWebhook = process.env.N8N_PIPELINE_WEBHOOK;

  if (!pipelineWebhook) {
    return NextResponse.json(
      { error: "N8N_PIPELINE_WEBHOOK environment variable is not set." },
      { status: 500 }
    );
  }

  try {
    // Fetch activity and leads in parallel from n8n Data Webhook (no OAuth needed)
    const [activityRes, leadsRes] = await Promise.all([
      fetch(pipelineWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_activity" }),
        cache: "no-store",
      }),
      fetch(pipelineWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_leads" }),
        cache: "no-store",
      }),
    ]);

    if (!activityRes.ok) {
      const text = await activityRes.text().catch(() => "");
      throw new Error(
        `n8n get_activity failed (${activityRes.status}): ${text.slice(0, 300)}`
      );
    }
    if (!leadsRes.ok) {
      const text = await leadsRes.text().catch(() => "");
      throw new Error(
        `n8n get_leads failed (${leadsRes.status}): ${text.slice(0, 300)}`
      );
    }

    const activityData = await activityRes.json();
    const leadsData = await leadsRes.json();

    const activity: ActivityRow[] = activityData.activity ?? [];
    const leads: Lead[] = leadsData.leads ?? [];

    // Build per-country status rollup from leads
    const countriesFromLeads = [...new Set(leads.map((l) => l.country))].filter(Boolean);
    const countryMap = new Map<string, { totalLeads: number; statusCounts: Record<string, number>; lastEvent: ActivityRow | null }>();

    for (const country of countriesFromLeads) {
      const countryLeads = leads.filter((l) => l.country === country);
      const statusCounts = countryLeads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const countryLeadIds = new Set(countryLeads.map((l) => l.id).filter(Boolean));
      const countryEvents = activity.filter(
        (a) =>
          (a.leadId && countryLeadIds.has(a.leadId)) ||
          a.detail.toLowerCase().includes(country.toLowerCase())
      );

      countryMap.set(country, {
        totalLeads: countryLeads.length,
        statusCounts,
        lastEvent: countryEvents[0] ?? null,
      });
    }

    // Also surface countries that appear only in activity (pipeline triggered but no leads yet)
    for (const row of activity) {
      const m = row.detail.match(/for ([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)*)/);
      if (m) {
        const country = m[1];
        if (!countryMap.has(country)) {
          const events = activity.filter((a) =>
            a.detail.toLowerCase().includes(country.toLowerCase())
          );
          countryMap.set(country, { totalLeads: 0, statusCounts: {}, lastEvent: events[0] ?? null });
        }
      }
    }

    const countryStatus = Array.from(countryMap.entries()).map(([country, data]) => ({
      country,
      ...data,
    }));

    return NextResponse.json({ activity, countryStatus });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
