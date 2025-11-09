import { useState } from "react";

import AdminPanel from "./components/AdminPanel";
import FairnessPanel from "./components/FairnessPanel";
import JackpotPage from "./components/JackpotPage";
import Navigation from "./components/Navigation";
import PlayPage from "./components/PlayPage";
import RiskDisclaimer from "./components/RiskDisclaimer";
import { ToastContainer } from "./components/Toast";
import TopBar from "./components/TopBar";
import { ClickerProvider } from "./context/ClickerContext";
import { WalletProvider } from "./context/WalletContext";

type Tab = "play" | "jackpot" | "fairness";

const AppShell = () => {
  const [currentTab, setCurrentTab] = useState<Tab>("play");

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-dark text-white font-sans">
      <RiskDisclaimer />
      <ToastContainer />
      <div className="pointer-events-none absolute -left-20 -top-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <TopBar />
        <Navigation currentTab={currentTab} onTabChange={setCurrentTab} />
        <main>
          {currentTab === "play" && <PlayPage />}
          {currentTab === "jackpot" && <JackpotPage />}
          {currentTab === "fairness" && <FairnessPanel />}
        </main>
        <AdminPanel />
      </div>
    </div>
  );
};

const App = () => (
  <WalletProvider>
    <ClickerProvider>
      <AppShell />
    </ClickerProvider>
  </WalletProvider>
);

export default App;
