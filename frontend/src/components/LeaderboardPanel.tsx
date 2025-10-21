import { useGame } from "../context/GameContext";
import { formatAddress, useLeaderboard } from "../hooks/useLeaderboard";

const LeaderboardPanel = () => {
  const { player } = useGame();
  const leaders = useLeaderboard(player);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-bg-panel p-6 shadow-lg shadow-primary/10">
      <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
      <h2 className="text-xl font-semibold text-primary">Leaderboard</h2>
      <p className="mt-2 text-sm text-gray-300">
        Rankings update locally as you play. Replace with on-chain queries once a
        leaderboard contract endpoint is available.
      </p>

      <ol className="mt-4 space-y-2 text-sm">
        {leaders.map((leader, index) => {
          const isSelf = player && leader.address === player.address;
          const rank = index + 1;
          return (
            <li
              key={`${leader.address}-${leader.label}`}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 transition ${
                isSelf
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-white/5 bg-black/25 text-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  #{rank.toString().padStart(2, "0")}
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold">{leader.label}</span>
                  <span className="text-xs text-gray-400">
                    {leader.address.startsWith("0x-")
                      ? leader.address
                      : formatAddress(leader.address)}
                  </span>
                </div>
              </div>
              <span className="text-sm font-semibold text-white font-mono">
                {leader.totalRewards.toString()}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default LeaderboardPanel;
