import { useEffect, useState } from "react";

import { useGame } from "../context/GameContext";
import { ELASTIC_BOOM_MULTIPLIER } from "../config";

const BoomToast = () => {
  const { boomMessage, isBoomActive } = useGame();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (boomMessage) {
      setVisible(true);
      const timeout = window.setTimeout(() => setVisible(false), 4500);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [boomMessage]);

  if (!visible && !isBoomActive) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-primary bg-black/80 px-6 py-4 text-sm text-primary shadow-lg shadow-primary/40 transition">
        <div className="flex flex-col">
          <span className="text-base font-semibold uppercase tracking-wider">
            Elastic Boom
          </span>
          <span className="text-xs text-gray-200">
            {boomMessage ?? "Multiplier active — rewards doubled!"}
          </span>
        </div>
        <span className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary">
          x{ELASTIC_BOOM_MULTIPLIER}
        </span>
      </div>
    </div>
  );
};

export default BoomToast;
