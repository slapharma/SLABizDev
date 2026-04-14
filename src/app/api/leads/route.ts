import { auth } from "@/auth";
import { fetchLeads } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const token = session?.accessToken as string | undefined;
  if (!token) return NextResponse.json({ leads: [] });
  try {
    const leads = await fetchLeads(token);
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
