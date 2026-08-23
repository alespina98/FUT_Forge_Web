const ALLOWED_RETURN_PATHS = [
  /^\/fc27\/players$/,
  /^\/fc27\/rankings$/,
  /^\/fc27\/stat-finder$/,
  /^\/fc27\/hidden-gems$/,
  /^\/fc27\/best\/[a-z0-9-]+$/,
  /^\/fc27\/similar\/\d+-[a-z0-9-]+$/,
];
export function safeFc27ReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return "/fc27/players";
  const question = value.indexOf("?");
  const path = question === -1 ? value : value.slice(0, question);
  if (!ALLOWED_RETURN_PATHS.some((pattern) => pattern.test(path))) return "/fc27/players";
  return value;
}
export function playerHrefWithReturn(playerHref: string, returnTo: string): string {
  return playerHref + "?returnTo=" + encodeURIComponent(returnTo);
}
export type Fc27ReturnContext = "players" | "rankings" | "statFinder" | "hiddenGems" | "best" | "similar";
export function fc27ReturnContext(returnTo: string): { kind: Fc27ReturnContext; position?: string } {
  const path = returnTo.split("?")[0];
  if (path === "/fc27/rankings") return { kind: "rankings" };
  if (path === "/fc27/stat-finder") return { kind: "statFinder" };
  if (path === "/fc27/hidden-gems") return { kind: "hiddenGems" };
  if (path.startsWith("/fc27/similar/")) return { kind: "similar" };
  if (path.startsWith("/fc27/best/")) return { kind: "best", position: path.slice("/fc27/best/".length).toUpperCase() };
  return { kind: "players" };
}
