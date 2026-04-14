import { auth } from "@/auth";
import { fetchActivity, fetchLeads } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const token = session?.accessToken as string | undefined;
  if (!token) return NextResponse.json({ activity: [], countryStatus: [] });

  try {
    const [activity, leads] = await Promise.all([
      fetchActivity(token, 500),
      fetchLeads(token),
    ]);

    // Build per-country status: last activity event + lead counts per status
    const countries = [...new Set(leads.map((l) => l.country))].filter(Boolean);
    const countryStatus = countries.map((country) => {
      const countryLeads = leads.filter((l) => l.country === country);
      const statusCounts = countryLeads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Find last activity for this country — match by detail text containing the country name
      // or by leadId prefix matching country leads
      const countryLeadIds = new Set(countryLeads.map((l) => l.id).filter(Boolean));
      const countryEvents = activity.filter(
        (a) =>
          (a.leadId && countryLeadIds.has(a.leadId)) ||
          a.detail.toLowerCase().includes(country.toLowerCase())
      );
      const lastEvent = countryEvents[0] ?? null;

      return {
        country,
        totalLeads: countryLeads.length,
        statusCounts,
        lastEvent,
      };
    });

    return NextResponse.json({ activity, countryStatus });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
