import { auth } from "@/auth";
import { fetchActivity } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const token = session?.accessToken as string | undefined;
  if (!token) return NextResponse.json({ activity: [] });
  try {
    const activity = await fetchActivity(token, 30);
    return NextResponse.json({ activity });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
