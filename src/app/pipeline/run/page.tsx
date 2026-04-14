"use client";
import { useState } from "react";

const COUNTRIES = [
  "Mexico","Brazil","Peru","Chile","Argentina","Venezuela","Caribbean",
  "Japan","South Africa","China","Taiwan","South Korea","Indonesia","Laos","Thailand","Turkey","Israel"
];

const GROUPS: Record<string, string[]> = {
  "LatAm North": ["Mexico","Venezuela","Caribbean"],
  "LatAm South": ["Brazil","Peru","Chile","Argentina"],
  "Asia Pacific": ["Japan","South Korea","Indonesia","Laos","Thailand","Taiwan"],
  "Greater China": ["China","Taiwan"],
  "EMEA + Israel": ["South Africa","Turkey","Israel"],
  "All 17": COUNTRIES,
};

const STAGES = [
  { value: "source", label: "Source companies (WF2)" },
  { value: "contacts", label: "Find contacts (WF3)" },
  { value: "drafts", label: "Draft outreach (WF4)" },
  { value: "all", label: "All stages (full run)" },
];

export default function RunPipelinePage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [stage, setStage] = useState("source");
  const [priority, setPriority] = useState("P1");
  const [operator, setOperator] = useState("SCF");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ country: string; status: number }[] | null>(null);

  function toggleCountry(c: string) {
    setSelected((s) => s.includes(c) ? s.filter((x) => x !== c) : [...s, c]);
  }

  function selectGroup(group: string) {
    setSelected(GROUPS[group] ?? []);
  }

  async function run() {
    if (!selected.length) return alert("Select at least one country.");
    setRunning(true);
    setResults(null);
    const res = await fetch("/api/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countries: selected, stage, priority, operator }),
    });
    const data = await res.json();
    setResults(data.triggered ?? []);
    setRunning(false);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Run Pipeline</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Trigger n8n workflows for one or more countries.</p>
      </div>

      {/* Country selector */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Countries</h2>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {Object.keys(GROUPS).map((g) => (
              <button
                key={g}
                onClick={() => selectGroup(g)}
                className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => toggleCountry(c)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                selected.includes(c)
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {selected.includes(c) ? "✓ " : ""}{c}
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="text-xs text-zinc-500">{selected.length} countr{selected.length === 1 ? "y" : "ies"} selected</div>
        )}
      </section>

      {/* Stage */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">Pipeline stage</h2>
        {STAGES.map((s) => (
          <label key={s.value} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio"
              name="stage"
              value={s.value}
              checked={stage === s.value}
              onChange={() => setStage(s.value)}
              className="accent-emerald-500"
            />
            <span className={`text-sm ${stage === s.value ? "text-zinc-100" : "text-zinc-400 group-hover:text-zinc-300"}`}>
              {s.label}
            </span>
          </label>
        ))}
      </section>

      {/* Options */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300">Options</h2>
        <div className="flex gap-6">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Priority filter</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
            >
              <option value="P1">P1 only</option>
              <option value="P1+P2">P1 + P2</option>
              <option value="all">All priorities</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Operator</label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
            >
              <option value="SCF">SCF (Clifton)</option>
              <option value="JS">JS (Justin)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Run button */}
      <div className="flex gap-3">
        <button
          onClick={run}
          disabled={running || selected.length === 0}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
        >
          {running ? "Starting…" : `▶ Run — ${selected.length || "0"} countr${selected.length === 1 ? "y" : "ies"}`}
        </button>
        {selected.length > 0 && (
          <button onClick={() => setSelected([])} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-sm font-semibold text-zinc-300 mb-3">Pipeline triggered</div>
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.country} className="flex items-center justify-between text-sm">
                <span className="text-zinc-200">{r.country}</span>
                <span className={r.status === 200 ? "text-emerald-400 text-xs" : "text-red-400 text-xs"}>
                  {r.status === 200 ? "✓ Started" : `Error ${r.status}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500 mt-4">
            Monitor progress in the <a href="/" className="text-zinc-400 hover:text-zinc-200 underline">Dashboard</a> activity feed.
          </p>
        </div>
      )}
    </div>
  );
}
