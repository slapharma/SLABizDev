import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const STAGE_PATHS: Record<string, string> = {
  source: "anatop-source",
  contacts: "anatop-contacts",
  drafts: "anatop-drafts",
  all: "anatop-source", // WF2 chains to WF3/4 internally (future)
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { countries, stage, priority, operator } = await req.json();
  if (!countries?.length || !stage) {
    return NextResponse.json({ error: "countries[] and stage required" }, { status: 400 });
  }

  const path = STAGE_PATHS[stage] ?? "anatop-source";
  const baseUrl = process.env.N8N_BASE_URL!;
  const results: Record<string, unknown>[] = [];

  for (const country of countries) {
    const res = await fetch(`${baseUrl}/webhook/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: `run_${stage}`,
        country,
        priority: priority ?? "P1",
        operator: operator ?? session.user?.name ?? "SCF",
      }),
    });
    const data = await res.json().catch(() => ({}));
    results.push({ country, status: res.status, ...data });
  }

  return NextResponse.json({ triggered: results });
}
