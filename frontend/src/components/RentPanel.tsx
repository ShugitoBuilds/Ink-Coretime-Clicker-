import { useMemo } from "react";

import { useGame } from "../context/GameContext";

const formatBalance = (value: bigint) => {
  if (value === 0n) return "0";
  return value.toString();
};

const RentPanel = () => {
  const {
    player,
    blockProgress,
    rentCore,
    claimReward,
    actions: { rent, claim },
    isBoomActive,
    boomMessage,
    refreshStatus,
  } = useGame();

  const progressPercentage = Math.round(blockProgress * 100);
  const pendingReward = player ? formatBalance(player.pendingReward) : "0";
  const totalRewards = player ? formatBalance(player.totalRewards) : "0";

  const claimDisabled = useMemo(() => {
    if (!player) return true;
    return player.pendingReward === 0n || claim.isLoading;
  }, [player, claim.isLoading]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-bg-panel p-6 shadow-lg shadow-primary/25">
      <div className="pointer-events-none absolute -left-10 -top-24 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Core Rental</h2>
        {isBoomActive && (
          <span className="rounded-full border border-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Boom x2 Active
          </span>
        )}
      </div>

      <div className="relative mt-6 grid gap-4">
        <button
          onClick={rentCore}
          disabled={rent.isLoading}
          className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-bg-dark transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {rent.isLoading ? "Renting…" : "Rent Core 🚀"}
        </button>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <span>Rental progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <button
          onClick={claimReward}
          disabled={claimDisabled}
          className="w-full rounded-lg border border-primary px-6 py-4 text-lg font-semibold text-primary transition hover:bg-primary hover:text-bg-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {claim.isLoading ? "Claiming…" : "Collect Rewards"}
        </button>
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-200">
        <div className="flex justify-between">
          <span>Pending reward</span>
          <span className="font-mono">{pendingReward}</span>
        </div>
        <div className="flex justify-between">
          <span>Total rewards</span>
          <span className="font-mono">{totalRewards}</span>
        </div>
        <button
          onClick={refreshStatus}
          className="self-start rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-gray-400 transition hover:border-primary hover:text-white"
        >
          Refresh status
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        <p>Last update: {player ? new Date(player.lastUpdatedAt).toLocaleTimeString() : "—"}</p>
        {rent.success && (
          <p className="text-xs text-emerald-400">✔ {rent.success}</p>
        )}
        {claim.success && (
          <p className="text-xs text-emerald-400">✔ {claim.success}</p>
        )}
        {(rent.error || claim.error) && (
          <p className="text-xs text-red-400">
            {rent.error ?? claim.error}
          </p>
        )}
        {boomMessage && (
          <p className="text-xs text-primary">{boomMessage}</p>
        )}
      </div>
    </section>
  );
};

export default RentPanel;
