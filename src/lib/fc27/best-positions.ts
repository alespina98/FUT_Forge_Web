export const FC27_POSITIONS = ["GK", "RB", "CB", "LB", "CDM", "CM", "CAM", "RM", "LM", "RW", "LW", "ST"] as const;
export type Fc27Position = (typeof FC27_POSITIONS)[number];

export function isFc27Position(value: string): value is Fc27Position {
  return FC27_POSITIONS.includes(value.toUpperCase() as Fc27Position);
}

export function positionSlug(position: Fc27Position): string {
  return position.toLowerCase();
}
