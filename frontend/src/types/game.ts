import type { WalletAccount } from "./wallet";

export type AccountAddress = string;

export interface PlayerStatus {
  address: AccountAddress;
  coresRented: number;
  totalRewards: bigint;
  pendingReward: bigint;
  activeMultiplier: number;
  boomClaimsRemaining: number;
  lastClaimBlock: number;
  lastUpdatedAt: number;
}

export interface ActionState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

export interface GameContextValue {
  player: PlayerStatus | null;
  isReady: boolean;
  blockHeight: number;
  blockProgress: number;
  isBoomActive: boolean;
  boomMessage: string | null;
  accounts: WalletAccount[];
  selectedAccount: WalletAccount | null;
  selectAccount: (address: string) => void;
  connectWallet: () => Promise<void>;
  rentCore: () => Promise<void>;
  claimReward: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  actions: {
    connect: ActionState;
    rent: ActionState;
    claim: ActionState;
  };
}
