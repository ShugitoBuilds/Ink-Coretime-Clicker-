import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";
import type {
  InjectedAccountWithMeta,
  InjectedExtension,
} from "@polkadot/extension-inject/types";

import type { WalletContextValue } from "../types/wallet";

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const EXTENSION_NAME = "Coretime Clicker";

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<InjectedAccountWithMeta | null>(null);
  const [extension, setExtension] = useState<InjectedExtension | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const extensions = await web3Enable(EXTENSION_NAME);
      if (!extensions || extensions.length === 0) {
        throw new Error(
          "No Polkadot.js extension found. Install the extension and try again.",
        );
      }

      const injectedAccounts = await web3Accounts();
      if (injectedAccounts.length === 0) {
        throw new Error(
          "No accounts available in extension. Create or import an account first.",
        );
      }

      setExtension(extensions[0]);
      setAccounts(injectedAccounts);
      setSelectedAccount(injectedAccounts[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      setExtension(null);
      setAccounts([]);
      setSelectedAccount(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const selectAccount = useCallback((address: string) => {
    setSelectedAccount((current) => {
      if (current?.address === address) {
        return current;
      }

      const found = accounts.find((account) => account.address === address);
      return found ?? current;
    });
  }, [accounts]);

  const value = useMemo<WalletContextValue>(
    () => ({
      accounts,
      selectedAccount,
      isConnecting,
      isConnected: Boolean(selectedAccount),
      error,
      connect,
      selectAccount,
      extension,
    }),
    [accounts, selectedAccount, isConnecting, error, connect, selectAccount, extension],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};
