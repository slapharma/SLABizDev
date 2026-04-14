import { auth } from "@/auth";
import { fetchActivity } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const activity = await fetchActivity(session.accessToken as string, 30);
    return NextResponse.json({ activity });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
