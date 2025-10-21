import type {
  InjectedAccountWithMeta,
  InjectedExtension,
} from "@polkadot/extension-inject/types";

export type WalletAccount = InjectedAccountWithMeta;

export interface WalletContextValue {
  accounts: WalletAccount[];
  selectedAccount: WalletAccount | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  selectAccount: (address: string) => void;
  extension: InjectedExtension | null;
}
