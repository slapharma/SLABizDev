import { auth } from "@/auth";
import { fetchLeads } from "@/lib/sheets";
import Link from "next/link";
import { redirect } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  "QUALIFIED": "bg-zinc-700 text-zinc-200",
  "CONTACT FOUND": "bg-sky-900/60 text-sky-300",
  "OUTREACH DRAFTED": "bg-violet-900/60 text-violet-300",
  "OUTREACH SENT": "bg-emerald-900/60 text-emerald-300",
  "REPLIED": "bg-teal-900/60 text-teal-300",
  "ON HOLD": "bg-zinc-800 text-zinc-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  "P1 (high)": "text-red-400",
  "P2 (medium)": "text-amber-400",
  "P3 (low)": "text-zinc-500",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; status?: string; priority?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;

  let leads: Awaited<ReturnType<typeof fetchLeads>> = [];
  try {
    leads = await fetchLeads(session.accessToken as string);
  } catch {
    // empty state
  }

  const filtered = leads.filter((l) => {
    if (params.country && l.country !== params.country) return false;
    if (params.status && l.status !== params.status) return false;
    if (params.priority && l.priority !== params.priority) return false;
    return true;
  });

  const countries = [...new Set(leads.map((l) => l.country))].sort();
  const statuses = [...new Set(leads.map((l) => l.status))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-50">Leads</h1>
        <span className="text-sm text-zinc-400">{filtered.length} of {leads.length}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterLink label="All countries" href="/leads" active={!params.country} />
        {countries.map((c) => (
          <FilterLink key={c} label={c} href={`/leads?country=${encodeURIComponent(c)}`} active={params.country === c} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterLink label="All statuses" href={params.country ? `/leads?country=${params.country}` : "/leads"} active={!params.status} />
        {statuses.map((s) => (
          <FilterLink
            key={s}
            label={s}
            href={`/leads?${params.country ? `country=${params.country}&` : ""}status=${encodeURIComponent(s)}`}
            active={params.status === s}
          />
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">ID</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Country</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Company</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Contact</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Priority</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Last Touch</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No leads found.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{l.id}</td>
                  <td className="px-4 py-3 text-zinc-300">{l.country}</td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-100 font-medium">{l.company}</div>
                    {l.website && (
                      <a href={l.website} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-zinc-300">
                        {l.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-200">{l.contactName || "—"}</div>
                    <div className="text-xs text-zinc-500">{l.contactTitle}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[l.priority] ?? "text-zinc-400"}`}>
                      {l.priority || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[l.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {l.lastTouchDate || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-zinc-700 border-zinc-600 text-zinc-100"
          : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      {label}
    </Link>
  );
}
