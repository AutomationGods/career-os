import { checkRateLimit, rateLimitHeaders } from "./app/api/_lib/rate-limit";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATH_PREFIXES = ["/api/auth", "/api/health", "/api/ready"];
const PUBLIC_FILE_PATTERN = /\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|css|js|map|txt|xml)$/i;
const defaultMutationBodyLimitBytes = 1024 * 1024;
const pastedContentBodyLimitBytes = 512 * 1024;
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

function withSecurityHeaders(response: Response) {
  response.headers.set("content-security-policy", contentSecurityPolicy);
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "no-referrer");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()");
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("cross-origin-resource-policy", "same-origin");
  if (process.env.NODE_ENV === "production") response.headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  return response;
}

function isPublicPath(pathname: string) {
  return pathname === "/" || PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hasAuthSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name === "authjs.session-token" || cookie.name === "__Secure-authjs.session-token" || cookie.name.startsWith("authjs.session-token.") || cookie.name.startsWith("__Secure-authjs.session-token."));
}

function unauthorizedApiResponse() {
  return withSecurityHeaders(Response.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 }));
}

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function bodyLimitFor(pathname: string) {
  if (pathname === "/api/jobs/import" || pathname === "/api/master-resume/import" || pathname === "/api/documents/export") return pastedContentBodyLimitBytes;
  return defaultMutationBodyLimitBytes;
}

function requestSizeTooLarge(request: NextRequest) {
  if (!mutationMethods.has(request.method.toUpperCase())) return false;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(contentLength) && contentLength > bodyLimitFor(request.nextUrl.pathname);
}

function rateLimitResponse(result: ReturnType<typeof checkRateLimit>) {
  return withSecurityHeaders(Response.json({ ok: false, error: { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." } }, { status: 429, headers: rateLimitHeaders(result) }));
}

function requestTooLargeResponse() {
  return withSecurityHeaders(Response.json({ ok: false, error: { code: "REQUEST_TOO_LARGE", message: "Request body is too large." } }, { status: 413 }));
}

function checkApiRateLimit(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  if (!pathname.startsWith("/api/") || method === "GET" || method === "HEAD" || method === "OPTIONS") return undefined;
  const isAuthRoute = pathname.startsWith("/api/auth");
  const limit = isAuthRoute ? 20 : 60;
  const result = checkRateLimit(`${clientKey(request)}:${pathname}:${method}`, { limit, windowMs: 60_000 });
  return result.allowed ? undefined : rateLimitResponse(result);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (requestSizeTooLarge(request)) return requestTooLargeResponse();
  const rateLimited = checkApiRateLimit(request);
  if (rateLimited) return rateLimited;

  if (PUBLIC_FILE_PATTERN.test(pathname) || isPublicPath(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/api/dev") && process.env.NODE_ENV === "production") {
    return withSecurityHeaders(Response.json({ ok: false, error: { code: "NOT_FOUND", message: "Not found." } }, { status: 404 }));
  }

  if (hasAuthSessionCookie(request)) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/api/")) {
    return unauthorizedApiResponse();
  }

  const signInUrl = new URL("/api/auth/signin", request.url);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.href);
  return withSecurityHeaders(NextResponse.redirect(signInUrl));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
