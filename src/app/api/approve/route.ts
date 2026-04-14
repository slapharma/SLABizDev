import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { lead_id, sent_date, contact_email, contact_name, company, country } = body;

  if (!lead_id || !sent_date) {
    return NextResponse.json({ error: "lead_id and sent_date required" }, { status: 400 });
  }

  const webhookUrl = `${process.env.N8N_BASE_URL}/webhook/anatop-approve`;
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lead_id,
      sent_date,
      contact_email,
      contact_name,
      company,
      country,
      operator: session.user?.name ?? "CF",
    }),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 200 : 500 });
}
