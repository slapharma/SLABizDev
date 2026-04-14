"use client";
import { useEffect, useState, useCallback } from "react";

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

// ─── visual config ───────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  pipeline_triggered: "bg-zinc-700/40 text-zinc-300",
  n8n_accepted:       "bg-zinc-700/40 text-zinc-400",
  n8n_rejected:       "bg-red-900/40 text-red-400",
  lead_qualified:     "bg-teal-900/30 text-teal-400",
  lead_qualified_and_enriched: "bg-sky-900/30 text-sky-400",
  contact_found:      "bg-sky-900/30 text-sky-400",
  draft_created:      "bg-violet-900/30 text-violet-400",
  email_sent:         "bg-emerald-900/30 text-emerald-400",
  bump_1_drafted:     "bg-purple-900/30 text-purple-400",
  bump_2_drafted:     "bg-purple-900/30 text-purple-400",
  final_bump_drafted: "bg-purple-900/30 text-purple-300",
  cadence_complete:   "bg-amber-900/30 text-amber-400",
};

const STAGE_STATUS_ORDER = [
  "QUALIFIED",
  "CONTACT FOUND",
  "OUTREACH DRAFTED",
  "OUTREACH SENT",
  "REPLIED",
  "ON HOLD",
];

const STATUS_COLORS: Record<string, string> = {
  "QUALIFIED":         "bg-zinc-700/50 text-zinc-300",
  "CONTACT FOUND":     "bg-sky-900/40 text-sky-300",
  "OUTREACH DRAFTED":  "bg-amber-900/40 text-amber-300",
  "OUTREACH SENT":     "bg-emerald-900/40 text-emerald-300",
  "REPLIED":           "bg-violet-900/40 text-violet-300",
  "ON HOLD":           "bg-orange-900/40 text-orange-300",
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "bg-zinc-800 text-zinc-400";
  return (
    <span className={`inline-block font-mono text-xs px-2 py-0.5 rounded ${cls} whitespace-nowrap`}>
      {action}
    </span>
  );
}

// ─── country status card ─────────────────────────────────────────────────────

function CountryCard({ cs }: { cs: CountryStatus }) {
  const topStatus = STAGE_STATUS_ORDER.slice().reverse().find(
    (s) => (cs.statusCounts[s] ?? 0) > 0
  );
  const stalled = cs.lastEvent
    ? Date.now() - new Date(cs.lastEvent.timestamp).getTime() > 30 * 60 * 1000
    : true;
  const isError = cs.lastEvent?.action === "n8n_rejected";

  return (
    <div className={`bg-zinc-900 border rounded-xl p-4 space-y-3 ${
      isError ? "border-red-800/60" : stalled && cs.totalLeads === 0 ? "border-zinc-700/40" : "border-zinc-800"
    }`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-zinc-100 text-sm">{cs.country}</span>
        {topStatus ? (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[topStatus] ?? "bg-zinc-700 text-zinc-400"}`}>
            {topStatus}
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">no leads</span>
        )}
      </div>

      {cs.totalLeads > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {STAGE_STATUS_ORDER.filter((s) => cs.statusCounts[s]).map((s) => (
            <span key={s} className="text-xs text-zinc-500">
              <span className="text-zinc-300">{cs.statusCounts[s]}</span> {s.toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {cs.lastEvent ? (
        <div className={`text-xs rounded px-2 py-1.5 space-y-0.5 ${
          isError ? "bg-red-900/30 border border-red-800/40" : "bg-zinc-800/50"
        }`}>
          <div className="flex items-center justify-between gap-2">
            <ActionBadge action={cs.lastEvent.action} />
            <span className="text-zinc-500 whitespace-nowrap">{timeAgo(cs.lastEvent.timestamp)}</span>
          </div>
          <div className="text-zinc-400 truncate">{cs.lastEvent.detail}</div>
        </div>
      ) : (
        <div className="text-xs text-zinc-600 italic">No activity recorded</div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

const ALL_ACTIONS = [
  "pipeline_triggered", "n8n_accepted", "n8n_rejected",
  "lead_qualified", "lead_qualified_and_enriched", "contact_found",
  "draft_created", "email_sent",
  "bump_1_drafted", "bump_2_drafted", "final_bump_drafted", "cadence_complete",
];

export default function LogsPage() {
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [countryStatus, setCountryStatus] = useState<CountryStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch]             = useState("");

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

  const filtered = activity.filter((a) => {
    if (actionFilter !== "all" && a.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.action.includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        a.leadId.toLowerCase().includes(q) ||
        a.by.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Identify countries that have recent triggers but no downstream events
  const stalledCountries = countryStatus.filter((cs) => {
    const lastAction = cs.lastEvent?.action;
    return lastAction === "pipeline_triggered" || lastAction === "n8n_accepted";
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Pipeline Logs</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {activity.length} events recorded
            {lastRefresh && (
              <span className="ml-2 text-zinc-600">· refreshed {timeAgo(lastRefresh.toISOString())}</span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? (
            <span className="inline-block w-3 h-3 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
          ) : "↺"} Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-4 text-red-300 text-sm">
          <strong>Error loading logs:</strong> {error}
        </div>
      )}

      {/* Stalled warning */}
      {!loading && stalledCountries.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4">
          <div className="text-sm font-semibold text-amber-300 mb-2">⚠ Pipeline triggered but no n8n output recorded</div>
          <p className="text-xs text-amber-200/70 mb-3">
            These countries show a trigger event with no downstream activity (no leads qualified, no contacts found, no drafts created).
            This usually means a node inside n8n failed silently — check n8n Executions.
          </p>
          <div className="flex flex-wrap gap-2">
            {stalledCountries.map((cs) => (
              <span key={cs.country} className="text-xs bg-amber-900/30 text-amber-300 px-2.5 py-1 rounded-full">
                {cs.country}
              </span>
            ))}
          </div>
          <a
            href="https://sla-bd.app.n8n.cloud"
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 text-xs text-amber-400 hover:text-amber-300 underline"
          >
            Open n8n Executions →
          </a>
        </div>
      )}

      {/* Country status grid */}
      {!loading && countryStatus.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Country Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {countryStatus.map((cs) => (
              <CountryCard key={cs.country} cs={cs} />
            ))}
          </div>
        </div>
      )}

      {/* Activity log */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Activity Log
            {filtered.length !== activity.length && (
              <span className="ml-2 text-zinc-600 normal-case tracking-normal font-normal">
                {filtered.length} of {activity.length}
              </span>
            )}
          </h2>
          <div className="flex gap-2 flex-wrap">
            <input
              type="search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-zinc-500"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">All actions</option>
              <optgroup label="Triggers">
                <option value="pipeline_triggered">pipeline_triggered</option>
                <option value="n8n_accepted">n8n_accepted</option>
                <option value="n8n_rejected">n8n_rejected</option>
              </optgroup>
              <optgroup label="Pipeline">
                {ALL_ACTIONS.slice(3).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">No events match the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-28">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Detail</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-24">Lead ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-14">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filtered.map((a, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-zinc-800/30 transition-colors ${
                        a.action === "n8n_rejected" ? "bg-red-950/20" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 text-zinc-500 text-xs whitespace-nowrap font-mono">
                        <span title={a.timestamp}>{fmtTime(a.timestamp)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <ActionBadge action={a.action} />
                      </td>
                      <td className="px-4 py-2.5 text-zinc-400 max-w-md truncate" title={a.detail}>
                        {a.detail || <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600 font-mono text-xs whitespace-nowrap">
                        {a.leadId || <span className="text-zinc-800">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600 text-xs">
                        {a.by || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
