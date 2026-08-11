const MAX_SEARCH_TERMS = 10;
const MAX_TERM_LENGTH = 40;

export function tokenizeLeakSearch(value: string): string[] {
  return (value.normalize("NFKC").toLocaleLowerCase("und").match(/[\p{L}\p{N}]+/gu) || [])
    .map((term) => term.slice(0, MAX_TERM_LENGTH))
    .filter(Boolean);
}

export function buildLeakPrefixQuery(value: string): string | null {
  const terms = tokenizeLeakSearch(value).slice(0, MAX_SEARCH_TERMS);
  return terms.length ? terms.map((term) => `${term}:*`).join(" & ") : null;
}

export function searchableLeakText(leak: {
  title: string;
  shortDescription: string;
  content: string;
  normalizedSubject: string;
  translations: Record<string, unknown>;
}): string {
  return `${leak.title} ${leak.shortDescription} ${leak.content} ${leak.normalizedSubject} ${JSON.stringify(leak.translations)}`;
}

export function matchesLeakPrefixSearch(text: string, query: string): boolean {
  const documentTerms = tokenizeLeakSearch(text);
  const queryTerms = tokenizeLeakSearch(query);
  return queryTerms.length > 0 && queryTerms.every((queryTerm) => documentTerms.some((documentTerm) => documentTerm.startsWith(queryTerm)));
}
