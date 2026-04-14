/**
 * Google Sheets API helpers.
 * All functions expect an OAuth2 access token from the user's NextAuth session.
 */

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export interface Lead {
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

export interface ActivityRow {
  timestamp: string;
  leadId: string;
  action: string;
  detail: string;
  by: string;
}

function rowToLead(headers: string[], row: string[]): Lead {
  const get = (col: string) => row[headers.indexOf(col)] ?? "";
  return {
    id: get("ID"),
    country: get("Country"),
    company: get("Company"),
    website: get("Website"),
    hqCity: get("HQ City"),
    employees: get("Employees"),
    gastroFit: get("Gastro Fit Hypothesis"),
    competitorCheck: get("Competitor Check"),
    priority: get("Priority"),
    status: get("Status"),
    contactName: get("Contact Name"),
    contactTitle: get("Contact Title"),
    contactEmail: get("Contact Email"),
    contactLinkedIn: get("Contact LinkedIn"),
    apolloId: get("Apollo ID"),
    lastTouchDate: get("Last Touch Date"),
    lastTouchType: get("Last Touch Type"),
    nextAction: get("Next Action"),
    notes: get("Notes"),
    source: get("Source"),
    addedDate: get("Added Date"),
    gmailDraftId: get("Gmail Draft ID"),
    operator: get("Operator"),
  };
}

export async function fetchLeads(accessToken: string): Promise<Lead[]> {
  const res = await fetch(
    `${BASE}/${SHEET_ID}/values/Leads!A:W`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Sheets error: ${res.status}`);
  const data = await res.json();
  const [headers, ...rows] = data.values ?? [];
  if (!headers) return [];
  return rows
    .filter((r: string[]) => r[0])
    .map((r: string[]) => rowToLead(headers, r));
}

export async function fetchActivity(accessToken: string, limit = 50): Promise<ActivityRow[]> {
  const res = await fetch(
    `${BASE}/${SHEET_ID}/values/Activity!A:E`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Sheets error: ${res.status}`);
  const data = await res.json();
  const [, ...rows] = data.values ?? [];
  return rows
    .filter((r: string[]) => r[0])
    .slice(-limit)
    .reverse()
    .map((r: string[]) => ({
      timestamp: r[0],
      leadId: r[1],
      action: r[2],
      detail: r[3],
      by: r[4],
    }));
}

export async function updateLeadStatus(
  accessToken: string,
  payload: { id: string; fields: Record<string, string> }
): Promise<void> {
  await fetch(process.env.N8N_PIPELINE_WEBHOOK!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update_lead", ...payload }),
  });
}
