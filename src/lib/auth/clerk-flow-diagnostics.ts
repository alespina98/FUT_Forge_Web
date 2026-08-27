type ClerkDiagnosticError = { code?: string; message?: string } | null | undefined;

export type ClerkFlowDiagnostic = {
  operation: string;
  correlationId: string;
  error?: ClerkDiagnosticError;
  signInStatus?: string | null;
  statusBefore?: string | null;
  sessionTask?: string | null;
  finalizeAttempted?: boolean;
  finalizeFailed?: boolean;
};

export function createClerkFlowCorrelationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `clerk-${Date.now().toString(36)}`;
}

export function reportClerkFlowDiagnostic(diagnostic: ClerkFlowDiagnostic): void {
  const payload = {
    operation: diagnostic.operation,
    error_code: diagnostic.error?.code ?? null,
    error_message: diagnostic.error?.message ?? null,
    status_before: diagnostic.statusBefore ?? null,
    status_after: diagnostic.signInStatus ?? null,
    current_task: diagnostic.sessionTask ?? null,
    finalize_attempted: diagnostic.finalizeAttempted ?? false,
    finalize_error: diagnostic.finalizeFailed ? diagnostic.error?.code ?? "unknown" : null,
    request_id: diagnostic.correlationId,
  };
  if (diagnostic.error || diagnostic.finalizeFailed) console.error("[clerk-auth]", payload);
  else console.info("[clerk-auth]", payload);
}

export function navigateToDecoratedUrl(
  decoratedUrl: string,
  replace: (url: string) => void,
): void {
  if (/^https?:\/\//i.test(decoratedUrl)) window.location.href = decoratedUrl;
  else replace(decoratedUrl);
}
