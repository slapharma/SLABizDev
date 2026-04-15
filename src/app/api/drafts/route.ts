import { auth } from "@/auth";
import { NextResponse } from "next/server";

interface GmailDraft {
  id: string;
  message: { id: string; threadId: string };
}

interface GmailDraftDetail {
  id: string;
  subject: string;
  to: string;
  snippet: string;
  body: string;
  messageId: string;
}

// Gmail's API returns `snippet` HTML-entity-encoded (e.g. `I&#39;m` for `I'm`).
// Decode here so the frontend can render as plain text in a <p>/<pre>.
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export async function GET() {
  const session = await auth();
  const token = session?.accessToken as string | undefined;
  if (!token) return NextResponse.json({ drafts: [] });

  // Fetch draft list
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=25",
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!listRes.ok) return NextResponse.json({ drafts: [] });
  const { drafts = [] } = await listRes.json();

  // Fetch details for each draft, filter to Anatop-related ones
  const details: GmailDraftDetail[] = [];
  for (const draft of drafts as GmailDraft[]) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draft.id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!detailRes.ok) continue;
    const d = await detailRes.json();
    const headers = d.message?.payload?.headers ?? [];
    const subject = headers.find((h: {name:string}) => h.name === "Subject")?.value ?? "";
    const to = headers.find((h: {name:string}) => h.name === "To")?.value ?? "";

    if (!subject.toLowerCase().includes("anatop")) continue;

    // Decode body
    let body = "";
    const parts = d.message?.payload?.parts;
    if (parts) {
      const textPart = parts.find((p: {mimeType:string}) => p.mimeType === "text/plain");
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
      }
    } else if (d.message?.payload?.body?.data) {
      body = Buffer.from(d.message.payload.body.data, "base64").toString("utf-8");
    }

    details.push({
      id: draft.id,
      subject: decodeEntities(subject),
      to: decodeEntities(to),
      snippet: decodeEntities(d.message?.snippet ?? ""),
      body: body.trim(),
      messageId: d.message?.id ?? "",
    });
  }

  return NextResponse.json({ drafts: details });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const delToken = session?.accessToken as string | undefined;
  if (!delToken) return NextResponse.json({ error: "Sign in to delete drafts" }, { status: 401 });
  const { draftId } = await req.json();
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${delToken}` } }
  );
  return NextResponse.json({ ok: res.ok, status: res.status });
}
