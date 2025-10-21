import { useEffect, useMemo, useState } from "react";

import type { PlayerStatus } from "../types/game";

export interface LeaderboardEntry {
  address: string;
  totalRewards: bigint;
  label: string;
}

const STORAGE_KEY = "coretime-clicker-leaderboard";

const defaultLeaders: LeaderboardEntry[] = [
  {
    address: "0x-polypulse",
    totalRewards: BigInt(120000),
    label: "Validator Joe",
  },
  {
    address: "0x-hyperlane",
    totalRewards: BigInt(83000),
    label: "Collator Kat",
  },
  {
    address: "0x-cosmic",
    totalRewards: BigInt(59000),
    label: "Nomad Lea",
  },
];

const loadFromStorage = (): LeaderboardEntry[] => {
  if (typeof window === "undefined") return defaultLeaders;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultLeaders;
    }
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return parsed.map((entry) => ({
      ...entry,
      totalRewards: BigInt(entry.totalRewards),
    }));
  } catch (_error) {
    return defaultLeaders;
  }
};

export const useLeaderboard = (player: PlayerStatus | null) => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>(() =>
    loadFromStorage(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const serializable = leaders.map((entry) => ({
      ...entry,
      totalRewards: entry.totalRewards.toString(),
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }, [leaders]);

  useEffect(() => {
    if (!player) return;

    setLeaders((prev) => {
      const existingIndex = prev.findIndex(
        (entry) => entry.address === player.address,
      );

      if (
        existingIndex >= 0 &&
        prev[existingIndex].totalRewards === player.totalRewards
      ) {
        return prev;
      }

      const updatedEntry: LeaderboardEntry = {
        address: player.address,
        totalRewards: player.totalRewards,
        label: player.address,
      };

      const next = [...prev];
      if (existingIndex >= 0) {
        next[existingIndex] = updatedEntry;
      } else {
        next.push(updatedEntry);
      }

      return next;
    });
  }, [player]);

  const sortedLeaders = useMemo(() => {
    const sorted = [...leaders].sort((a, b) => {
      if (a.totalRewards === b.totalRewards) return 0;
      return a.totalRewards > b.totalRewards ? -1 : 1;
    });
    return sorted.slice(0, 10);
  }, [leaders]);

  return sortedLeaders;
};

export const formatAddress = (address: string) => {
  if (address.startsWith("0x-")) return address;
  return `${address.slice(0, 6)}…${address.slice(address.length - 4)}`;
};
