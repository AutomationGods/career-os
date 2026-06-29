import { fail } from "./responses";

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: string;
};

export class ApiSessionError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
  }
}

function userFromTestHeader(request?: Request): AuthenticatedUser | null {
  if (process.env.NODE_ENV !== "test" || !request) return null;

  const id = request.headers.get("x-career-os-test-user-id");
  if (!id) return null;

  return {
    id,
    email: request.headers.get("x-career-os-test-user-email"),
    name: request.headers.get("x-career-os-test-user-name"),
    role: request.headers.get("x-career-os-test-user-role") ?? "user"
  };
}

export async function optionalUser(request?: Request): Promise<AuthenticatedUser | null> {
  const testUser = userFromTestHeader(request);
  if (testUser) return testUser;

  const { auth } = await import("../../../auth");
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string } | undefined;
  if (!user?.id) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? "user"
  };
}

export async function requireUser(request?: Request): Promise<AuthenticatedUser> {
  const user = await optionalUser(request);
  if (!user) throw new ApiSessionError("Sign in required.", "UNAUTHENTICATED", 401);
  return user;
}

export async function requireAdmin(request?: Request): Promise<AuthenticatedUser> {
  const user = await requireUser(request);
  if (user.role !== "admin") throw new ApiSessionError("Admin access required.", "FORBIDDEN", 403);
  return user;
}

export function sessionErrorResponse(error: unknown) {
  if (error instanceof ApiSessionError) return fail(error.message, error.code, error.status);
  throw error;
}

function originFrom(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function originsFromCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((origin) => originFrom(origin.trim()))
    .filter((origin): origin is string => Boolean(origin));
}

export function assertSameOriginMutation(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return;

  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = originFrom(process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? null);
  const developmentFallbackOrigins = process.env.NODE_ENV === "production" ? [] : [requestOrigin];
  const allowedOrigins = new Set([configuredOrigin, ...originsFromCsv(process.env.ALLOWED_ORIGINS), ...developmentFallbackOrigins].filter(Boolean));
  const sourceOrigin = originFrom(request.headers.get("origin")) ?? originFrom(request.headers.get("referer"));

  if (!sourceOrigin || !allowedOrigins.has(sourceOrigin)) {
    throw new ApiSessionError("Same-origin request required.", "INVALID_ORIGIN", 403);
  }
}

export async function requireMutationUser(request: Request) {
  assertSameOriginMutation(request);
  return requireUser(request);
}
