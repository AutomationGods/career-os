// ErrorBoundary deferred — the root tsconfig's `types: ["node"]` prevents
// any React class-component type from resolving (including third-party wrappers
// like react-error-boundary that extend React.Component internally).
// Fix: add "react" to the root tsconfig's `types` array, or scope tsc to
// per-package tsconfigs. Until then, error handling is done via Sonner toasts
// and per-route try/catch in server components.

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return children;
}
