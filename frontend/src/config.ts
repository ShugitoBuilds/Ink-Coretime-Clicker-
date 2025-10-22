export const RPC_ENDPOINT =
  import.meta.env.VITE_RPC_ENDPOINT ?? "wss://rpc.shibuya.astar.network";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";

export const CONTRACT_METADATA_PATH =
  import.meta.env.VITE_CONTRACT_METADATA ?? "/contracts/coretime_clicker.json";

export const MATURITY_BLOCKS = Number(
  import.meta.env.VITE_MATURITY_BLOCKS ?? 12,
);

export const BASE_RATE = BigInt(import.meta.env.VITE_BASE_RATE ?? 10);

export const ELASTIC_BOOM_CHANCE = Number(
  import.meta.env.VITE_ELASTIC_BOOM_CHANCE ?? 0.01,
);

export const ELASTIC_BOOM_CLAIMS = Number(
  import.meta.env.VITE_ELASTIC_BOOM_CLAIMS ?? 5,
);

export const ELASTIC_BOOM_MULTIPLIER = Number(
  import.meta.env.VITE_ELASTIC_BOOM_MULTIPLIER ?? 2,
);

const defaultMockSetting =
  CONTRACT_ADDRESS.length === 0 ? "true" : "false";

export const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK ?? defaultMockSetting) !== "false";

export const ENERGY_MAX = Number(
  import.meta.env.VITE_ENERGY_MAX ?? 10,
);

export const ENERGY_REGEN_INTERVAL_MS = Number(
  import.meta.env.VITE_ENERGY_REGEN_INTERVAL_MS ?? 5000,
);

export const ENERGY_PER_RENT = Number(
  import.meta.env.VITE_ENERGY_PER_RENT ?? 1,
);

export const RENTAL_DURATION_BLOCKS = Number(
  import.meta.env.VITE_RENTAL_DURATION_BLOCKS ?? MATURITY_BLOCKS,
);

export const RENTAL_STORAGE_PREFIX =
  import.meta.env.VITE_RENTAL_STORAGE_PREFIX ??
  "coretime-clicker::rentals";
