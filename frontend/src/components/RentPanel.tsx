import { useMemo } from "react";

import { useGame } from "../context/GameContext";
import type { CoreRental } from "../types/game";
import { formatTokens, parseTokens } from "../lib/units";

const formatBalance = (value: bigint) => {
  if (value === 0n) return "0";
  return value.toString();
};

const RentPanel = () => {
  const {
    player,
    blockHeight,
    rentals,
    energy,
    maxEnergy,
    nextEnergyAt,
    balance,
    rentCost,
    tokenSymbol,
    queuedRentals,
    maxBatchSize,
    maxQueueSize,
    isBatchInFlight,
    autoRent,
    startAutoRent,
    stopAutoRent,
    rentCore,
    claimReward,
    deposit,
    withdraw,
    actions: { rent, claim, deposit: depositAction, withdraw: withdrawAction },
    isBoomActive,
    boomMessage,
    refreshStatus,
  } = useGame();

  const pendingReward = player ? formatBalance(player.pendingReward) : "0";
  const totalRewards = player ? formatBalance(player.totalRewards) : "0";

  const reservedBalance = useMemo(
    () => rentCost * BigInt(queuedRentals),
    [rentCost, queuedRentals],
  );

  const effectiveBalance = useMemo(
    () =>
      balance >= reservedBalance ? balance - reservedBalance : 0n,
    [balance, reservedBalance],
  );

  const canAffordNext = effectiveBalance >= rentCost;
  const queueCapacityLeft = maxQueueSize - queuedRentals;
  const isRentingNow = rent.isLoading || queuedRentals > 0 || isBatchInFlight;

  const claimDisabled = useMemo(() => {
    if (!player) return true;
    return player.pendingReward === 0n || claim.isLoading;
  }, [player, claim.isLoading]);

  const rentDisabled = useMemo(() => {
    if (energy <= 0) return true;
    if (!canAffordNext) return true;
    if (queueCapacityLeft <= 0) return true;
    return false;
  }, [energy, canAffordNext, queueCapacityLeft]);

  const rentButtonLabel = useMemo(() => {
    if (isRentingNow) {
      return queuedRentals > 0
        ? `Queued (${queuedRentals})`
        : "Submitting…";
    }
    if (energy <= 0) return "Charging…";
    if (!canAffordNext) return "Add balance";
    if (queueCapacityLeft <= 0) return "Queue full";
    return "Rent Core 🚀";
  }, [
    isRentingNow,
    queuedRentals,
    energy,
    canAffordNext,
    queueCapacityLeft,
  ]);

  const autoOptions = [5, 10, 20];

  const rentalGroups = useMemo(() => {
    const grouped: Record<CoreRental["status"], CoreRental[]> = {
      pending: [],
      active: [],
      matured: [],
    };
    rentals.forEach((rental) => {
      grouped[rental.status].push(rental);
    });
    return grouped;
  }, [rentals]);

  const progressFor = (rental: CoreRental) => {
    if (
      rental.status !== "active" ||
      rental.startBlock === null ||
      rental.readyAtBlock === null
    ) {
      return 0;
    }
    const total = Math.max(1, rental.readyAtBlock - rental.startBlock);
    const completed = Math.max(0, blockHeight - rental.startBlock);
    return Math.min(1, completed / total);
  };

  const nextEnergySeconds = useMemo(() => {
    if (!nextEnergyAt) return null;
    const diff = nextEnergyAt - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / 1000);
  }, [nextEnergyAt]);

  const handleDeposit = () => {
    const input = window.prompt(
      `Enter amount to deposit (${tokenSymbol}):`,
      "1",
    );
    if (!input) return;
    const parsed = parseTokens(input);
    if (parsed === null || parsed <= 0n) {
      window.alert("Invalid amount");
      return;
    }
    void deposit(parsed);
  };

  const handleWithdraw = () => {
    const input = window.prompt(
      `Enter amount to withdraw (${tokenSymbol}):`,
      "1",
    );
    if (!input) return;
    const parsed = parseTokens(input);
    if (parsed === null || parsed <= 0n) {
      window.alert("Invalid amount");
      return;
    }
    void withdraw(parsed);
  };

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
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <span>Prepaid balance</span>
            <span className="font-mono">{formatTokens(balance)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-500">
            <span>Reserved (queue)</span>
            <span className="font-mono">
              {queuedRentals > 0 ? formatTokens(reservedBalance) : "0"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-500">
            <span>Available</span>
            <span className="font-mono">{formatTokens(effectiveBalance)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDeposit}
              disabled={depositAction.isLoading}
              className="rounded-full border border-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-bg-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {depositAction.isLoading ? "Depositing…" : "Deposit"}
            </button>
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={withdrawAction.isLoading || balance === 0n}
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {withdrawAction.isLoading ? "Withdrawing…" : "Withdraw"}
            </button>
            <span className="self-center text-[10px] uppercase tracking-wide text-gray-500">
              Rent cost: {formatTokens(rentCost)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <span>Energy</span>
            <span className="font-mono">
              {energy}/{maxEnergy}
            </span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, Math.round((energy / maxEnergy) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Costs 1 energy per rental. {" "}
            {energy >= maxEnergy
              ? "Energy full."
              : nextEnergySeconds !== null
              ? `Next +1 in ${nextEnergySeconds}s`
              : "Recharging…"}
          </p>
        </div>

        <button
          onClick={rentCore}
          disabled={rentDisabled}
          className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-bg-dark transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {rentButtonLabel}
        </button>
        {isRentingNow && (
          <p className="text-center text-xs text-gray-400">
            {isBatchInFlight
              ? "Submitting batch to chain…"
              : "Waiting to batch queued rentals…"}
          </p>
        )}

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-gray-200">
            <h3>Core queue</h3>
            <span className="text-[10px] font-normal uppercase tracking-wide text-gray-500">
              {queuedRentals}/{maxQueueSize} queued · batch {maxBatchSize}
            </span>
          </div>
          {rentals.length === 0 ? (
            <p className="mt-2 text-xs text-gray-400">
              Click <strong>Rent Core</strong> to lease your first slot.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {rentals.map((rental) => {
                const progress = progressFor(rental);
                return (
                  <div
                    key={rental.id}
                    className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-gray-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wide text-gray-400">
                        {rental.status === "pending"
                          ? "Pending"
                          : rental.status === "active"
                          ? "Active"
                          : "Matured"}
                      </span>
                      <span className="font-mono text-gray-400">
                        {rental.startBlock !== null
                          ? `#${rental.startBlock}`
                          : "—"}
                      </span>
                    </div>
                    {rental.status === "active" && (
                      <div className="mt-2">
                        <div className="h-2 w-full rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.round(progress * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-gray-500">
                          {rental.readyAtBlock !== null
                            ? `Ready at block #${rental.readyAtBlock}`
                            : "Calculating..."}
                        </p>
                      </div>
                    )}
                    {rental.status === "pending" && (
                      <p className="mt-2 text-[10px] text-gray-500">
                        Waiting for transaction confirmation…
                      </p>
                    )}
                    {rental.status === "matured" && (
                      <p className="mt-2 text-[10px] text-primary">
                        Core ready! Claim rewards to harvest.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <span>Automation</span>
            <span className="text-xs font-mono text-gray-500">
              {autoRent.isActive
                ? `Remaining ${autoRent.remaining}`
                : "Inactive"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {autoOptions.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => startAutoRent(count)}
                disabled={!canAffordNext}
                className="rounded-full border border-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-bg-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                Auto rent {count}
              </button>
            ))}
            <button
              type="button"
              onClick={stopAutoRent}
              disabled={!autoRent.isActive}
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Stop auto
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Auto mode queues rentals on a short timer until balance or energy
            runs out.
          </p>
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
        {depositAction.error && (
          <p className="text-xs text-red-400">{depositAction.error}</p>
        )}
        {depositAction.success && (
          <p className="text-xs text-emerald-400">{depositAction.success}</p>
        )}
        {withdrawAction.error && (
          <p className="text-xs text-red-400">{withdrawAction.error}</p>
        )}
        {withdrawAction.success && (
          <p className="text-xs text-emerald-400">{withdrawAction.success}</p>
        )}
        {boomMessage && (
          <p className="text-xs text-primary">{boomMessage}</p>
        )}
      </div>
    </section>
  );
};

export default RentPanel;
