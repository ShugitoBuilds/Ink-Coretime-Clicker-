import { useEffect, useState } from "react";

import { useWallet } from "../context/WalletContext";
import { useClicker } from "../context/ClickerContext";
import { formatTokens } from "../lib/units";
import { PrizePoolClient } from "../lib/prizePoolClient";
import { PRIZE_POOL_ADDRESS, RAKE_BPS } from "../config";
import { toast } from "./Toast";

const AdminPanel = () => {
  const { selectedAccount, extension, isConnected } = useWallet();
  const { poolInfo, refreshPoolInfo, blockHeight } = useClicker();
  const [adminAddress, setAdminAddress] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rakeBps, setRakeBps] = useState(RAKE_BPS);
  const [isExecutingDraw, setIsExecutingDraw] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isSettingPause, setIsSettingPause] = useState(false);
  const [isSettingRake, setIsSettingRake] = useState(false);

  const prizePoolClient = new PrizePoolClient();

  useEffect(() => {
    // In production, fetch admin address from contract
    // For MVP, check against env var or hardcoded admin
    const envAdmin = import.meta.env.VITE_ADMIN_ADDRESS;
    if (envAdmin) {
      setAdminAddress(envAdmin);
      setIsAdmin(selectedAccount?.address === envAdmin);
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (poolInfo) {
      setIsPaused(poolInfo.isPaused);
    }
  }, [poolInfo]);

  const handleExecuteDraw = async () => {
    if (!selectedAccount || !extension) {
      toast.warning("Please connect your wallet first");
      return;
    }

    // Security: Confirmation dialog for critical admin action
    const confirmed = window.confirm(
      `Are you sure you want to execute the draw? This will select a winner and reset the pool.`
    );
    if (!confirmed) {
      return;
    }

    setIsExecutingDraw(true);
    try {
      await prizePoolClient.executeDraw(selectedAccount, extension);
      await refreshPoolInfo();
      toast.success("Draw executed successfully!");
    } catch (error) {
      console.error("Failed to execute draw:", error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes("no entries")
            ? "No entries to draw. Wait for more entries."
            : error.message.includes("unauthorized")
            ? "You are not authorized to execute draws."
            : `Failed to execute draw: ${error.message}`
          : "Failed to execute draw. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsExecutingDraw(false);
    }
  };

  const handleWithdrawRake = async () => {
    if (!selectedAccount || !extension) {
      toast.warning("Please connect your wallet first");
      return;
    }

    setIsWithdrawing(true);
    try {
      const amount = await prizePoolClient.withdrawRake(selectedAccount, extension);
      await refreshPoolInfo();
      toast.success(`Rake withdrawn: ${formatTokens(amount)}`);
    } catch (error) {
      console.error("Failed to withdraw rake:", error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes("insufficient")
            ? "No rake available to withdraw."
            : error.message.includes("unauthorized")
            ? "You are not authorized to withdraw rake."
            : `Failed to withdraw rake: ${error.message}`
          : "Failed to withdraw rake. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSetPause = async (paused: boolean) => {
    if (!selectedAccount || !extension) {
      toast.warning("Please connect your wallet first");
      return;
    }

    // Security: Confirmation dialog for critical admin action
    const action = paused ? "pause" : "unpause";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} the contract? This will ${paused ? "prevent all entries and claims" : "allow entries and claims again"}.`
    );
    if (!confirmed) {
      return;
    }

    setIsSettingPause(true);
    try {
      await prizePoolClient.setPaused(selectedAccount, extension, paused);
      await refreshPoolInfo();
      toast.success(`Contract ${paused ? "paused" : "unpaused"} successfully`);
    } catch (error) {
      console.error("Failed to set pause:", error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes("unauthorized")
            ? "You are not authorized to pause/unpause the contract."
            : `Failed to set pause: ${error.message}`
          : "Failed to set pause. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSettingPause(false);
    }
  };

  const handleSetRakeBps = async () => {
    if (!selectedAccount || !extension) {
      toast.warning("Please connect your wallet first");
      return;
    }

    // Security: Validate input before submission
    if (rakeBps < 0 || rakeBps > 10000) {
      toast.error("Rake BPS must be between 0 and 10000 (0-100%)");
      return;
    }

    // Security: Confirmation dialog for critical admin action
    const confirmed = window.confirm(
      `Are you sure you want to set rake to ${rakeBps} BPS (${(rakeBps / 100).toFixed(2)}%)? This will affect all future entries.`
    );
    if (!confirmed) {
      return;
    }

    setIsSettingRake(true);
    try {
      await prizePoolClient.setRakeBps(selectedAccount, extension, rakeBps);
      await refreshPoolInfo();
      toast.success(`Rake BPS set to ${rakeBps} (${(rakeBps / 100).toFixed(2)}%)`);
    } catch (error) {
      console.error("Failed to set rake BPS:", error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes("unauthorized")
            ? "You are not authorized to set rake BPS."
            : `Failed to set rake BPS: ${error.message}`
          : "Failed to set rake BPS. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSettingRake(false);
    }
  };

  if (!isConnected || !isAdmin) {
    return null;
  }

  return (
    <div className="mt-6 rounded-2xl border border-yellow-500/50 bg-yellow-500/10 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-yellow-400">Admin Panel</h3>
        <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-400">
          DEV ONLY
        </span>
      </div>

      <div className="space-y-4">
        {/* Bankroll Health */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <h4 className="mb-2 text-sm font-semibold text-gray-300">
            Bankroll Health
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Pool Balance</span>
              <span className="font-mono">
                {poolInfo
                  ? formatTokens(poolInfo.poolBalance)
                  : "0"}{" "}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Rake Balance</span>
              <span className="font-mono">
                {poolInfo
                  ? formatTokens(poolInfo.rakeBalance)
                  : "0"}{" "}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Active Entries</span>
              <span>{poolInfo?.entryCount ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Draw</span>
              <span>#{poolInfo?.drawId ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Pause/Unpause */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-300">
            Circuit Breaker
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Status: {isPaused ? "Paused" : "Active"}
            </span>
            <button
              type="button"
              onClick={() => handleSetPause(!isPaused)}
              disabled={isSettingPause}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isPaused
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-red-500 text-white hover:bg-red-600"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isSettingPause
                ? "Setting..."
                : isPaused
                ? "Unpause"
                : "Pause"}
            </button>
          </div>
        </div>

        {/* Draw Management */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-300">
            Draw Management
          </h4>
          <button
            type="button"
            onClick={handleExecuteDraw}
            disabled={isExecutingDraw || !poolInfo || poolInfo.entryCount === 0}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-bg-dark transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExecutingDraw
              ? "Executing..."
              : `Execute Draw (${poolInfo?.entryCount ?? 0} entries)`}
          </button>
        </div>

        {/* Rake Management */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-300">
            Rake Management
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Rake (BPS):</label>
              <input
                type="number"
                value={rakeBps}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  // Security: Validate input on change
                  if (!isNaN(value) && value >= 0 && value <= 10000) {
                    setRakeBps(value);
                  }
                }}
                min={0}
                max={10000}
                className="w-24 rounded border border-white/10 bg-black/20 px-2 py-1 text-sm text-white"
              />
              <button
                type="button"
                onClick={handleSetRakeBps}
                disabled={isSettingRake}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-bg-dark transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSettingRake ? "Setting..." : "Set"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleWithdrawRake}
              disabled={
                isWithdrawing ||
                !poolInfo ||
                poolInfo.rakeBalance === 0n
              }
              className="w-full rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-bg-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isWithdrawing
                ? "Withdrawing..."
                : `Withdraw Rake (${poolInfo
                    ? formatTokens(poolInfo.rakeBalance)
                    : "0"})`}
            </button>
          </div>
        </div>

        {/* Admin Info */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-xs text-gray-400">
          <p>Admin: {adminAddress || "Not configured"}</p>
          <p className="mt-1">Contract: {PRIZE_POOL_ADDRESS || "Not deployed"}</p>
          <p className="mt-1">Block: #{blockHeight}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

