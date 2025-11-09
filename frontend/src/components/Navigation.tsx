import { useState } from "react";

type Tab = "play" | "jackpot" | "fairness";

interface NavigationProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Navigation = ({ currentTab, onTabChange }: NavigationProps) => {
  const tabs: { id: Tab; label: string }[] = [
    { id: "play", label: "Play" },
    { id: "jackpot", label: "Jackpot" },
    { id: "fairness", label: "Fairness" },
  ];

  return (
    <nav className="flex gap-2 rounded-xl border border-white/10 bg-bg-panel p-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            currentTab === tab.id
              ? "bg-primary text-bg-dark"
              : "text-gray-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

export default Navigation;

