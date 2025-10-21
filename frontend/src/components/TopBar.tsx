import { useMemo } from "react";

import { useGame } from "../context/GameContext";

const shorten = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(address.length - 4)}`;

const TopBar = () => {
  const {
    accounts,
    selectedAccount,
    selectAccount,
    connectWallet,
    actions: { connect },
  } = useGame();

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.address,
        label: account.meta.name
          ? `${account.meta.name} (${shorten(account.address)})`
          : shorten(account.address),
      })),
    [accounts],
  );

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 px-6 py-5 shadow-lg shadow-primary/10 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-primary">Coretime Clicker</h1>
        <p className="text-sm text-gray-300">
          Rent cores, wait for blocks, and collect rewards as you learn Polkadot
          elastic scaling concepts.
        </p>
      </div>

      <div className="flex flex-col items-start gap-3 md:items-end">
        {selectedAccount ? (
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="text-xs uppercase tracking-wide text-gray-400">
              Active Account
            </label>
            <select
              value={selectedAccount.address}
              onChange={(event) => selectAccount(event.target.value)}
              className="min-w-[220px] rounded-full border border-primary bg-transparent px-4 py-2 text-sm text-white outline-none ring-primary transition focus:ring"
            >
              {accountOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-bg-panel text-white"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            disabled={connect.isLoading}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-bg-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connect.isLoading ? "Connecting…" : "Connect Wallet"}
          </button>
        )}

        {connect.error && (
          <span className="max-w-xs text-xs text-red-400">{connect.error}</span>
        )}
      </div>
    </header>
  );
};

export default TopBar;
