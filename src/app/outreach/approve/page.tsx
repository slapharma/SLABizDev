"use client";
import { useEffect, useState } from "react";

interface Lead {
  id: string;
  country: string;
  company: string;
  contactName: string;
  contactEmail: string;
  contactTitle: string;
  status: string;
  lastTouchDate: string;
}

export default function ApprovePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [sentDates, setSentDates] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        const queue = (data.leads ?? []).filter(
          (l: Lead) => l.status === "OUTREACH SENT" || l.status === "OUTREACH DRAFTED"
        );
        setLeads(queue);
        const today = new Date().toISOString().split("T")[0];
        const dates: Record<string, string> = {};
        queue.forEach((l: Lead) => { dates[l.id] = l.lastTouchDate || today; });
        setSentDates(dates);
        setLoading(false);
      });
  }, []);

  async function markSent(lead: Lead) {
    const sentDate = sentDates[lead.id] ?? new Date().toISOString().split("T")[0];
    setApproving(lead.id);

    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: lead.id,
        sent_date: sentDate,
        contact_email: lead.contactEmail,
        contact_name: lead.contactName,
        company: lead.company,
        country: lead.country,
      }),
    });

    if (res.ok) {
      setDone((d) => [...d, lead.id]);
    } else {
      alert("Error triggering approval. Check n8n.");
    }
    setApproving(null);
  }

  const pending = leads.filter((l) => !done.includes(l.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Mark as Sent</h1>
        <p className="text-zinc-400 text-sm mt-0.5">
          After you manually send an email from Gmail, mark it here to trigger the follow-up cadence.
        </p>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading leads…</div>
      ) : pending.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <div className="text-zinc-400 text-sm">
            {done.length > 0
              ? `✓ All ${done.length} leads marked as sent. Cadences started.`
              : "No leads awaiting approval. Draft outreach first."}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((l) => (
            <div key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500">{l.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{l.country}</span>
                  </div>
                  <div className="mt-1 text-zinc-100 font-medium">{l.company}</div>
                  <div className="text-zinc-400 text-sm">{l.contactName} · {l.contactTitle}</div>
                  {l.contactEmail && (
                    <div className="text-zinc-500 text-xs mt-0.5">{l.contactEmail}</div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Sent date</label>
                    <input
                      type="date"
                      value={sentDates[l.id] ?? ""}
                      onChange={(e) => setSentDates((d) => ({ ...d, [l.id]: e.target.value }))}
                      className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={() => markSent(l)}
                    disabled={approving === l.id}
                    className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {approving === l.id ? "Starting cadence…" : "✓ Mark as Sent"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4">
          <div className="text-emerald-300 text-sm font-medium">✓ Cadences started</div>
          <ul className="mt-2 space-y-1">
            {done.map((id) => {
              const l = leads.find((x) => x.id === id);
              return (
                <li key={id} className="text-xs text-zinc-400">
                  {id} · {l?.company} — follow-up bumps scheduled at +14, +30, +60 days
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
