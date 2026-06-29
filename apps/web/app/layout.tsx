import { readFeatureFlags } from "@career-os/config";
import "./styles.css";
import type { ReactNode } from "react";
import { auth } from "../auth";

const mvpNavLinks = [
  { label: "Jobs", href: "/jobs" },
  { label: "Application Packets", href: "/application-packets" },
  { label: "Master Resume", href: "/master-resume" },
  { label: "Profile Facts", href: "/profile-facts" },
  { label: "Resume Factory", href: "/resumes" },
  { label: "Documents", href: "/documents" },
  { label: "Approvals", href: "/approvals" },
  { label: "Settings", href: "/settings" }
];

const futureNavLinks = [
  { label: "Pipeline Results", href: "/job-pipeline-results" },
  { label: "Relationships", href: "/relationships" }
];

function SignedInShell({ children, showPlaceholderDomains }: { children: ReactNode; showPlaceholderDomains: boolean }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand brand-link" href="/">Career OS</a>
        <nav className="nav" aria-label="Career OS launch navigation">
          {mvpNavLinks.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
          {showPlaceholderDomains ? futureNavLinks.map((link) => <a key={link.href} href={link.href}>{link.label}</a>) : null}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const signedIn = Boolean((session?.user as { id?: string } | undefined)?.id);
  const showPlaceholderDomains = readFeatureFlags().ENABLE_PLACEHOLDER_DOMAINS;

  return (
    <html lang="en">
      <body>{signedIn ? <SignedInShell showPlaceholderDomains={showPlaceholderDomains}>{children}</SignedInShell> : children}</body>
    </html>
  );
}
