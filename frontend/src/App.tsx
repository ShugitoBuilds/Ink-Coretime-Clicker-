import BoomToast from "./components/BoomToast";
import LeaderboardPanel from "./components/LeaderboardPanel";
import RentPanel from "./components/RentPanel";
import StatusPanel from "./components/StatusPanel";
import TopBar from "./components/TopBar";
import { GameProvider } from "./context/GameContext";
import { WalletProvider } from "./context/WalletContext";

const AppShell = () => (
  <div className="relative min-h-screen overflow-hidden bg-bg-dark text-white font-sans">
    <div className="pointer-events-none absolute -left-20 -top-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
    <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
    <BoomToast />
    <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <TopBar />
      <main className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <RentPanel />
        <StatusPanel />
      </main>
      <LeaderboardPanel />
    </div>
  </div>
);

const App = () => (
  <WalletProvider>
    <GameProvider>
      <AppShell />
    </GameProvider>
  </WalletProvider>
);

export default App;
