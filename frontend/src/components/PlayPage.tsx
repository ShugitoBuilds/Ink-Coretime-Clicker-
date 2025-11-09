import { useEffect, useState } from "react";

import { useClicker } from "../context/ClickerContext";
import { formatTokens } from "../lib/units";
import { toast } from "./Toast";
import { LoadingButton } from "./LoadingSpinner";

type ButtonState = "idle" | "press" | "hold" | "release";

const PlayPage = () => {
  const {
    clicks,
    sessionStartTime,
    sessionEndTime,
    hasEnteredJackpot,
    click,
    startSession,
    endSession,
    enterJackpot,
    entryFee,
    tokenSymbol,
  } = useClicker();

  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [isEntering, setIsEntering] = useState(false);

  const sessionDuration = sessionStartTime && sessionEndTime
    ? Math.floor((sessionEndTime - sessionStartTime) / 1000)
    : sessionStartTime
    ? Math.floor((Date.now() - sessionStartTime) / 1000)
    : 0;

  const handleButtonDown = () => {
    if (!sessionStartTime || sessionEndTime) {
      return;
    }
    setButtonState("press");
    click();
  };

  const handleButtonUp = () => {
    if (buttonState === "press" || buttonState === "hold") {
      setButtonState("release");
      setTimeout(() => {
        if (sessionStartTime && !sessionEndTime) {
          setButtonState("idle");
        }
      }, 100);
    }
  };

  const handleButtonHold = () => {
    if (buttonState === "press" && sessionStartTime && !sessionEndTime) {
      setButtonState("hold");
    }
  };

  useEffect(() => {
    if (sessionStartTime && !sessionEndTime && buttonState === "press") {
      const timer = setTimeout(() => {
        handleButtonHold();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [buttonState, sessionStartTime, sessionEndTime]);

  const handleEnterJackpot = async () => {
    setIsEntering(true);
    try {
      await enterJackpot();
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

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full rounded-2xl border border-white/10 bg-bg-panel p-8 text-center">
        <h1 className="mb-4 text-3xl font-bold">CoreTime Clicker</h1>
        <p className="text-gray-400">Click to accumulate points!</p>
      </div>

      {!sessionStartTime && (
        <button
          type="button"
          onClick={startSession}
          className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-bg-dark transition hover:brightness-110"
        >
          Start Session
        </button>
      )}

      {sessionStartTime && (
        <>
          <div className="w-full rounded-2xl border border-white/10 bg-bg-panel p-6 shadow-lg">
            <div className="mb-4 text-center">
              <div className="text-4xl font-bold text-primary transition-all duration-200 md:text-5xl">
                {clicks}
              </div>
              <div className="text-sm text-gray-400">Clicks</div>
            </div>
            <div className="text-center text-sm text-gray-400">
              Duration: <span className="font-semibold text-gray-300">{sessionDuration}s</span>
            </div>
          </div>

          {!sessionEndTime && (
            <>
              <button
                type="button"
                onMouseDown={handleButtonDown}
                onMouseUp={handleButtonUp}
                onMouseLeave={handleButtonUp}
                onTouchStart={handleButtonDown}
                onTouchEnd={handleButtonUp}
                className={`relative h-48 w-48 rounded-full text-3xl font-bold transition-all duration-150 ease-out md:h-64 md:w-64 md:text-4xl ${
                  buttonState === "idle"
                    ? "bg-primary text-bg-dark shadow-lg shadow-primary/50 hover:scale-105 active:scale-95"
                    : buttonState === "press"
                    ? "bg-primary/90 scale-95 shadow-md"
                    : buttonState === "hold"
                    ? "bg-primary/70 scale-90 shadow-sm"
                    : "bg-primary/60 scale-100"
                }`}
                style={{
                  backgroundImage:
                    buttonState === "idle"
                      ? "url('/assets/click-idle-512x512.png')"
                      : buttonState === "press"
                      ? "url('/assets/click-press-512x512.png')"
                      : buttonState === "hold"
                      ? "url('/assets/click-hold-512x512.png')"
                      : "url('/assets/click-release-512x512.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <span className="relative z-10 drop-shadow-lg">CLICK</span>
                {buttonState === "press" && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                )}
              </button>
              <button
                type="button"
                onClick={endSession}
                className="w-full rounded-lg border border-gray-500 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-500 hover:text-white"
              >
                End Session
              </button>
            </>
          )}

          {sessionEndTime && !hasEnteredJackpot && (
            <div className="w-full space-y-4 rounded-2xl border border-white/10 bg-bg-panel p-6">
              <div className="text-center">
                <p className="mb-2 text-lg">Session Complete!</p>
                <p className="text-sm text-gray-400">
                  You clicked {clicks} times in {sessionDuration} seconds.
                </p>
              </div>
              <LoadingButton
                type="button"
                onClick={handleEnterJackpot}
                isLoading={isEntering}
                className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-bg-dark transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEntering
                  ? "Entering..."
                  : `Enter Jackpot (${formatTokens(entryFee)} ${tokenSymbol})`}
              </LoadingButton>
            </div>
          )}

          {sessionEndTime && hasEnteredJackpot && (
            <div className="w-full rounded-2xl border border-primary/50 bg-primary/10 p-6 text-center">
              <p className="text-lg font-semibold text-primary">
                Entry Submitted!
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Your entry has been recorded. Check the Jackpot tab for updates.
              </p>
            </div>
          )}

          {sessionEndTime && (
            <button
              type="button"
              onClick={startSession}
              className="w-full rounded-lg border border-primary px-6 py-4 text-lg font-semibold text-primary transition hover:bg-primary hover:text-bg-dark"
            >
              Start New Session
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default PlayPage;

