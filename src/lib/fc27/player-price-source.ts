export interface PlayerPriceSource {
  hasReliablePriceData(): Promise<boolean>;
  getPlayerPrice(playerId: number): Promise<number | null>;
  getPrices(playerIds: readonly number[]): Promise<ReadonlyMap<number, number>>;
}

export const unavailableFc27PriceSource: PlayerPriceSource = {
  async hasReliablePriceData() { return false; },
  async getPlayerPrice() { return null; },
  async getPrices() { return new Map(); },
};
