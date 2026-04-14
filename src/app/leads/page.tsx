"use client";
import { useState, useEffect, useCallback } from "react";

interface Lead {
  id: string;
  country: string;
  company: string;
  website: string;
  hqCity: string;
  employees: string;
  gastroFit: string;
  competitorCheck: string;
  priority: string;
  status: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactLinkedIn: string;
  apolloId: string;
  lastTouchDate: string;
  lastTouchType: string;
  nextAction: string;
  notes: string;
  source: string;
  addedDate: string;
  gmailDraftId: string;
  operator: string;
}

const STATUS_COLORS: Record<string, string> = {
  "QUALIFIED":         "bg-slate-100 text-slate-600",
  "CONTACT FOUND":     "bg-sky-100 text-sky-700",
  "OUTREACH DRAFTED":  "bg-violet-100 text-violet-700",
  "OUTREACH SENT":     "bg-emerald-100 text-emerald-700",
  "REPLIED":           "bg-teal-100 text-teal-700",
  "ON HOLD":           "bg-zinc-200 text-zinc-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  "P1 (high)":   "text-red-600 font-semibold",
  "P2 (medium)": "text-amber-600",
  "P3 (low)":    "text-slate-400",
};

function ExpandedRow({ lead }: { lead: Lead }) {
  return (
    <tr>
      <td colSpan={7} className="px-4 pb-4 pt-0 bg-slate-50/60 border-b border-zinc-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-3">

          {/* Contact details */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Contact</div>
            {lead.contactEmail ? (
              <a href={`mailto:${lead.contactEmail}`} className="block text-sm text-sky-700 hover:underline">
                {lead.contactEmail}
              </a>
            ) : <span className="text-sm text-zinc-400">No email found yet</span>}
            {lead.contactLinkedIn && (
              <a href={lead.contactLinkedIn} target="_blank" rel="noopener noreferrer" className="block text-xs text-sky-600 hover:underline truncate">
                LinkedIn ↗
              </a>
            )}
          </div>

          {/* Company details */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Company</div>
            {lead.hqCity && <div className="text-sm text-zinc-600">📍 {lead.hqCity}</div>}
            {lead.employees && <div className="text-sm text-zinc-600">👥 {lead.employees} employees</div>}
            {lead.source && <div className="text-xs text-zinc-400">Source: {lead.source}</div>}
          </div>

          {/* Gastro fit */}
          {lead.gastroFit && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Gastro Fit</div>
              <div className="text-sm text-zinc-700 leading-relaxed">{lead.gastroFit}</div>
            </div>
          )}

          {/* Competitor check */}
          {lead.competitorCheck && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Competitor Check</div>
              <div className="text-sm text-zinc-700 leading-relaxed">{lead.competitorCheck}</div>
            </div>
          )}

          {/* Notes / research */}
          {lead.notes && (
            <div className="space-y-1 sm:col-span-2">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Research Notes</div>
              <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{lead.notes}</div>
            </div>
          )}

          {/* Next action */}
          {lead.nextAction && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Next Action</div>
              <div className="text-sm text-zinc-700">{lead.nextAction}</div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Filters
  const [countryFilter, setCountryFilter] = useState("all");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [search, setSearch]               = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLeads(data.leads ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const countries = [...new Set(leads.map((l) => l.country))].filter(Boolean).sort();
  const statuses  = [...new Set(leads.map((l) => l.status))].filter(Boolean);

  const filtered = leads.filter((l) => {
    if (countryFilter !== "all" && l.country !== countryFilter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.company.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q) ||
        l.notes.toLowerCase().includes(q) ||
        l.gastroFit.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Leads</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {filtered.length} of {leads.length}
            {leads.length > 0 && <span className="text-zinc-600 ml-2">· click a row to expand research details</span>}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? (
            <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : "↺"} Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <strong>Error loading leads:</strong> {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="search"
          placeholder="Search company, contact, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:border-zinc-500"
        />
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
        >
          <option value="all">All countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Loading leads…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            {leads.length === 0 ? "No leads in the sheet yet. Run the pipeline to source companies." : "No leads match the current filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-28">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-28">Country</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-24">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-32">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-28">Last Touch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((l) => (
                  <>
                    <tr
                      key={l.id}
                      onClick={() => toggleExpand(l.id)}
                      className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{l.id || "—"}</td>
                      <td className="px-4 py-3 text-zinc-300">{l.country}</td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-100 font-medium">{l.company}</div>
                        {l.website && (
                          <a
                            href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-zinc-500 hover:text-zinc-300"
                          >
                            {l.website.replace(/^https?:\/\//, "")}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-200">{l.contactName || "—"}</div>
                        <div className="text-xs text-zinc-500">{l.contactTitle}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${PRIORITY_COLORS[l.priority] ?? "text-zinc-400"}`}>
                          {l.priority || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[l.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                          {l.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        <div>{l.lastTouchDate || "—"}</div>
                        {l.lastTouchType && <div className="text-zinc-600">{l.lastTouchType}</div>}
                      </td>
                    </tr>
                    {expanded.has(l.id) && <ExpandedRow key={`${l.id}-expanded`} lead={l} />}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
