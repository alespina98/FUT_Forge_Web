type ClerkDiagnosticError = { code?: string; message?: string } | null | undefined;

export type ClerkFlowDiagnostic = {
  operation: string;
  correlationId: string;
  error?: ClerkDiagnosticError;
  signInStatus?: string | null;
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
    correlationId: diagnostic.correlationId,
    errorCode: diagnostic.error?.code ?? null,
    errorMessage: diagnostic.error?.message ?? null,
    signInStatus: diagnostic.signInStatus ?? null,
    sessionTask: diagnostic.sessionTask ?? null,
    finalizeAttempted: diagnostic.finalizeAttempted ?? false,
    finalizeFailed: diagnostic.finalizeFailed ?? false,
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
