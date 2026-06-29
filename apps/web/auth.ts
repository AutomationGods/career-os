import { PrismaAdapter } from "@auth/prisma-adapter";
import { assertServerEnv } from "@career-os/config";
import { prisma } from "@career-os/db";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

function present(value: string | undefined) {
  return Boolean(value && value.trim() && value !== "change-me");
}

type AuthUserRecord = { id: string; email?: string | null; name?: string | null; role?: string };
type AuthPrismaClient = {
  user: {
    upsert(args: unknown): Promise<AuthUserRecord>;
  };
};

function normalizedEmail(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "local-user@career-os.local";
}

const authPrisma = prisma as unknown as AuthPrismaClient;
const isNextProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

if (process.env.NODE_ENV === "production" && !isNextProductionBuild) assertServerEnv();

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const hasGoogleProvider = present(googleClientId) && present(googleClientSecret);
const useDevCredentialsProvider = process.env.NODE_ENV !== "production" && !hasGoogleProvider;
const allowedEmails = (process.env.AUTH_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const providers = hasGoogleProvider
  ? [
      Google({
        clientId: googleClientId!,
        clientSecret: googleClientSecret!
      })
    ]
  : [
      Credentials({
        name: "Local development sign-in",
        credentials: {
          email: { label: "Email", type: "email", placeholder: "local-user@career-os.local" }
        },
        async authorize(credentials) {
          if (!useDevCredentialsProvider) return null;
          const email = normalizedEmail(credentials.email);
          if (allowedEmails.length > 0 && !allowedEmails.includes(email)) return null;
          const user = await authPrisma.user.upsert({
            where: { email },
            update: { name: email.split("@")[0] },
            create: { email, name: email.split("@")[0] }
          });
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        }
      })
    ];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as never),
  providers,
  session: { strategy: useDevCredentialsProvider ? "jwt" : "database" },
  trustHost: true,
  callbacks: {
    async signIn({ user, profile }) {
      if (allowedEmails.length === 0 || useDevCredentialsProvider) return true;

      const email = (user.email ?? (profile?.email as string | undefined) ?? "").toLowerCase();
      return allowedEmails.includes(email);
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    async session({ session, user, token }) {
      if (session.user) {
        const sessionUser = session.user as typeof session.user & { id?: string; role?: string };
        sessionUser.id = user?.id ?? (typeof token?.id === "string" ? token.id : undefined);
        sessionUser.role = (user as { role?: string } | undefined)?.role ?? (typeof token?.role === "string" ? token.role : "user");
      }

      return session;
    }
  }
});
