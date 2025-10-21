import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useWallet } from "./WalletContext";
import {
  ELASTIC_BOOM_CHANCE,
  ELASTIC_BOOM_CLAIMS,
  ELASTIC_BOOM_MULTIPLIER,
  USE_MOCK,
} from "../config";
import {
  GameClient,
  boomDetails,
  calculateProgress,
  calculateRewardPreview,
} from "../lib/gameClient";
import type { GameContextValue, PlayerStatus } from "../types/game";

const GameContext = createContext<GameContextValue | undefined>(undefined);

const createDefaultPlayer = (
  address: string,
  blockHeight: number,
): PlayerStatus => ({
  address,
  coresRented: 0,
  totalRewards: 0n,
  pendingReward: 0n,
  activeMultiplier: 1,
  boomClaimsRemaining: 0,
  lastClaimBlock: blockHeight,
  lastUpdatedAt: Date.now(),
});

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const {
    isConnected,
    selectedAccount,
    error: walletError,
    connect,
    accounts,
    selectAccount,
    extension,
  } = useWallet();

  const [player, setPlayer] = useState<PlayerStatus | null>(null);
  const [blockHeight, setBlockHeight] = useState(0);
  const [blockProgress, setBlockProgress] = useState(0);
  const [boomMessage, setBoomMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);
  const [usingMock] = useState<boolean>(USE_MOCK);

  const gameClientRef = useRef<GameClient | null>(null);
  if (!gameClientRef.current) {
    gameClientRef.current = new GameClient();
  }
  const gameClient = gameClientRef.current;

  const [connectState, setConnectState] = useState({
    isLoading: false,
    error: walletError,
    success: null as string | null,
  });

  const [rentState, setRentState] = useState({
    isLoading: false,
    error: null as string | null,
    success: null as string | null,
  });

  const [claimState, setClaimState] = useState({
    isLoading: false,
    error: null as string | null,
    success: null as string | null,
  });

  useEffect(() => {
    if (!player) {
      setBlockProgress(0);
    }
  }, [player]);

  useEffect(() => {
    if (!player) return;

    if (player.activeMultiplier > 1 && !boomMessage) {
      setBoomMessage(
        `Elastic Boom! Multiplier active for ${player.boomClaimsRemaining} claims.`,
      );
    }

    if (player.activeMultiplier === 1 && boomMessage) {
      setBoomMessage(null);
    }
  }, [player, boomMessage]);

  useEffect(() => {
    setConnectState((state) => ({ ...state, error: walletError ?? chainError }));
  }, [walletError, chainError]);

  useEffect(() => {
    if (!selectedAccount) {
      setPlayer(null);
      setIsReady(false);
      return;
    }

    setPlayer((prev) => {
      if (prev?.address === selectedAccount.address) {
        return prev;
      }
      return createDefaultPlayer(selectedAccount.address, blockHeight);
    });
  }, [selectedAccount, blockHeight]);

  useEffect(() => {
    setPlayer((current) => {
      if (!current) return current;

      const elapsed = Math.max(blockHeight - current.lastClaimBlock, 0);
      const progress =
        current.coresRented === 0 ? 0 : calculateProgress(elapsed);
      setBlockProgress(progress);

      const pendingReward = calculateRewardPreview(
        current.coresRented,
        elapsed,
        current.activeMultiplier,
      );

      if (current.pendingReward === pendingReward) {
        return {
          ...current,
          lastUpdatedAt: Date.now(),
        };
      }

      return {
        ...current,
        pendingReward,
        lastUpdatedAt: Date.now(),
      };
    });
  }, [blockHeight]);

  useEffect(() => {
    if (!isConnected) {
      setBlockHeight(0);
      setIsReady(false);
    }

    if (!usingMock || !isConnected) {
      return undefined;
    }

    setIsReady(true);
    const timer = window.setInterval(() => {
      setBlockHeight((height) => height + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isConnected, usingMock]);

  const pullStatusFromChain = useCallback(async () => {
    if (!selectedAccount || usingMock) {
      return;
    }

    try {
      const { status } = await gameClient.queryPlayer(selectedAccount);
      setPlayer(status);
      setChainError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch player status from chain.";
      setChainError(message);
    }
  }, [selectedAccount, usingMock, gameClient]);

  useEffect(() => {
    if (usingMock || !isConnected || !selectedAccount) {
      return undefined;
    }

    let cancelled = false;
    let unsubBlocksPromise: Promise<() => void> | null = null;
    let unsubEventsPromise: Promise<() => void> | null = null;

    const setup = async () => {
      try {
        setChainError(null);
        await gameClient.init();
        if (cancelled) return;

        setIsReady(true);

        const currentBlock = await gameClient.getBlockNumber();
        if (!cancelled) {
          setBlockHeight(currentBlock);
        }

        unsubBlocksPromise = gameClient.subscribeBlocks((block) => {
          if (!cancelled) {
            setBlockHeight(block);
          }
        });
        unsubBlocksPromise.catch((err) =>
          console.error("Block subscription failed", err),
        );

        unsubEventsPromise = gameClient.subscribeEvents((event) => {
          if (cancelled) return;

          if (event.name === "ElasticBoom") {
            setBoomMessage(
              `Elastic Boom! Multiplier active for ${boomDetails.claims} claims.`,
            );
            window.setTimeout(() => setBoomMessage(null), 5000);
            void pullStatusFromChain();
          }

          if (
            event.name === "RewardClaimed" ||
            event.name === "CoreRented"
          ) {
            void pullStatusFromChain();
          }
        });
        unsubEventsPromise.catch((err) =>
          console.error("Event subscription failed", err),
        );

        await pullStatusFromChain();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to initialise chain connection.";
        setChainError(message);
        setIsReady(false);
      }
    };

    setup();

    return () => {
      cancelled = true;
      unsubBlocksPromise
        ?.then((fn) => fn())
        .catch(() => undefined);
      unsubEventsPromise
        ?.then((fn) => fn())
        .catch(() => undefined);
    };
  }, [
    usingMock,
    isConnected,
    selectedAccount,
    gameClient,
    pullStatusFromChain,
  ]);

  const connectWallet = useCallback(async () => {
    setConnectState({ isLoading: true, error: null, success: null });
    try {
      await connect();
      setConnectState({
        isLoading: false,
        error: null,
        success: "Wallet connected",
      });
      setChainError(null);
    } catch (err) {
      setConnectState({
        isLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to connect to wallet",
        success: null,
      });
    }
  }, [connect]);

  const rentCore = useCallback(async () => {
    if (!selectedAccount) {
      setRentState({
        isLoading: false,
        error: "Connect wallet first",
        success: null,
      });
      return;
    }

    setRentState({ isLoading: true, error: null, success: null });

    try {
      if (usingMock) {
        setPlayer((prev) => {
          const basePlayer =
            prev && prev.address === selectedAccount.address
              ? prev
              : createDefaultPlayer(selectedAccount.address, blockHeight);

          return {
            ...basePlayer,
            coresRented: basePlayer.coresRented + 1,
            lastClaimBlock: blockHeight,
            pendingReward: 0n,
            lastUpdatedAt: Date.now(),
          };
        });
      } else {
        if (!extension) {
          throw new Error("Wallet signer not available.");
        }
        await gameClient.rentCore(selectedAccount, extension);
        await pullStatusFromChain();
      }

      setRentState({
        isLoading: false,
        error: null,
        success: "Core rented",
      });
    } catch (err) {
      setRentState({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to rent core",
        success: null,
      });
    }
  }, [
    selectedAccount,
    usingMock,
    blockHeight,
    extension,
    gameClient,
    pullStatusFromChain,
  ]);

  const claimReward = useCallback(async () => {
    if (!selectedAccount) {
      setClaimState({
        isLoading: false,
        error: "Connect wallet first",
        success: null,
      });
      return;
    }

    setClaimState({ isLoading: true, error: null, success: null });

    try {
      if (usingMock) {
        setPlayer((prev) => {
          if (!prev) {
            throw new Error("No player state found");
          }

          const pendingReward = prev.pendingReward;
          if (pendingReward === 0n) {
            throw new Error("No rewards to claim yet");
          }

          const boomTriggered = Math.random() < ELASTIC_BOOM_CHANCE;
          const claimsRemaining =
            prev.boomClaimsRemaining > 0
              ? prev.boomClaimsRemaining - 1
              : prev.boomClaimsRemaining;
          const multiplierAfterClaim =
            claimsRemaining === 0 ? 1 : prev.activeMultiplier;

          if (boomTriggered) {
            setBoomMessage(
              `Elastic Boom! Multiplier active for ${ELASTIC_BOOM_CLAIMS} claims.`,
            );
            window.setTimeout(() => setBoomMessage(null), 5000);
          }

          return {
            ...prev,
            totalRewards: prev.totalRewards + pendingReward,
            pendingReward: 0n,
            lastClaimBlock: blockHeight,
            boomClaimsRemaining: boomTriggered
              ? ELASTIC_BOOM_CLAIMS
              : Math.max(claimsRemaining, 0),
            activeMultiplier: boomTriggered
              ? ELASTIC_BOOM_MULTIPLIER
              : multiplierAfterClaim,
            lastUpdatedAt: Date.now(),
          };
        });

        setClaimState({
          isLoading: false,
          error: null,
          success: "Rewards claimed",
        });
      } else {
        if (!extension) {
          throw new Error("Wallet signer not available.");
        }

        const reward = await gameClient.claimReward(
          selectedAccount,
          extension,
        );
        await pullStatusFromChain();

        setClaimState({
          isLoading: false,
          error: null,
          success: `Rewards claimed: ${reward.toString()}`,
        });
      }
    } catch (err) {
      setClaimState({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to claim reward",
        success: null,
      });
    }
  }, [
    selectedAccount,
    usingMock,
    blockHeight,
    extension,
    gameClient,
    pullStatusFromChain,
  ]);

  const refreshStatus = useCallback(async () => {
    if (usingMock) {
      setPlayer((prev) => {
        if (!prev) return prev;
        const elapsed = Math.max(blockHeight - prev.lastClaimBlock, 0);
        return {
          ...prev,
          pendingReward: calculateRewardPreview(
            prev.coresRented,
            elapsed,
            prev.activeMultiplier,
          ),
          lastUpdatedAt: Date.now(),
        };
      });
    } else {
      await pullStatusFromChain();
    }
  }, [usingMock, blockHeight, pullStatusFromChain]);

  const value = useMemo<GameContextValue>(
    () => ({
      player,
      isReady,
      blockHeight,
      blockProgress,
      isBoomActive: Boolean(player && player.activeMultiplier > 1),
      boomMessage,
      accounts,
      selectedAccount: selectedAccount ?? null,
      selectAccount,
      connectWallet,
      rentCore,
      claimReward,
      refreshStatus,
      actions: {
        connect: connectState,
        rent: rentState,
        claim: claimState,
      },
    }),
    [
      player,
      isReady,
      blockHeight,
      blockProgress,
      boomMessage,
      accounts,
      selectedAccount,
      selectAccount,
      connectWallet,
      rentCore,
      claimReward,
      refreshStatus,
      connectState,
      rentState,
      claimState,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within GameProvider");
  }
  return context;
};
