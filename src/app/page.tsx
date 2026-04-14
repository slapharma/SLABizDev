import { auth } from "@/auth";
import { fetchLeads, fetchActivity } from "@/lib/sheets";
import Link from "next/link";

const STATUS_ORDER = ["QUALIFIED", "CONTACT FOUND", "OUTREACH DRAFTED", "OUTREACH SENT", "REPLIED", "ON HOLD"];
const COUNTRIES = ["Mexico","Brazil","Peru","Chile","Argentina","Venezuela","Caribbean","Japan","South Africa","China","Taiwan","South Korea","Indonesia","Laos","Thailand","Turkey","Israel"];

function timeAgo(ts: string) {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACTION_COLORS: Record<string, string> = {
  draft_created: "text-sky-400",
  email_sent: "text-emerald-400",
  bump_1_drafted: "text-violet-400",
  bump_2_drafted: "text-violet-400",
  cadence_complete: "text-amber-400",
  lead_qualified_and_enriched: "text-teal-400",
};

export default async function Dashboard() {
  const session = await auth();
  const token = session?.accessToken as string | undefined;

  let leads: Awaited<ReturnType<typeof fetchLeads>> = [];
  let activity: Awaited<ReturnType<typeof fetchActivity>> = [];

  if (token) {
    try {
      [leads, activity] = await Promise.all([
        fetchLeads(token),
        fetchActivity(token, 20),
      ]);
    } catch {
      // handled below — shows empty state
    }
  }

  const statusCounts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const countryCounts = COUNTRIES.map((c) => ({
    name: c,
    total: leads.filter((l) => l.country === c).length,
    sent: leads.filter((l) => l.country === c && l.status === "OUTREACH SENT").length,
  })).filter((c) => c.total > 0);

  const pendingDrafts = leads.filter((l) => l.status === "OUTREACH DRAFTED").length;
  const pendingSent = leads.filter((l) => l.status === "OUTREACH SENT").length;
  const unworkedCountries = COUNTRIES.filter((c) => !leads.find((l) => l.country === c)).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Pipeline Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{leads.length} total leads across {countryCounts.length} countries</p>
        </div>
        <Link href="/pipeline/run" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          ▶ Run Pipeline
        </Link>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-zinc-50">{statusCounts[s] ?? 0}</div>
            <div className="text-xs text-zinc-400 mt-1 leading-tight">{s.replace(" ", "\n")}</div>
          </div>
        ))}
      </div>

      {/* Pending actions */}
      {(pendingDrafts > 0 || pendingSent > 0 || unworkedCountries > 0) && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-5">
          <div className="text-sm font-semibold text-amber-300 mb-3">⚡ Pending actions</div>
          <ul className="space-y-2">
            {pendingDrafts > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{pendingDrafts} draft{pendingDrafts > 1 ? "s" : ""} awaiting your review</span>
                <Link href="/outreach/drafts" className="text-amber-400 hover:text-amber-300 text-xs font-medium">Review Drafts →</Link>
              </li>
            )}
            {pendingSent > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{pendingSent} outreach email{pendingSent > 1 ? "s" : ""} need cadence trigger</span>
                <Link href="/outreach/approve" className="text-amber-400 hover:text-amber-300 text-xs font-medium">Mark as Sent →</Link>
              </li>
            )}
            {unworkedCountries > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{unworkedCountries} countries not yet started</span>
                <Link href="/pipeline/run" className="text-amber-400 hover:text-amber-300 text-xs font-medium">Run Sourcing →</Link>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Countries worked</h2>
          {countryCounts.length === 0 ? (
            <p className="text-zinc-500 text-sm">No countries sourced yet.</p>
          ) : (
            <ul className="space-y-2">
              {countryCounts.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-200">{c.name}</span>
                  <span className="text-zinc-500">{c.total} leads · {c.sent} sent</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="text-zinc-500 text-sm">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-xs">
                  <span className="text-zinc-500 whitespace-nowrap pt-0.5">{timeAgo(a.timestamp)}</span>
                  <span className={`font-mono whitespace-nowrap ${ACTION_COLORS[a.action] ?? "text-zinc-400"}`}>{a.action}</span>
                  <span className="text-zinc-400 truncate">{a.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
