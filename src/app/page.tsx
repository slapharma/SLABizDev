"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const ALL_COUNTRIES = [
  "Mexico","Brazil","Peru","Chile","Argentina","Venezuela","Caribbean",
  "Japan","South Africa","China","Taiwan","South Korea","Indonesia","Laos","Thailand","Turkey","Israel",
];

const STATUS_ORDER = ["QUALIFIED","CONTACT FOUND","OUTREACH DRAFTED","OUTREACH SENT","REPLIED","ON HOLD"];

const STATUS_DOT: Record<string, string> = {
  QUALIFIED:          "bg-teal-500",
  "CONTACT FOUND":    "bg-sky-500",
  "OUTREACH DRAFTED": "bg-violet-500",
  "OUTREACH SENT":    "bg-emerald-500",
  REPLIED:            "bg-amber-500",
  "ON HOLD":          "bg-zinc-500",
};

const ACTION_COLORS: Record<string, string> = {
  pipeline_triggered:          "text-zinc-500",
  n8n_accepted:                "text-zinc-500",
  n8n_rejected:                "text-red-500",
  lead_qualified:              "text-teal-400",
  lead_qualified_and_enriched: "text-teal-400",
  contact_found:               "text-sky-400",
  draft_created:               "text-violet-400",
  email_sent:                  "text-emerald-400",
  bump_1_drafted:              "text-purple-400",
  bump_2_drafted:              "text-purple-400",
  final_bump_drafted:          "text-purple-300",
  cadence_complete:            "text-amber-400",
};

interface ActivityRow {
  timestamp: string;
  leadId: string;
  action: string;
  detail: string;
  by: string;
}

interface Lead {
  id?: string;
  company?: string;
  website?: string;
  country?: string;
  priority?: string;
  status?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  notes?: string;
  [key: string]: unknown;
}

interface CountryStatus {
  country: string;
  totalLeads: number;
  statusCounts: Record<string, number>;
  lastEvent: ActivityRow | null;
}

function str(lead: Lead, ...keys: string[]): string {
  for (const key of keys) {
    const v = lead[key];
    if (typeof v === "string" && v) return v;
  }
  return "";
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

function StatusBar({ statusCounts, total }: { statusCounts: Record<string, number>; total: number }) {
  if (total === 0) return null;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-px mt-2">
      {STATUS_ORDER.map((s) => {
        const count = statusCounts[s] ?? 0;
        if (!count) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={s}
            title={`${count} ${s}`}
            className={`${STATUS_DOT[s]} rounded-full`}
            style={{ width: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

function CountryCard({
  country,
  cs,
  leads,
  activity,
  onRerun,
  rerunning,
}: {
  country: string;
  cs: CountryStatus | undefined;
  leads: Lead[];
  activity: ActivityRow[];
  onRerun: (country: string) => void;
  rerunning: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasData = cs && cs.totalLeads > 0;
  const countryActivity = activity
    .filter((a) => a.detail.toLowerCase().includes(country.toLowerCase()))
    .slice(0, 8);

  // Status badge: most advanced status present
  const topStatus = STATUS_ORDER.slice().reverse().find((s) => (cs?.statusCounts[s] ?? 0) > 0);

  return (
    <div className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all ${
      hasData ? "border-zinc-700" : "border-zinc-800 opacity-60"
    }`}>
      {/* Card header */}
      <div
        className={`px-4 py-3 flex items-center gap-3 ${hasData ? "cursor-pointer hover:bg-zinc-800/50" : ""} transition-colors`}
        onClick={() => hasData && setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${hasData ? "text-zinc-100" : "text-zinc-500"}`}>
              {country}
            </span>
            {topStatus && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_DOT[topStatus]} bg-opacity-20 text-zinc-200 border border-zinc-700`}>
                {cs!.totalLeads} lead{cs!.totalLeads !== 1 ? "s" : ""}
              </span>
            )}
            {!hasData && cs?.lastEvent && (
              <span className="text-xs text-zinc-600">triggered {timeAgo(cs.lastEvent.timestamp)}</span>
            )}
          </div>
          {hasData && (
            <StatusBar statusCounts={cs.statusCounts} total={cs.totalLeads} />
          )}
          {hasData && cs.lastEvent && (
            <p className="text-xs text-zinc-600 mt-1 truncate">{timeAgo(cs.lastEvent.timestamp)} · {cs.lastEvent.detail}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onRerun(country); }}
            disabled={rerunning}
            className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-emerald-800 border border-zinc-700 hover:border-emerald-600 text-zinc-400 hover:text-emerald-300 transition-colors disabled:opacity-40"
            title={`Re-run sourcing for ${country}`}
          >
            {rerunning ? "…" : "▶ Re-run"}
          </button>
          {hasData && (
            <span className="text-zinc-600 text-xs">{expanded ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && hasData && (
        <div className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-4">
          {/* Status breakdown pills */}
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => {
              const count = cs.statusCounts[s] ?? 0;
              if (!count) return null;
              return (
                <span key={s} className="text-xs flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-300">
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${STATUS_DOT[s]}`} />
                  {count} {s}
                </span>
              );
            })}
          </div>

          {/* Leads table */}
          {leads.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">Leads</div>
              <div className="space-y-1">
                {leads.map((lead, i) => (
                  <div key={lead.id ?? i} className="flex items-center justify-between text-xs gap-2 py-1 border-b border-zinc-800 last:border-0">
                    <div className="min-w-0">
                      <span className="text-zinc-200 font-medium truncate">{str(lead, "company", "Company") || "—"}</span>
                      {str(lead, "contactName", "Contact Name") && (
                        <span className="text-zinc-500 ml-2">{str(lead, "contactName", "Contact Name")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {str(lead, "priority", "Priority") && (
                        <span className="text-zinc-500">{str(lead, "priority", "Priority")}</span>
                      )}
                      {str(lead, "status", "Status") && (
                        <span className={`px-1.5 py-0.5 rounded text-zinc-300 ${STATUS_DOT[str(lead, "status", "Status")] ?? "bg-zinc-700"} bg-opacity-30`}>
                          {str(lead, "status", "Status")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity timeline */}
          {countryActivity.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">Activity</div>
              <ul className="space-y-1.5">
                {countryActivity.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-zinc-600 whitespace-nowrap w-14 shrink-0">{timeAgo(a.timestamp)}</span>
                    <span className={`font-mono whitespace-nowrap shrink-0 ${ACTION_COLORS[a.action] ?? "text-zinc-400"}`}>
                      {a.action}
                    </span>
                    <span className="text-zinc-500 truncate">{a.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Link href={`/leads?country=${encodeURIComponent(country)}`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              View all leads →
            </Link>
            <Link href={`/pipeline/run`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Run specific stage →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [activity, setActivity]       = useState<ActivityRow[]>([]);
  const [countryStatus, setCountryStatus] = useState<CountryStatus[]>([]);
  const [allLeads, setAllLeads]       = useState<Lead[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [rerunning, setRerunning]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, leadsRes] = await Promise.all([
        fetch("/api/logs"),
        fetch("/api/leads"),
      ]);
      if (!logsRes.ok) throw new Error(`Logs API error ${logsRes.status}`);
      const logsData = await logsRes.json();
      if (logsData.error) throw new Error(logsData.error);
      setActivity(logsData.activity ?? []);
      setCountryStatus(logsData.countryStatus ?? []);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setAllLeads(leadsData.leads ?? []);
      }
      setLastRefresh(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function rerun(country: string) {
    setRerunning(country);
    try {
      await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countries: [country], stage: "source", priority: "P1+P2", operator: "SCF" }),
      });
      setTimeout(load, 2000);
    } finally {
      setRerunning(null);
    }
  }

  // Aggregate totals
  const statusCounts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = countryStatus.reduce((sum, cs) => sum + (cs.statusCounts[s] ?? 0), 0);
    return acc;
  }, {} as Record<string, number>);
  const totalLeads = countryStatus.reduce((sum, cs) => sum + cs.totalLeads, 0);

  // Sort countries: worked first, then unstarted
  const csMap = new Map(countryStatus.map((cs) => [cs.country, cs]));
  const workedCountries = ALL_COUNTRIES.filter((c) => (csMap.get(c)?.totalLeads ?? 0) > 0);
  const unworkedCountries = ALL_COUNTRIES.filter((c) => !workedCountries.includes(c));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Pipeline Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {loading
              ? "Loading…"
              : `${totalLeads} leads · ${workedCountries.length}/${ALL_COUNTRIES.length} countries`}
            {lastRefresh && !loading && (
              <span className="ml-2 text-zinc-600">· refreshed {timeAgo(lastRefresh.toISOString())}</span>
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
              ? <span className="inline-block w-3 h-3 border-2 border-zinc-400 border-t-zinc-700 rounded-full animate-spin" />
              : "↺"} Refresh
          </button>
          <Link
            href="/pipeline/run"
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            ▶ Run Pipeline
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
          <strong>Error loading dashboard:</strong> {error}
        </div>
      )}

      {/* Global status pills */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-center">
            <div className="text-xl font-bold text-zinc-50">
              {loading ? <span className="text-zinc-700">—</span> : (statusCounts[s] ?? 0)}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5 leading-tight">{s}</div>
          </div>
        ))}
      </div>

      {/* Country cards — worked */}
      {workedCountries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            Active countries ({workedCountries.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workedCountries.map((country) => {
              const cs = csMap.get(country);
              const leads = allLeads.filter(
                (l) => str(l, "country", "Country").toLowerCase() === country.toLowerCase()
              );
              return (
                <CountryCard
                  key={country}
                  country={country}
                  cs={cs}
                  leads={leads}
                  activity={activity}
                  onRerun={rerun}
                  rerunning={rerunning === country}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Country cards — unworked */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Not yet started ({unworkedCountries.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {unworkedCountries.map((country) => {
            const cs = csMap.get(country);
            return (
              <CountryCard
                key={country}
                country={country}
                cs={cs}
                leads={[]}
                activity={activity}
                onRerun={rerun}
                rerunning={rerunning === country}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
