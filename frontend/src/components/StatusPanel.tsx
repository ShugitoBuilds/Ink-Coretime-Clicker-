import { useMemo } from "react";

import { useGame } from "../context/GameContext";
import { formatAddress } from "../hooks/useLeaderboard";

const StatusPanel = () => {
  const { player, blockHeight, isReady, selectedAccount } = useGame();

  const statusItems = useMemo(
    () => [
      {
        label: "Cores rented",
        value: player ? player.coresRented : 0,
      },
      {
        label: "Multiplier",
        value: player ? `${player.activeMultiplier}×` : "1×",
      },
      {
        label: "Boom claims left",
        value: player ? player.boomClaimsRemaining : 0,
      },
      {
        label: "Total rewards",
        value: player ? player.totalRewards.toString() : 0,
      },
      {
        label: "Last claim block",
        value: player ? player.lastClaimBlock : "—",
      },
      {
        label: "Current block (local sim)",
        value: blockHeight,
      },
    ],
    [player, blockHeight],
  );

  return (
    <section className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-bg-panel p-6 shadow-lg shadow-primary/15">
      <div className="pointer-events-none absolute -top-24 right-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
      <div>
        <h2 className="text-xl font-semibold">Status</h2>
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {selectedAccount ? "Connected" : "Wallet not connected"}
        </p>
        {selectedAccount && (
          <p className="mt-1 text-xs text-gray-500">
            {formatAddress(selectedAccount.address)}
          </p>
        )}
      </div>

        <dl className="mt-4 space-y-2 text-sm text-gray-200">
          {statusItems.map((item) => (
            <div key={item.label} className="flex justify-between">
              <dt className="text-gray-400">{item.label}</dt>
              <dd className="font-mono">{item.value}</dd>
            </div>
          ))}
        </dl>

        {!isReady && (
          <p className="mt-4 rounded-lg border border-dashed border-white/20 bg-black/20 p-3 text-xs text-gray-400">
            Connect your wallet to start renting cores. Block simulation begins
            after connection.
          </p>
        )}
      </div>
    </section>
  );
};

export default StatusPanel;
