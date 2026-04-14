"use client";
import { useEffect, useState } from "react";

interface Draft {
  id: string;
  subject: string;
  to: string;
  snippet: string;
  body: string;
  messageId: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/drafts");
    const data = await res.json();
    setDrafts(data.drafts ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteDraft(id: string) {
    if (!confirm("Delete this draft from Gmail?")) return;
    setDeleting(id);
    await fetch("/api/drafts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId: id }),
    });
    setDrafts((d) => d.filter((x) => x.id !== id));
    setDeleting(null);
  }

  function openInGmail(messageId: string) {
    window.open(`https://mail.google.com/mail/u/0/#drafts/${messageId}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Draft Review Queue</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Review AI-drafted outreach before sending. Nothing sends automatically.</p>
        </div>
        <button onClick={load} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading drafts from Gmail…</div>
      ) : drafts.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <div className="text-zinc-400 text-sm">No Anatop drafts found in Gmail.</div>
          <div className="text-zinc-600 text-xs mt-1">Drafts appear here after the pipeline runs WF4 (Outreach Drafting).</div>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((d) => (
            <div key={d.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-100 font-medium text-sm">{d.subject}</div>
                    <div className="text-zinc-500 text-xs mt-0.5">To: {d.to}</div>
                  </div>
                </div>

                <div className="mt-3 text-zinc-300 text-sm leading-relaxed">
                  {expanded === d.id ? (
                    <pre className="whitespace-pre-wrap font-sans">{d.body || d.snippet}</pre>
                  ) : (
                    <p className="line-clamp-3">{d.snippet}</p>
                  )}
                </div>

                <button
                  onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                  className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {expanded === d.id ? "Show less ▲" : "Show full email ▼"}
                </button>
              </div>

              <div className="border-t border-zinc-800 px-5 py-3 flex gap-3">
                <button
                  onClick={() => openInGmail(d.messageId)}
                  className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
                >
                  ✉ Open in Gmail
                </button>
                <button
                  onClick={() => deleteDraft(d.id)}
                  disabled={deleting === d.id}
                  className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting === d.id ? "Deleting…" : "✕ Delete Draft"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
