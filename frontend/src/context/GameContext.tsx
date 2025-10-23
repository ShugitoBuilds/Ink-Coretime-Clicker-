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
  ENERGY_MAX,
  ENERGY_PER_RENT,
  ENERGY_REGEN_INTERVAL_MS,
  RENTAL_DURATION_BLOCKS,
  RENTAL_STORAGE_PREFIX,
  RENT_COST,
  TOKEN_SYMBOL,
  USE_MOCK,
} from "../config";
import {
  GameClient,
  boomDetails,
  calculateRewardPreview,
} from "../lib/gameClient";
import { maybeBigInt } from "../lib/safeBigInt";
import { formatTokens } from "../lib/units";
import type {
  CoreRental,
  GameContextValue,
  PlayerStatus,
} from "../types/game";

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

const MAX_BATCH_SIZE = 10;
const MAX_QUEUE_SIZE = 30;
const BATCH_DEBOUNCE_MS = 600;
const AUTO_RENT_INTERVAL_MS = 400;

type QueueSource = "manual" | "auto";

interface QueuedRental {
  id: string;
  createdAt: number;
  source: QueueSource;
}

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
  const [boomMessage, setBoomMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);
  const [usingMock] = useState<boolean>(USE_MOCK);
  const [rentals, setRentals] = useState<CoreRental[]>([]);
  const [energy, setEnergy] = useState<number>(ENERGY_MAX);
  const [nextEnergyAt, setNextEnergyAt] = useState<number | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const energyTimerRef = useRef<number | null>(null);
  const latestBlockRef = useRef<number>(0);
  const rentQueueRef = useRef<QueuedRental[]>([]);
  const [queuedRentals, setQueuedRentals] = useState(0);
  const inFlightCostRef = useRef<bigint>(0n);
  const batchTimerRef = useRef<number | null>(null);
  const isSendingBatchRef = useRef(false);
  const [isBatchInFlight, setIsBatchInFlight] = useState(false);
  const [autoRentConfig, setAutoRentConfig] = useState({
    isActive: false,
    remaining: 0,
  });

  const spendEnergy = useCallback(() => {
    setEnergy((prev) => {
      const updated = Math.max(0, prev - ENERGY_PER_RENT);
      if (updated < ENERGY_MAX) {
        setNextEnergyAt(Date.now() + ENERGY_REGEN_INTERVAL_MS);
      } else {
        setNextEnergyAt(null);
      }
      return updated;
    });
  }, []);

  const refundEnergy = useCallback(() => {
    setEnergy((prev) => {
      const updated = Math.min(ENERGY_MAX, prev + ENERGY_PER_RENT);
      if (updated >= ENERGY_MAX) {
        setNextEnergyAt(null);
      }
      return updated;
    });
  }, []);

  const rentalStorageKey = useMemo(() => {
    if (!selectedAccount) return null;
    return `${RENTAL_STORAGE_PREFIX}:${selectedAccount.address}`;
  }, [selectedAccount]);

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

  const [depositState, setDepositState] = useState({
    isLoading: false,
    error: null as string | null,
    success: null as string | null,
  });

  const [withdrawState, setWithdrawState] = useState({
    isLoading: false,
    error: null as string | null,
    success: null as string | null,
  });

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
    if (typeof window === "undefined") return;
    if (!rentalStorageKey) {
      setRentals([]);
      setEnergy(ENERGY_MAX);
      setNextEnergyAt(null);
      setBalance(0n);
      return;
    }

    try {
      const raw = window.localStorage.getItem(rentalStorageKey);
      if (!raw) {
        setRentals([]);
        setEnergy(ENERGY_MAX);
        setNextEnergyAt(null);
        return;
      }

      const parsed = JSON.parse(raw) as CoreRental[];
      setRentals(
        parsed.map((rental) => ({
          ...rental,
          status: rental.status ?? "active",
        })),
      );
    } catch (error) {
      console.warn("Failed to parse rental queue", error);
      setRentals([]);
    }
    setEnergy(ENERGY_MAX);
    setNextEnergyAt(null);
  }, [rentalStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!rentalStorageKey) return;
    window.localStorage.setItem(
      rentalStorageKey,
      JSON.stringify(rentals),
    );
  }, [rentals, rentalStorageKey]);

  useEffect(() => {
    if (energy >= ENERGY_MAX) {
      if (energyTimerRef.current !== null) {
        window.clearInterval(energyTimerRef.current);
        energyTimerRef.current = null;
      }
      setNextEnergyAt(null);
      return;
    }

    if (energyTimerRef.current !== null) {
      return;
    }

    setNextEnergyAt((prev) => prev ?? Date.now() + ENERGY_REGEN_INTERVAL_MS);

    const timer = window.setInterval(() => {
      setEnergy((prev) => {
        const nextEnergy = Math.min(ENERGY_MAX, prev + ENERGY_PER_RENT);
        if (nextEnergy >= ENERGY_MAX) {
          if (energyTimerRef.current !== null) {
            window.clearInterval(energyTimerRef.current);
            energyTimerRef.current = null;
          }
          setNextEnergyAt(null);
        } else {
          setNextEnergyAt(Date.now() + ENERGY_REGEN_INTERVAL_MS);
        }
        return nextEnergy;
      });
    }, ENERGY_REGEN_INTERVAL_MS);

    energyTimerRef.current = timer;

    return () => {
      if (energyTimerRef.current !== null) {
        window.clearInterval(energyTimerRef.current);
        energyTimerRef.current = null;
      }
    };
  }, [energy]);

  useEffect(() => {
    latestBlockRef.current = blockHeight;
  }, [blockHeight]);

  useEffect(() => {
    if (!selectedAccount) {
      setPlayer(null);
      setIsReady(false);
      setBalance(0n);
      rentQueueRef.current = [];
      setQueuedRentals(0);
      inFlightCostRef.current = 0n;
      setAutoRentConfig({ isActive: false, remaining: 0 });
      return;
    }

    setPlayer((prev) => {
      if (prev?.address === selectedAccount.address) {
        return prev;
      }
      return createDefaultPlayer(selectedAccount.address, blockHeight);
    });
    setAutoRentConfig({ isActive: false, remaining: 0 });
  }, [selectedAccount, blockHeight]);

  useEffect(() => {
    setPlayer((current) => {
      if (!current) return current;

      const elapsed = Math.max(blockHeight - current.lastClaimBlock, 0);
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

    setRentals((prev) =>
      prev.map((rental) => {
        if (
          rental.status === "active" &&
          rental.readyAtBlock !== null &&
          blockHeight >= rental.readyAtBlock
        ) {
          return {
            ...rental,
            status: "matured",
          };
        }
        return rental;
      }),
    );
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
    if (!selectedAccount) {
      return;
    }

    if (usingMock) {
      setChainError(null);
      return;
    }

    try {
      const [{ status }, latestBalance] = await Promise.all([
        gameClient.queryPlayer(selectedAccount),
        gameClient.getBalance(selectedAccount),
      ]);
      setPlayer(status);
      setBalance(latestBalance);
      setChainError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch player status from chain.";
      setChainError(message);
    }
  }, [selectedAccount, usingMock, gameClient]);

  const flushQueuedRentals = useCallback(async () => {
    if (isSendingBatchRef.current || rentQueueRef.current.length === 0) {
      return;
    }

    if (!selectedAccount) {
      setRentState({
        isLoading: false,
        error: "Connect wallet first",
        success: null,
      });
      rentQueueRef.current = [];
      setQueuedRentals(0);
      return;
    }

    const batchSize = Math.min(MAX_BATCH_SIZE, rentQueueRef.current.length);
    const batch = rentQueueRef.current.splice(0, batchSize);
    setQueuedRentals(rentQueueRef.current.length);

    if (batchTimerRef.current !== null) {
      window.clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    isSendingBatchRef.current = true;
    setIsBatchInFlight(true);
    setRentState({
      isLoading: true,
      error: null,
      success: null,
    });

    const ids = batch.map((item) => item.id);
    const idSet = new Set(ids);
    const totalCost = RENT_COST * BigInt(batch.length);
    inFlightCostRef.current = totalCost;

    const markAsFailed = (message: string) => {
      setRentals((prev) => prev.filter((rental) => !idSet.has(rental.id)));
      for (let i = 0; i < batch.length; i += 1) {
        refundEnergy();
      }
      setRentState({
        isLoading: false,
        error: message,
        success: null,
      });
    };

    try {
      let startBlock = blockHeight;

      if (usingMock) {
        setPlayer((prev) => {
          const current =
            prev && prev.address === selectedAccount.address
              ? prev
              : createDefaultPlayer(selectedAccount.address, blockHeight);

          return {
            ...current,
            coresRented: current.coresRented + batch.length,
            lastClaimBlock:
              current.lastClaimBlock === 0
                ? blockHeight
                : current.lastClaimBlock,
            pendingReward: 0n,
            lastUpdatedAt: Date.now(),
          };
        });

        setBalance((prev) => (prev >= totalCost ? prev - totalCost : 0n));
      } else {
        if (!extension) {
          throw new Error("Wallet signer not available.");
        }

        await gameClient.rentMany(selectedAccount, extension, batch.length);
        startBlock = await gameClient.getBlockNumber();
        setBalance((prev) => (prev >= totalCost ? prev - totalCost : 0n));
        await pullStatusFromChain();
      }

      const readyAtBlock = startBlock + RENTAL_DURATION_BLOCKS;
      setRentals((prev) =>
        prev.map((rental) =>
          idSet.has(rental.id)
            ? {
                ...rental,
                status: "active",
                startBlock,
                readyAtBlock,
              }
            : rental,
        ),
      );

      setRentState({
        isLoading: rentQueueRef.current.length > 0,
        error: null,
        success: `Rented ${batch.length} core${batch.length > 1 ? "s" : ""}`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to rent cores";
      markAsFailed(message);
      if (batch.some((item) => item.source === "auto")) {
        setAutoRentConfig({ isActive: false, remaining: 0 });
      }
    } finally {
      inFlightCostRef.current = 0n;
      isSendingBatchRef.current = false;
      setIsBatchInFlight(false);
    }

    if (rentQueueRef.current.length > 0) {
      if (batchTimerRef.current !== null) {
        window.clearTimeout(batchTimerRef.current);
      }
      batchTimerRef.current = window.setTimeout(() => {
        batchTimerRef.current = null;
        flushQueuedRentals().catch((err) =>
          console.error("Failed to flush rent queue", err),
        );
      }, BATCH_DEBOUNCE_MS);
    } else {
      setRentState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [
    blockHeight,
    extension,
    gameClient,
    pullStatusFromChain,
    refundEnergy,
    selectedAccount,
    usingMock,
  ]);

  const queueRental = useCallback(
    async (source: QueueSource = "manual") => {
      if (!selectedAccount) {
        if (source === "manual") {
          setRentState({
            isLoading: false,
            error: "Connect wallet first",
            success: null,
          });
        }
        return;
      }

      if (!usingMock && !extension) {
        setRentState({
          isLoading: false,
          error: "Wallet signer not available.",
          success: null,
        });
        if (source === "auto") {
          setAutoRentConfig({ isActive: false, remaining: 0 });
        }
        return;
      }

      if (rentQueueRef.current.length >= MAX_QUEUE_SIZE) {
        if (source === "manual") {
          setRentState({
            isLoading: false,
            error: "Queue full. Wait for rentals to process.",
            success: null,
          });
        }
        if (source === "auto") {
          setAutoRentConfig({ isActive: false, remaining: 0 });
        }
        return;
      }

      const reservedCost =
        RENT_COST * BigInt(rentQueueRef.current.length) + inFlightCostRef.current;
      if (balance - reservedCost < RENT_COST) {
        if (source === "manual") {
          setRentState({
            isLoading: false,
            error: "Prepaid balance too low. Deposit more to rent cores.",
            success: null,
          });
        }
        if (source === "auto") {
          setAutoRentConfig({ isActive: false, remaining: 0 });
        }
        return;
      }

      if (energy < ENERGY_PER_RENT) {
        if (source === "manual") {
          setRentState({
            isLoading: false,
            error: "Not enough energy. Wait for recharge.",
            success: null,
          });
        }
        return;
      }

      const rentalId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `core-${Date.now()}-${Math.random()}`;
      const createdAt = Date.now();

      setRentals((prev) => [
        ...prev,
        {
          id: rentalId,
          status: "pending",
          createdAt,
          startBlock: null,
          readyAtBlock: null,
        },
      ]);
      spendEnergy();

      rentQueueRef.current.push({ id: rentalId, createdAt, source });
      setQueuedRentals(rentQueueRef.current.length);

      setRentState((prev) => ({
        isLoading: true,
        error: null,
        success: source === "manual" ? null : prev.success,
      }));

      if (source === "auto") {
        setAutoRentConfig((prev) => {
          if (!prev.isActive) {
            return prev;
          }
          const remaining = Math.max(prev.remaining - 1, 0);
          return {
            isActive: remaining > 0,
            remaining,
          };
        });
      }

      if (rentQueueRef.current.length >= MAX_BATCH_SIZE) {
        if (batchTimerRef.current !== null) {
          window.clearTimeout(batchTimerRef.current);
          batchTimerRef.current = null;
        }
        flushQueuedRentals().catch((err) =>
          console.error("Failed to process rent batch", err),
        );
      } else {
        if (batchTimerRef.current !== null) {
          window.clearTimeout(batchTimerRef.current);
        }
        batchTimerRef.current = window.setTimeout(() => {
          batchTimerRef.current = null;
          flushQueuedRentals().catch((err) =>
            console.error("Failed to process rent batch", err),
          );
        }, BATCH_DEBOUNCE_MS);
      }
    },
    [
      balance,
      energy,
      extension,
      flushQueuedRentals,
      selectedAccount,
      spendEnergy,
    usingMock,
  ],
  );

  const startAutoRent = useCallback(
    (count: number) => {
      const target = Math.max(0, Math.floor(count));
      if (target === 0) {
        return;
      }

      if (!selectedAccount) {
        setRentState({
          isLoading: false,
          error: "Connect wallet first",
          success: null,
        });
        return;
      }

      setAutoRentConfig({
        isActive: true,
        remaining: target,
      });

      queueRental("auto").catch((err) =>
        console.error("Failed to queue auto rent", err),
      );
    },
    [queueRental, selectedAccount],
  );

  const stopAutoRent = useCallback(() => {
    setAutoRentConfig({ isActive: false, remaining: 0 });
  }, []);

  useEffect(() => {
    if (!autoRentConfig.isActive) {
      return;
    }

    if (autoRentConfig.remaining <= 0) {
      setAutoRentConfig({ isActive: false, remaining: 0 });
      return;
    }

    if (!selectedAccount) {
      setAutoRentConfig({ isActive: false, remaining: 0 });
      return;
    }

    if (queuedRentals >= MAX_QUEUE_SIZE) {
      setAutoRentConfig({ isActive: false, remaining: 0 });
      return;
    }

    const reservedCost =
      RENT_COST * BigInt(queuedRentals) + inFlightCostRef.current;
    if (balance - reservedCost < RENT_COST) {
      setAutoRentConfig({ isActive: false, remaining: 0 });
      return;
    }

    if (energy < ENERGY_PER_RENT) {
      return;
    }

    const timer = window.setTimeout(() => {
      queueRental("auto").catch((err) =>
        console.error("Auto rent scheduling failed", err),
      );
    }, AUTO_RENT_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [
    autoRentConfig,
    balance,
    energy,
    queueRental,
    selectedAccount,
    queuedRentals,
  ]);

  useEffect(() => {
    return () => {
      if (batchTimerRef.current !== null) {
        window.clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
    };
  }, []);

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

          const extractAddress = (value: unknown) => {
            if (!value) return "";
            if (typeof value === "string") return value;
            if (
              typeof value === "object" &&
              value !== null &&
              "toString" in value
            ) {
              try {
                return (value as { toString: () => string }).toString();
              } catch (error) {
                console.warn("Failed to convert address", error, value);
              }
            }
            return "";
          };

          if (event.name === "CoreRented") {
            const accountAddress = extractAddress(event.args.player);
            if (
              selectedAccount &&
              accountAddress === selectedAccount.address
            ) {
              const startBlock = Number(
                event.args.block_number ??
                  event.args.blockNumber ??
                  event.args.block ??
                  latestBlockRef.current,
              );

              setRentals((prev) => {
                const next = [...prev];
                const targetIndex = next.findIndex(
                  (rental) => rental.status === "pending",
                );

                if (targetIndex !== -1) {
                  next[targetIndex] = {
                    ...next[targetIndex],
                    status: "active",
                    startBlock,
                    readyAtBlock: startBlock + RENTAL_DURATION_BLOCKS,
                  };
                } else {
                  next.push({
                    id: `event-${startBlock}-${Date.now()}`,
                    status: "active",
                    createdAt: Date.now(),
                    startBlock,
                    readyAtBlock: startBlock + RENTAL_DURATION_BLOCKS,
                  });
                }
                return next;
              });

              const balanceRemaining = maybeBigInt(
                event.args.balance_remaining ??
                  event.args.balanceRemaining ??
                  event.args.remainingBalance,
              );

              if (balanceRemaining !== null) {
                setBalance(balanceRemaining);
              } else {
                setBalance((prev) => (prev > RENT_COST ? prev - RENT_COST : 0n));
              }
            }
          }

          if (event.name === "RewardClaimed") {
            const accountAddress = extractAddress(event.args.player);
            if (
              selectedAccount &&
              accountAddress === selectedAccount.address
            ) {
              setRentals((prev) =>
                prev.filter((rental) => rental.status !== "matured"),
              );
            }
          }

          if (event.name === "BalanceDeposited") {
            const accountAddress = extractAddress(event.args.player);
            if (
              selectedAccount &&
              accountAddress === selectedAccount.address
            ) {
              const newBalance =
                maybeBigInt(event.args.new_balance ?? event.args.newBalance);
              if (newBalance !== null) {
                setBalance(newBalance);
              }
            }
          }

          if (event.name === "BalanceWithdrawn") {
            const accountAddress = extractAddress(event.args.player);
            if (
              selectedAccount &&
              accountAddress === selectedAccount.address
            ) {
              const newBalance =
                maybeBigInt(event.args.new_balance ?? event.args.newBalance);
              if (newBalance !== null) {
                setBalance(newBalance);
              }
            }
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

  const rentCore = useCallback(async () => queueRental("manual"), [queueRental]);

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

        setRentals((prev) =>
          prev.filter((rental) => rental.status !== "matured"),
        );

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
        setRentals((prev) =>
          prev.filter((rental) => rental.status !== "matured"),
        );

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

  const deposit = useCallback(
    async (amount: bigint) => {
      if (!selectedAccount) {
        setDepositState({
          isLoading: false,
          error: "Connect wallet first",
          success: null,
        });
        return;
      }

      if (amount <= 0n) {
        setDepositState({
          isLoading: false,
          error: "Enter a positive amount",
          success: null,
        });
        return;
      }

      setDepositState({ isLoading: true, error: null, success: null });

      try {
        if (usingMock) {
          setBalance((prev) => prev + amount);
        } else {
          if (!extension) {
            throw new Error("Wallet signer not available.");
          }
          await gameClient.deposit(selectedAccount, extension, amount);
          setBalance((prev) => prev + amount);
        }

        setDepositState({
          isLoading: false,
          error: null,
          success: `Deposited ${formatTokens(amount)}`,
        });
      } catch (err) {
        setDepositState({
          isLoading: false,
          error:
            err instanceof Error ? err.message : "Failed to deposit balance",
          success: null,
        });
      }
    },
    [selectedAccount, usingMock, extension, gameClient],
  );

  const withdraw = useCallback(
    async (amount: bigint) => {
      if (!selectedAccount) {
        setWithdrawState({
          isLoading: false,
          error: "Connect wallet first",
          success: null,
        });
        return;
      }

      if (amount <= 0n) {
        setWithdrawState({
          isLoading: false,
          error: "Enter a positive amount",
          success: null,
        });
        return;
      }

      if (!usingMock && balance < amount) {
        setWithdrawState({
          isLoading: false,
          error: "Amount exceeds prepaid balance",
          success: null,
        });
        return;
      }

      setWithdrawState({ isLoading: true, error: null, success: null });

      try {
        if (usingMock) {
          setBalance((prev) => (prev > amount ? prev - amount : 0n));
        } else {
          if (!extension) {
            throw new Error("Wallet signer not available.");
          }
          await gameClient.withdraw(selectedAccount, extension, amount);
          setBalance((prev) => (prev > amount ? prev - amount : 0n));
        }

        setWithdrawState({
          isLoading: false,
          error: null,
          success: `Withdrawn ${formatTokens(amount)}`,
        });
      } catch (err) {
        setWithdrawState({
          isLoading: false,
          error:
            err instanceof Error ? err.message : "Failed to withdraw balance",
          success: null,
        });
      }
    },
    [selectedAccount, usingMock, balance, extension, gameClient],
  );

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
      rentals,
      balance,
      rentCost: RENT_COST,
      tokenSymbol: TOKEN_SYMBOL,
      energy,
      maxEnergy: ENERGY_MAX,
      nextEnergyAt,
      queuedRentals,
      maxBatchSize: MAX_BATCH_SIZE,
      maxQueueSize: MAX_QUEUE_SIZE,
      isBatchInFlight,
      autoRent: autoRentConfig,
      startAutoRent,
      stopAutoRent,
      isBoomActive: Boolean(player && player.activeMultiplier > 1),
      boomMessage,
      accounts,
      selectedAccount: selectedAccount ?? null,
      selectAccount,
      connectWallet,
      rentCore,
      claimReward,
      deposit,
      withdraw,
      refreshStatus,
      actions: {
        connect: connectState,
        rent: rentState,
        claim: claimState,
        deposit: depositState,
        withdraw: withdrawState,
      },
    }),
    [
      player,
      isReady,
      blockHeight,
      rentals,
      balance,
      energy,
      nextEnergyAt,
      boomMessage,
      accounts,
      selectedAccount,
      selectAccount,
      connectWallet,
      queuedRentals,
      isBatchInFlight,
      autoRentConfig,
      startAutoRent,
      stopAutoRent,
      rentCore,
      claimReward,
      deposit,
      withdraw,
      refreshStatus,
      connectState,
      rentState,
      claimState,
      depositState,
      withdrawState,
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
