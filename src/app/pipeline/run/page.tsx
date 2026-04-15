"use client";
import { useState } from "react";

const COUNTRIES = [
  "Mexico","Brazil","Peru","Chile","Argentina","Venezuela","Caribbean",
  "Japan","South Africa","China","Taiwan","South Korea","Indonesia","Laos","Thailand","Turkey","Israel"
];

const GROUPS: Record<string, string[]> = {
  "LatAm N": ["Mexico","Venezuela","Caribbean"],
  "LatAm S": ["Brazil","Peru","Chile","Argentina"],
  "Asia Pac": ["Japan","South Korea","Indonesia","Laos","Thailand","Taiwan"],
  "Gr. China": ["China","Taiwan"],
  "EMEA": ["South Africa","Turkey","Israel"],
  "All 17": COUNTRIES,
};

const STAGES = [
  { value: "source",   label: "Source companies",  sub: "WF2 — Apollo + Explorium + qualify" },
  { value: "contacts", label: "Find contacts",      sub: "WF3 — Apollo people search" },
  { value: "drafts",   label: "Draft outreach",     sub: "WF4 — Claude email drafts" },
  { value: "all",      label: "Full run",           sub: "All stages end-to-end" },
];

// ─── Default qualification prompt ────────────────────────────────────────────
const DEFAULT_QUALIFY_PROMPT = `You are a business development analyst for SLA Pharma evaluating potential in-country distribution or licensing partners for Anatop™ — a licensed 2% diltiazem topical cream for chronic anal fissure, with EU Marketing Authorisation (2024) and first-line status per ACPGBI and ASCRS colorectal guidelines.

IDEAL PARTNER (score 4–5):
- Established gastroenterology, colorectal, or proctology Rx franchise
- Specialty sales force calling on GI specialists or colorectal surgeons
- Demonstrated regulatory capability (Rx product registrations, not OTC-only importing)
- Evidence of pharmaceutical marketing capability — product launches, medical education, KOL engagement, congress presence, or reimbursement submissions in their territory
- Established relationships with KOLs in colorectal surgery, gastroenterology, or proctology
- Independent or mid-size pharma/distributor — niche Rx product matters to them
- No competing anal fissure Rx in current portfolio

ACCEPTABLE PARTNER (score 3):
- Broad specialty Rx pharma or distributor with hospital/GI channel
- Has regulatory infrastructure but GI not primary focus
- Some evidence of Rx marketing or medical affairs activity, even if not GI-specific
- Worth engaging to assess fit

WEAK FIT (score 1–2):
- Pure generics house with no specialty Rx or marketing capability
- Pure OTC consumer health (no Rx infrastructure, no medical affairs)
- Cardiology-only, oncology-only, or devices — no GI franchise
- No evidence of KOL engagement or specialist sales force
- Logistics/wholesale-only distributor with no marketing capability

HARD DISQUALIFIERS — set competitor_flag: true, omit from output:
- Any company marketing a product specifically labelled for anal fissure
- Topical diltiazem products: Angiotrofin (Armstrong/Mexico), Anoheal, any branded or licensed topical diltiazem for fissure
- Topical GTN/nitroglycerin products: Rectogesic, Rectiv, or any GTN product labelled for anal fissure
- Topical nifedipine products labelled or routinely promoted for anal fissure
- ProStrakan / Kyowa Kirin Rx licensees for Rectogesic in the territory
- Laboratorios Armstrong (Mexico only)
- Any company the competitor analysis identifies as carrying a competing diltiazem, GTN, or nifedipine anal fissure product

SOFT CONFLICTS — score normally, note in notes field:
- Hemorrhoid-only OTC brands (Preparation H, Anusol, Proctosedyl, Scheriproct, Ultraproct) — flag but do not disqualify automatically

SCORING RUBRIC:
5 = GI/colorectal Rx franchise + specialist sales force + regulatory capability + active pharmaceutical marketing/KOL engagement. Perfect fit.
4 = Strong specialty pharma with GI or hospital distribution, evidence of Rx launches or medical education activity. Good fit.
3 = Broad Rx pharma or distributor with some GI/hospital channel and basic marketing capability. Moderate fit.
2 = General pharma, no clear GI focus, limited Rx marketing evidence. Long shot.
1 = No relevant channel — OTC-only, logistics-only, devices, generics without Rx, or wrong therapeutic area entirely.

Return ONLY a valid JSON array — no markdown fences, no explanation outside the array:
[{"company": string, "website": string, "gastro_fit_score": number, "competitor_flag": boolean, "disqualify_reason": string|null, "notes": string, "priority": "P1"|"P2"|"P3"}]
Priority rule: P1 = score >= 4, P2 = score = 3, P3 = score <= 2. Omit competitor_flag=true entries entirely.`;

export default function RunPipelinePage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [stage, setStage]       = useState("source");
  const [priority, setPriority] = useState("P1");
  const [operator, setOperator] = useState("SCF");
  const [running, setRunning]   = useState(false);
  const [results, setResults]   = useState<{ country: string; status: number; error?: string }[] | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen]     = useState(false);
  const [qualifyPrompt, setQualifyPrompt] = useState(DEFAULT_QUALIFY_PROMPT);
  const isModified = qualifyPrompt !== DEFAULT_QUALIFY_PROMPT;

  function toggleCountry(c: string) {
    setSelected((s) => s.includes(c) ? s.filter((x) => x !== c) : [...s, c]);
  }

  async function run() {
    if (!selected.length) return alert("Select at least one country.");
    setRunning(true);
    setResults(null);
    setApiError(null);
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countries: selected, stage, priority, operator, qualify_prompt: qualifyPrompt }),
      });
      const data = await res.json();
      if (data.error) setApiError(data.error);
      else setResults(data.triggered ?? []);
    } catch (e) {
      setApiError(String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Run Pipeline</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Trigger n8n workflows for one or more countries.</p>
      </div>

      {/* Main controls — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Left: Country selector (wider) */}
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-zinc-300">Countries</h2>
            <div className="flex flex-wrap gap-1">
              {Object.entries(GROUPS).map(([g, countries]) => (
                <button
                  key={g}
                  onClick={() => setSelected(countries)}
                  className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {g}
                </button>
              ))}
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COUNTRIES.map((c) => (
              <button
                key={c}
                onClick={() => toggleCountry(c)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  selected.includes(c)
                    ? "bg-emerald-900/60 border-emerald-600 text-emerald-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
                }`}
              >
                {selected.includes(c) ? "✓ " : ""}{c}
              </button>
            ))}
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-zinc-500">{selected.length} countr{selected.length === 1 ? "y" : "ies"} selected</p>
          )}
        </div>

        {/* Right: Stage + Options + Run */}
        <div className="lg:col-span-2 flex flex-col gap-3">

          {/* Stage */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 flex-1">
            <h2 className="text-sm font-semibold text-zinc-300 mb-1">Stage</h2>
            {STAGES.map((s) => (
              <label key={s.value} className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="stage"
                  value={s.value}
                  checked={stage === s.value}
                  onChange={() => setStage(s.value)}
                  className="accent-emerald-500 mt-0.5"
                />
                <div>
                  <span className={`text-sm ${stage === s.value ? "text-zinc-100" : "text-zinc-400 group-hover:text-zinc-300"}`}>
                    {s.label}
                  </span>
                  <span className="text-xs text-zinc-600 ml-1.5">{s.sub}</span>
                </div>
              </label>
            ))}
          </div>

          {/* Options row */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-zinc-500 block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-2.5 py-1.5"
                >
                  <option value="P1">P1 only</option>
                  <option value="P1+P2">P1 + P2</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-500 block mb-1">Operator</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-2.5 py-1.5"
                >
                  <option value="SCF">SCF (Clifton)</option>
                  <option value="JS">JS (Justin)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={run}
            disabled={running || selected.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            {running
              ? <><span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Starting…</>
              : `▶ Run — ${selected.length || "0"} countr${selected.length === 1 ? "y" : "ies"}`}
          </button>
        </div>
      </div>

      {/* Qualification prompt — collapsible, below the fold */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setPromptOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">Qualification prompt</h2>
            {isModified && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Modified
              </span>
            )}
          </div>
          <span className="text-zinc-500 text-xs">{promptOpen ? "▲ Hide" : "▼ Edit"}</span>
        </button>

        {promptOpen && (
          <div className="px-5 pb-5 space-y-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 pt-3">
              Sent to WF2 LLM Qualify Companies. Edits apply to this run only and are not saved permanently.
            </p>
            <textarea
              value={qualifyPrompt}
              onChange={(e) => setQualifyPrompt(e.target.value)}
              rows={24}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs font-mono rounded-lg px-4 py-3 focus:outline-none focus:border-zinc-500 resize-y leading-relaxed"
              spellCheck={false}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">{qualifyPrompt.length} chars</span>
              {isModified && (
                <button
                  onClick={() => setQualifyPrompt(DEFAULT_QUALIFY_PROMPT)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ↺ Reset to default
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {apiError && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
          <strong>Pipeline error:</strong> {apiError}
        </div>
      )}

      {results && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-zinc-300 mb-3">Pipeline triggered</div>
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.country} className="flex items-center justify-between text-sm gap-4">
                <span className="text-zinc-200">{r.country}</span>
                <span className={r.status === 200 ? "text-emerald-500 text-xs" : "text-red-400 text-xs"}>
                  {r.status === 200 ? "✓ Started" : r.error ? `Error: ${r.error}` : `HTTP ${r.status || "0 — unreachable"}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-600 mt-3">
            Monitor progress in the <a href="/" className="text-zinc-400 hover:text-zinc-200 underline">Dashboard</a>.
          </p>
        </div>
      )}
    </div>
  );
}
