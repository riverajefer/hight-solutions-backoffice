// Denominaciones colombianas — billetes
export const COLOMBIAN_BILLS = [100000, 50000, 20000, 10000, 5000, 2000] as const;

// Denominaciones colombianas — monedas
export const COLOMBIAN_COINS = [1000, 500, 200, 100, 50] as const;

export const ALL_COLOMBIAN_DENOMINATIONS = [
  ...COLOMBIAN_BILLS,
  ...COLOMBIAN_COINS,
] as const;
