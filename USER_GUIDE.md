# Anatop BD Panel — User Guide

**URL:** https://sla-biz-dev.vercel.app  
**Last updated:** 2026-04-14

---

## What this system does

The Anatop BD Panel automates the business development pipeline for finding and contacting pharmaceutical distribution partners for Anatop (topical diltiazem for chronic anal fissure) across 17 target countries.

The pipeline has five stages:

```
Source companies  →  Find contacts  →  Draft outreach  →  You send  →  Follow-up cadence
     (WF2)               (WF3)              (WF4)          (manual)       (WF5 + WF6)
```

**Nothing is ever sent automatically.** Every outreach email is created as a Gmail draft that you review and send yourself. The system only creates drafts.

---

## The Webapp

### Dashboard (`/`)

The main view. Shows at a glance:

- **Status cards** — how many leads are at each stage (Qualified → Contact Found → Outreach Drafted → Outreach Sent → Replied → On Hold)
- **Pending actions** — a yellow box appears when something needs your attention (drafts to review, emails to mark as sent, countries not yet started)
- **Countries worked** — which countries have leads and how many have been sent
- **Activity feed** — real-time log of every pipeline action (draft created, email sent, bump drafted, etc.)

> The dashboard reads directly from the Google Sheet. Refresh the page to see the latest data.

---

### Run Pipeline (`/pipeline/run`)

This is how you kick off work for a new country or re-run a stage.

**Step 1 — Pick countries**  
Click individual countries, or use the shortcut buttons to select a group:
- LatAm North (Mexico, Venezuela, Caribbean)
- LatAm South (Brazil, Peru, Chile, Argentina)
- Asia Pacific (Japan, South Korea, Indonesia, Laos, Thailand, Taiwan)
- Greater China (China, Taiwan)
- EMEA + Israel (South Africa, Turkey, Israel)

**Step 2 — Choose pipeline stage**

| Stage | What it does |
|---|---|
| Source companies (WF2) | Searches Apollo + Explorium for pharma companies with gastro focus. Scores each company 1–5 and writes P1/P2/P3 qualified leads to the Google Sheet. |
| Find contacts (WF3) | For each QUALIFIED lead, searches Apollo for a C-suite or Director-level contact with a verified email. Updates the lead's Contact Name, Title, Email columns. |
| Draft outreach (WF4) | For each CONTACT FOUND lead (P1 by default), writes a personalised outreach email using Claude AI and saves it as a Gmail draft in `cflack@slapharmagroup.com`. |
| All stages (full run) | Runs Stage 1 only and lets the system progress from there. Use this for a brand-new country. |

**Step 3 — Options**
- **Priority filter** — P1 only (score ≥ 4), P1 + P2 (score ≥ 3), or All. Drafts stage defaults to P1 only.
- **Operator** — SCF (Clifton) or JS (Justin). Used for the activity log.

**Step 4 — Click Run**  
The button shows each country and a green "✓ Started" or red error. n8n runs countries one at a time (to stay within API rate limits). Each country takes 1–3 minutes depending on how many companies are found.

After running, watch the **Dashboard activity feed** to see progress.

---

### Leads (`/leads`)

A full table of every lead in the Google Sheet, filterable by status and country. Shows company name, website, contact details, priority, and current status.

Use this to audit what's in the pipeline or find a specific company.

---

### Drafts (`/outreach/drafts`)

Shows all Gmail drafts with "Anatop" in the subject line, pulled live from `cflack@slapharmagroup.com`.

For each draft you can:
- Read the full email body
- **Delete** a draft if it's not good enough (the lead stays in the Sheet — you'd re-run Draft Outreach to regenerate)

> This view is read from Gmail directly. It only shows drafts with "Anatop" in the subject — other drafts are not touched.

---

### Approve / Mark as Sent (`/outreach/approve`)

After you **manually send** a draft from Gmail, come here to record it.

Enter the lead ID (format: `ANTP-MX-005`) and the date you sent it. Clicking Approve:
1. Updates the lead's status to OUTREACH SENT in the Google Sheet
2. Records the send date
3. Starts the **follow-up cadence** — n8n will automatically draft bump emails at Day +14, Day +30, and Day +60

> This is the only step that triggers the automated follow-up. If you skip it, no follow-ups will be drafted.

---

## The n8n Workflows

Access at: https://sla-bd.app.n8n.cloud

You don't need to use n8n directly for day-to-day work — the webapp handles everything. But it's useful for:
- Checking if a run succeeded or failed (Executions tab)
- Editing workflow logic
- Triggering a workflow manually for debugging

### Workflow overview

| # | Name | Triggered by | What it does |
|---|---|---|---|
| WF1 | Data Webhook | All other workflows + webapp | Reads/writes the Google Sheet. The central data layer. |
| WF2 | Country Sourcing | Run Pipeline → "Source companies" | Serper competitive search + Apollo + Explorium + LLM qualification → appends to Sheet |
| WF3 | Contact Research | Run Pipeline → "Find contacts" | Apollo people search per company → updates Sheet with contact details |
| WF4 | Outreach Drafting | Run Pipeline → "Draft outreach" | Claude Sonnet drafts personalised email → creates Gmail draft → updates Sheet |
| WF5 | Approval Handler | Approve page in webapp | Updates Sheet status to OUTREACH SENT → kicks off WF6 |
| WF6 | Follow-up Cadence | WF5 (automatically) | Waits 14 days → drafts bump email → waits 16 days → drafts bump 2 → waits 30 days → drafts final bump |

### Checking a failed run

1. Go to https://sla-bd.app.n8n.cloud
2. Click **Executions** in the left sidebar
3. Find the red (failed) execution
4. Click it to see which node failed and the error message
5. Common causes: Apollo API key expired, Google OAuth token needs re-authorising, Explorium endpoint returned no results (not a failure — just 0 companies found)

### Re-authorising Google credentials

If Google Sheets or Gmail stops working (usually after 6 months):
1. Go to **Credentials** in the left sidebar
2. Click "Google Sheets account" or "Gmail account"
3. Click "Reconnect" and follow the OAuth flow with Sam's Google account

---

## The Google Sheet

The sheet is the single source of truth. The webapp and all n8n workflows read from and write to the same sheet.

**Tabs:**
- **Leads** — one row per company. Key columns: ID, Company, Status, Priority, Country, Contact Name, Contact Email, Notes
- **Activity** — timestamped log of every pipeline event
- **Countries** — summary stats per country (how many sourced, contacted, sent)

**Status values (in order):**

| Status | Meaning |
|---|---|
| QUALIFIED | Company found and scored by WF2. Not yet researched for contacts. |
| CONTACT FOUND | Apollo found a named contact with verified email. Ready for outreach. |
| OUTREACH DRAFTED | Gmail draft created. Awaiting your review and send. |
| OUTREACH SENT | You sent the email and recorded it in the Approve page. Follow-up cadence running. |
| REPLIED | Contact replied. Update this manually when a reply comes in. |
| ON HOLD | No reply after all follow-ups. Updated by WF6 at the end of cadence. |

---

## Hard rules — never violated by the system

These are enforced in every n8n workflow and every AI prompt:

1. **No auto-send.** The system creates Gmail drafts only. It never calls the Gmail "send" API.
2. **No invented facts.** Every AI-written email uses only known Anatop information (diltiazem, Alfasigma, Mexico track record).
3. **No "Anoheal".** This competitor product name is banned from all email output.
4. **No Armstrong.** Armstrong Pharmaceutical is a direct competitor. They are blocked from the sourcing pipeline.
5. **English only.** All outreach emails are written in English, regardless of country.

---

## Quick reference

| Task | Where |
|---|---|
| Start work on a new country | Run Pipeline → Source companies |
| Check what needs doing today | Dashboard → Pending actions |
| Review AI-written email drafts | Outreach → Drafts |
| Record that you sent an email | Outreach → Approve / Mark as Sent |
| See all leads and their status | Leads |
| Debug a failed n8n run | https://sla-bd.app.n8n.cloud → Executions |
| Edit the Google Sheet directly | Open Sheet in Google Drive |

---

## Contact

**Clifton Flack** — cflack@slapharmagroup.com — built and maintains this system  
**Sam** — owns the Google account used for Sheets + Gmail OAuth  
**Justin** — co-operator (select "JS" as Operator when running on his behalf)
