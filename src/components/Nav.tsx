"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/outreach/drafts", label: "Drafts" },
  { href: "/outreach/approve", label: "Approve" },
  { href: "/pipeline/run", label: "Run Pipeline" },
  { href: "/logs", label: "Logs" },
];

const externalLinks = [
  { href: "/user-guide.html", label: "User Guide" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6 h-14">
        <span className="font-semibold text-zinc-50 text-sm whitespace-nowrap">
          Anatop <span className="text-emerald-400">BD</span>
        </span>
        <div className="flex items-center gap-1 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                path === l.href
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <span className="text-zinc-700 mx-1">|</span>
          {externalLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-md text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
