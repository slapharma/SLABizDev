"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const STATUS_ORDER = ["QUALIFIED", "CONTACT FOUND", "OUTREACH DRAFTED", "OUTREACH SENT", "REPLIED", "ON HOLD"];
const ALL_COUNTRIES = ["Mexico","Brazil","Peru","Chile","Argentina","Venezuela","Caribbean","Japan","South Africa","China","Taiwan","South Korea","Indonesia","Laos","Thailand","Turkey","Israel"];

const ACTION_COLORS: Record<string, string> = {
  pipeline_triggered:          "text-slate-400",
  n8n_accepted:                "text-slate-400",
  n8n_rejected:                "text-red-500",
  lead_qualified:              "text-teal-600",
  lead_qualified_and_enriched: "text-teal-600",
  contact_found:               "text-sky-600",
  draft_created:               "text-violet-600",
  email_sent:                  "text-emerald-600",
  bump_1_drafted:              "text-purple-600",
  bump_2_drafted:              "text-purple-600",
  final_bump_drafted:          "text-purple-500",
  cadence_complete:            "text-amber-600",
};

interface ActivityRow {
  timestamp: string;
  leadId: string;
  action: string;
  detail: string;
  by: string;
}

interface CountryStatus {
  country: string;
  totalLeads: number;
  statusCounts: Record<string, number>;
  lastEvent: ActivityRow | null;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const [activity, setActivity]       = useState<ActivityRow[]>([]);
  const [countryStatus, setCountryStatus] = useState<CountryStatus[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/logs");
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setActivity(data.activity ?? []);
      setCountryStatus(data.countryStatus ?? []);
      setLastRefresh(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Aggregate status totals across all countries
  const statusCounts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = countryStatus.reduce((sum, cs) => sum + (cs.statusCounts[s] ?? 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalLeads = countryStatus.reduce((sum, cs) => sum + cs.totalLeads, 0);
  const workedCountries = countryStatus.filter((cs) => cs.totalLeads > 0);
  const unworkedCount = ALL_COUNTRIES.filter(
    (c) => !countryStatus.find((cs) => cs.country === c && cs.totalLeads > 0)
  ).length;

  const pendingDrafts = statusCounts["OUTREACH DRAFTED"] ?? 0;
  const pendingSent   = statusCounts["OUTREACH SENT"] ?? 0;

  // Recent activity — show last 15, filter out low-signal trigger noise
  const recentActivity = activity
    .filter((a) => a.action !== "n8n_accepted")
    .slice(0, 15);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Pipeline Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {loading ? "Loading…" : `${totalLeads} total leads across ${workedCountries.length} countries`}
            {lastRefresh && !loading && (
              <span className="ml-2 text-zinc-600">· {timeAgo(lastRefresh.toISOString())}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {loading
              ? <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              : "↺"} Refresh
          </button>
          <Link
            href="/pipeline/run"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            ▶ Run Pipeline
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <strong>Error loading dashboard:</strong> {error}
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-zinc-50">
              {loading ? <span className="text-zinc-700">—</span> : (statusCounts[s] ?? 0)}
            </div>
            <div className="text-xs text-zinc-400 mt-1 leading-tight">{s}</div>
          </div>
        ))}
      </div>

      {/* Pending actions */}
      {!loading && (pendingDrafts > 0 || pendingSent > 0 || unworkedCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="text-sm font-semibold text-amber-700 mb-3">⚡ Pending actions</div>
          <ul className="space-y-2">
            {pendingDrafts > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-700">{pendingDrafts} draft{pendingDrafts > 1 ? "s" : ""} awaiting review</span>
                <Link href="/outreach/drafts" className="text-amber-600 hover:text-amber-500 text-xs font-medium">Review Drafts →</Link>
              </li>
            )}
            {pendingSent > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-700">{pendingSent} outreach email{pendingSent > 1 ? "s" : ""} need cadence trigger</span>
                <Link href="/outreach/approve" className="text-amber-600 hover:text-amber-500 text-xs font-medium">Mark as Sent →</Link>
              </li>
            )}
            {unworkedCount > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-700">{unworkedCount} countries not yet started</span>
                <Link href="/pipeline/run" className="text-amber-600 hover:text-amber-500 text-xs font-medium">Run Sourcing →</Link>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Countries worked</h2>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading…</p>
          ) : workedCountries.length === 0 ? (
            <p className="text-zinc-500 text-sm">No countries sourced yet.</p>
          ) : (
            <ul className="space-y-2">
              {workedCountries.map((cs) => {
                const sent = cs.statusCounts["OUTREACH SENT"] ?? 0;
                const drafted = cs.statusCounts["OUTREACH DRAFTED"] ?? 0;
                return (
                  <li key={cs.country} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-200">{cs.country}</span>
                    <span className="text-zinc-500">
                      {cs.totalLeads} lead{cs.totalLeads !== 1 ? "s" : ""}
                      {drafted > 0 && <span className="ml-2 text-violet-500">{drafted} drafted</span>}
                      {sent > 0 && <span className="ml-2 text-emerald-600">{sent} sent</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Recent activity</h2>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading…</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-zinc-500 text-sm">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-xs">
                  <span className="text-zinc-500 whitespace-nowrap pt-0.5 w-16 shrink-0">{timeAgo(a.timestamp)}</span>
                  <span className={`font-mono whitespace-nowrap shrink-0 ${ACTION_COLORS[a.action] ?? "text-zinc-400"}`}>
                    {a.action}
                  </span>
                  <span className="text-zinc-400 truncate">{a.detail}</span>
                </li>
              ))}
            </ul>
          )}
          {activity.length > 15 && (
            <Link href="/logs" className="block mt-3 text-xs text-zinc-500 hover:text-zinc-300">
              View all {activity.length} events →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
