import { useEffect, useState } from "react";

import { useClicker } from "../context/ClickerContext";
import { useWallet } from "../context/WalletContext";
import { formatTokens } from "../lib/units";
import { PrizePoolClient } from "../lib/prizePoolClient";
import { ENTRY_FEE, REVEAL_WINDOW_BLOCKS } from "../config";
import { toast } from "./Toast";
import { LoadingButton } from "./LoadingSpinner";

const JackpotPage = () => {
  const {
    poolInfo,
    blockHeight,
    enterJackpot,
    entryFee,
    tokenSymbol,
    refreshPoolInfo,
  } = useClicker();
  const { selectedAccount, extension, isConnected } = useWallet();
  const [isEntering, setIsEntering] = useState(false);
  const [userEntries, setUserEntries] = useState<any[]>([]);
  const [lastDraw, setLastDraw] = useState<any>(null);

  const prizePoolClient = new PrizePoolClient();

  useEffect(() => {
    if (isConnected && selectedAccount) {
      refreshPoolInfo();
      // Load user entries (simplified - would need event indexing in production)
      setUserEntries([]);
      // Load last draw
      if (poolInfo && poolInfo.drawId > 0) {
        prizePoolClient.getDraw(poolInfo.drawId - 1).then(setLastDraw);
      }
    }
  }, [isConnected, selectedAccount, poolInfo, refreshPoolInfo]);

  const handleEnterJackpot = async () => {
    if (!selectedAccount || !extension) {
      toast.warning("Please connect your wallet first");
      return;
    }

    setIsEntering(true);
    try {
      await enterJackpot();
      await refreshPoolInfo();
      toast.success("Successfully entered jackpot! Good luck!");
    } catch (error) {
      console.error("Failed to enter jackpot:", error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes("insufficient")
            ? "Insufficient balance. Please ensure you have enough funds."
            : error.message.includes("paused")
            ? "Contract is currently paused. Please try again later."
            : "Failed to enter jackpot. Please try again."
          : "Failed to enter jackpot. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsEntering(false);
    }
  };

  const nextDrawETA = poolInfo
    ? poolInfo.entryCount > 0
      ? `Draw ready (${poolInfo.entryCount} entries)`
      : "Waiting for entries..."
    : "Loading...";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-bg-panel p-6">
        <h2 className="mb-4 text-2xl font-bold">Jackpot Pool</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Current Pool</span>
            <span className="text-2xl font-bold">
              {poolInfo
                ? formatTokens(poolInfo.poolBalance)
                : "0"}{" "}
              {tokenSymbol}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Entries</span>
            <span className="text-lg font-semibold">
              {poolInfo?.entryCount ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Next Draw</span>
            <span className="text-lg">{nextDrawETA}</span>
          </div>
        </div>
      </div>

      {isConnected && selectedAccount && (
        <div className="rounded-2xl border border-white/10 bg-bg-panel p-6">
          <h3 className="mb-4 text-xl font-semibold">Your Entries</h3>
          {userEntries.length === 0 ? (
            <p className="text-sm text-gray-400">
              You haven't entered any draws yet. Play a session and enter the
              jackpot!
            </p>
          ) : (
            <div className="space-y-2">
              {userEntries.map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm"
                >
                  <div className="flex justify-between">
                    <span>Draw #{entry.drawId}</span>
                    <span>{formatTokens(entry.entryFee)} {tokenSymbol}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lastDraw && lastDraw.winner && (
        <div className="rounded-2xl border border-primary/50 bg-primary/10 p-6">
          <h3 className="mb-4 text-xl font-semibold text-primary">
            Last Winner
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Winner</span>
              <span className="font-mono">{lastDraw.winner}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Prize</span>
              <span className="font-semibold">
                {formatTokens(lastDraw.prizeAmount)} {tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Draw ID</span>
              <span>#{lastDraw.drawId}</span>
            </div>
          </div>
        </div>
      )}

      {isConnected && selectedAccount && (
        <LoadingButton
          type="button"
          onClick={handleEnterJackpot}
          isLoading={isEntering}
          disabled={!poolInfo}
          className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-bg-dark transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEntering
            ? "Entering..."
            : `Enter Jackpot (${formatTokens(entryFee)} ${tokenSymbol})`}
        </LoadingButton>
      )}

      {!isConnected && (
        <div className="rounded-2xl border border-white/10 bg-bg-panel p-6 text-center text-gray-400">
          Connect your wallet to view entries and enter the jackpot
        </div>
      )}
    </div>
  );
};

export default JackpotPage;

