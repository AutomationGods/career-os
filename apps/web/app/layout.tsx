import "./styles.css";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import type { ReactNode } from "react";

const productNavigation = [
  { href: "/career-command", label: "Command Center" },
  { href: "/job-pipeline-results", label: "Job Matches" },
  { href: "/application-packets", label: "Applications" },
  { href: "/relationships", label: "Contacts" }
];

async function getInitialAuth() {
  if (process.env.CAREER_OS_AUTH_DISABLED === "true") return { user: null };
  const { accessToken: _accessToken, ...initialAuth } = await withAuth({ ensureSignedIn: false });
  return initialAuth;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const initialAuth = await getInitialAuth();

  return (
    <html lang="en">
      <body>
        <AuthKitProvider initialAuth={initialAuth}>
          <header className="top-nav" aria-label="Primary navigation">
            <a className="top-nav-brand" href="/career-command">Career OS</a>
            <nav className="top-nav-links">
              {productNavigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
            </nav>
          </header>
          {children}
        </AuthKitProvider>
      </body>
    </html>
  );
}
