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
  ENTRY_FEE,
  TOKEN_SYMBOL,
  USE_MOCK,
} from "../config";
import { PrizePoolClient, type PoolInfo } from "../lib/prizePoolClient";
import { formatTokens } from "../lib/units";

export interface ClickerState {
  clicks: number;
  sessionStartTime: number | null;
  sessionEndTime: number | null;
  hasEnteredJackpot: boolean;
}

export interface ClickerContextValue {
  clicks: number;
  sessionStartTime: number | null;
  sessionEndTime: number | null;
  hasEnteredJackpot: boolean;
  poolInfo: PoolInfo | null;
  blockHeight: number;
  isReady: boolean;
  click: () => void;
  startSession: () => void;
  endSession: () => void;
  enterJackpot: () => Promise<void>;
  refreshPoolInfo: () => Promise<void>;
  entryFee: bigint;
  tokenSymbol: string;
}

const ClickerContext = createContext<ClickerContextValue | undefined>(undefined);

export const ClickerProvider = ({ children }: { children: ReactNode }) => {
  const {
    isConnected,
    selectedAccount,
    extension,
  } = useWallet();

  const [clicks, setClicks] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<number | null>(null);
  const [hasEnteredJackpot, setHasEnteredJackpot] = useState(false);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [blockHeight, setBlockHeight] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const prizePoolClientRef = useRef<PrizePoolClient | null>(null);
  if (!prizePoolClientRef.current) {
    prizePoolClientRef.current = new PrizePoolClient();
  }
  const prizePoolClient = prizePoolClientRef.current;

  const click = useCallback(() => {
    if (sessionStartTime && !sessionEndTime) {
      setClicks((prev) => prev + 1);
    }
  }, [sessionStartTime, sessionEndTime]);

  const startSession = useCallback(() => {
    setSessionStartTime(Date.now());
    setSessionEndTime(null);
    setClicks(0);
    setHasEnteredJackpot(false);
  }, []);

  const endSession = useCallback(() => {
    if (sessionStartTime) {
      setSessionEndTime(Date.now());
    }
  }, [sessionStartTime]);

  const enterJackpot = useCallback(async () => {
    if (!selectedAccount || !extension) {
      throw new Error("Wallet not connected");
    }

    if (isEntering) {
      return;
    }

    setIsEntering(true);
    try {
      await prizePoolClient.enterJackpot(selectedAccount, extension, ENTRY_FEE);
      setHasEnteredJackpot(true);
      await refreshPoolInfo();
    } finally {
      setIsEntering(false);
    }
  }, [selectedAccount, extension, prizePoolClient]);

  const refreshPoolInfo = useCallback(async () => {
    if (!selectedAccount || USE_MOCK) {
      return;
    }

    try {
      const info = await prizePoolClient.getPoolInfo();
      setPoolInfo(info);
    } catch (error) {
      console.error("Failed to fetch pool info:", error);
    }
  }, [selectedAccount, prizePoolClient]);

  useEffect(() => {
    if (!isConnected || !selectedAccount) {
      setIsReady(false);
      setPoolInfo(null);
      setBlockHeight(0);
      return;
    }

    if (USE_MOCK) {
      setIsReady(true);
      const timer = setInterval(() => {
        setBlockHeight((h) => h + 1);
      }, 1000);
      return () => clearInterval(timer);
    }

    let cancelled = false;
    let unsubBlocksPromise: Promise<() => void> | null = null;

    const setup = async () => {
      try {
        await prizePoolClient.init();
        if (cancelled) return;

        setIsReady(true);
        const currentBlock = await prizePoolClient.getBlockNumber();
        if (!cancelled) {
          setBlockHeight(currentBlock);
        }

        unsubBlocksPromise = prizePoolClient.subscribeBlocks((block) => {
          if (!cancelled) {
            setBlockHeight(block);
          }
        });

        await refreshPoolInfo();
      } catch (error) {
        console.error("Failed to initialize prize pool client:", error);
        setIsReady(false);
      }
    };

    setup();

    return () => {
      cancelled = true;
      unsubBlocksPromise?.then((fn) => fn()).catch(() => undefined);
    };
  }, [isConnected, selectedAccount, prizePoolClient, refreshPoolInfo]);

  const value = useMemo<ClickerContextValue>(
    () => ({
      clicks,
      sessionStartTime,
      sessionEndTime,
      hasEnteredJackpot,
      poolInfo,
      blockHeight,
      isReady,
      click,
      startSession,
      endSession,
      enterJackpot,
      refreshPoolInfo,
      entryFee: ENTRY_FEE,
      tokenSymbol: TOKEN_SYMBOL,
    }),
    [
      clicks,
      sessionStartTime,
      sessionEndTime,
      hasEnteredJackpot,
      poolInfo,
      blockHeight,
      isReady,
      click,
      startSession,
      endSession,
      enterJackpot,
      refreshPoolInfo,
    ],
  );

  return (
    <ClickerContext.Provider value={value}>{children}</ClickerContext.Provider>
  );
};

export const useClicker = () => {
  const context = useContext(ClickerContext);
  if (!context) {
    throw new Error("useClicker must be used within ClickerProvider");
  }
  return context;
};

