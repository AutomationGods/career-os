import type { User as WorkOSUser } from "@workos-inc/node";
import { prisma } from "@career-os/db";

export type CareerAuthUser = {
  userId: string;
  email: string;
  name: string | null;
};

export class UnauthenticatedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export function isUnauthenticatedError(error: unknown) {
  return error instanceof UnauthenticatedError;
}

function isLocalAuthDisabled() {
  return process.env.CAREER_OS_AUTH_DISABLED === "true";
}

function shouldSyncLocalAuthUserToPrisma() {
  return process.env.CAREER_OS_COMMAND_RUNTIME !== "local-memory" || process.env.NODE_ENV === "production";
}

function localAuthUser(): CareerAuthUser {
  const userId = process.env.CAREER_OS_AUTH_DISABLED_USER_ID?.trim() || "local-dev-user";
  const email = process.env.CAREER_OS_AUTH_DISABLED_EMAIL?.trim() || `${userId}@career-os.local`;
  const name = process.env.CAREER_OS_AUTH_DISABLED_NAME?.trim() || "Local Developer";

  return { userId, email, name };
}

function displayNameForWorkOSUser(user: WorkOSUser) {
  const joinedName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.name?.trim() || joinedName || null;
}

function careerUserFromWorkOS(user: WorkOSUser): CareerAuthUser {
  const userId = user.id;
  const email = user.email?.trim() || `${userId}@users.workos.local`;

  return {
    userId,
    email,
    name: displayNameForWorkOSUser(user)
  };
}

export async function ensureCareerUser(user: CareerAuthUser) {
  await prisma.user.upsert({
    where: { id: user.userId },
    update: {
      email: user.email,
      name: user.name
    },
    create: {
      id: user.userId,
      email: user.email,
      name: user.name
    }
  });

  return user;
}

export async function getAuthenticatedCareerUser() {
  if (isLocalAuthDisabled()) {
    const user = localAuthUser();
    if (!shouldSyncLocalAuthUserToPrisma()) return user;
    try {
      return await ensureCareerUser(user);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") return user;
      throw error;
    }
  }

  const { withAuth } = await import("@workos-inc/authkit-nextjs");
  const auth = await withAuth();
  if (!auth.user) return null;

  return ensureCareerUser(careerUserFromWorkOS(auth.user));
}

export async function requireAuthenticatedCareerUser() {
  const user = await getAuthenticatedCareerUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}
