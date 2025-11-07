export const RPC_ENDPOINT =
  import.meta.env.VITE_RPC_ENDPOINT ?? "wss://kusama-asset-hub-rpc.polkadot.io";

export const PRIZE_POOL_ADDRESS = import.meta.env.VITE_PRIZE_POOL_ADDRESS ?? "";

export const RNG_ADDRESS = import.meta.env.VITE_RNG_ADDRESS ?? "";

export const CONTRACT_METADATA_PATH =
  import.meta.env.VITE_CONTRACT_METADATA ?? "/contracts/prize_pool.json";

export const RNG_METADATA_PATH =
  import.meta.env.VITE_RNG_METADATA ?? "/contracts/rng.json";

export const ENTRY_FEE = BigInt(
  import.meta.env.VITE_ENTRY_FEE ?? "1000000000000",
);

export const REVEAL_WINDOW_BLOCKS = Number(
  import.meta.env.VITE_REVEAL_WINDOW_BLOCKS ?? 10,
);

export const RAKE_BPS = Number(
  import.meta.env.VITE_RAKE_BPS ?? 500,
);

export const TOKEN_DECIMALS = Number(
  import.meta.env.VITE_TOKEN_DECIMALS ?? 12,
);

export const TOKEN_SYMBOL =
  import.meta.env.VITE_TOKEN_SYMBOL ?? "KSM";

const defaultMockSetting =
  PRIZE_POOL_ADDRESS.length === 0 ? "true" : "false";

export const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK ?? defaultMockSetting) !== "false";
