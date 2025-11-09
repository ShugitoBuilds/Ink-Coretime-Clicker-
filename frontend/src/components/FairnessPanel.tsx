import { useEffect, useState } from "react";

import { useWallet } from "../context/WalletContext";
import { REVEAL_WINDOW_BLOCKS } from "../config";

interface Commitment {
  commitmentId: number;
  commitHash: string;
  revealBlock: number;
  committedAtBlock: number;
  revealed: boolean;
  randomNumber: number | null;
}

const FairnessPanel = () => {
  const { selectedAccount, isConnected } = useWallet();
  const [commitments, setCommitments] = useState<Commitment[]>([]);

  useEffect(() => {
    // In production, this would fetch commitments from the RNG contract
    // For MVP, we'll show placeholder data
    if (isConnected && selectedAccount) {
      setCommitments([]);
    }
  }, [isConnected, selectedAccount]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-bg-panel p-6 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold">Provably Fair Randomness</h2>
        <p className="mb-6 text-sm text-gray-400">
          All draws use commit-reveal randomness. You can verify the fairness
          of each draw by checking the commitment and reveal values below.
        </p>

        {!isConnected && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-center text-sm text-gray-400">
            Connect your wallet to view your commitments
          </div>
        )}

        {isConnected && commitments.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-center text-sm text-gray-400">
            No commitments found. Commitments are created when you enter the
            jackpot.
          </div>
        )}

        {commitments.length > 0 && (
          <div className="space-y-4">
            {commitments.map((commitment) => (
              <div
                key={commitment.commitmentId}
                className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-2"
              >
                <div className="text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Commitment ID</span>
                    <span className="font-mono">#{commitment.commitmentId}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Commit Hash</span>
                    <span className="font-mono text-xs">
                      {commitment.commitHash.slice(0, 16)}...
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Committed At Block</span>
                    <span className="font-mono">#{commitment.committedAtBlock}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Reveal Block</span>
                    <span className="font-mono">#{commitment.revealBlock}</span>
                  </div>
                  {commitment.revealed && commitment.randomNumber && (
                    <>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Status</span>
                        <span className="text-green-400">Revealed</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Random Number</span>
                        <span className="font-mono">{commitment.randomNumber}</span>
                      </div>
                    </>
                  )}
                  {!commitment.revealed && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className="text-yellow-400">
                        Waiting for reveal (min {REVEAL_WINDOW_BLOCKS} blocks)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-bg-panel p-6 shadow-lg">
        <h3 className="mb-4 text-xl font-semibold">How to Verify</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <div>
            <p className="mb-2 font-semibold">1. Commit Phase</p>
            <p className="text-gray-400">
              When you enter the jackpot, a commitment hash is created from
              your secret. This hash is stored on-chain at block{" "}
              <code className="text-primary">committed_at_block</code>.
            </p>
          </div>
          <div>
            <p className="mb-2 font-semibold">2. Reveal Phase</p>
            <p className="text-gray-400">
              After at least {REVEAL_WINDOW_BLOCKS} blocks have passed, the
              secret is revealed. The contract verifies that{" "}
              <code className="text-primary">hash(secret) == commit_hash</code>.
            </p>
          </div>
          <div>
            <p className="mb-2 font-semibold">3. Random Number Generation</p>
            <p className="text-gray-400">
              The random number is generated from the revealed secret combined
              with block data. This ensures the randomness cannot be predicted
              before the reveal block.
            </p>
          </div>
          <div>
            <p className="mb-2 font-semibold">4. Verification</p>
            <p className="text-gray-400">
              You can verify any draw by checking that the commitment hash
              matches the revealed secret, and that the random number was
              generated correctly.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-primary/50 bg-primary/10 p-4 text-xs text-primary">
          <p className="font-semibold">Note:</p>
          <p className="mt-1">
            This MVP uses commit-reveal randomness. For production, we plan to
            upgrade to attested VRF (Verifiable Random Function) for enhanced
            security and fairness.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FairnessPanel;

