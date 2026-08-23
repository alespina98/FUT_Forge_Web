export function entitySlug(name: string): string {
  return [...name.normalize("NFKD")]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 0x300 || code > 0x36f;
    })
    .join("")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}
