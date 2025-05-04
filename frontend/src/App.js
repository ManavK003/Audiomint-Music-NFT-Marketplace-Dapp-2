import { useState, useContext } from "react";
import { Web3Context, Web3Provider } from "./context/Web3Context";

import Mint from "./components/Mint";
import Marketplace from "./components/Marketplace";
import Owned from "./components/Owned";
import WalletInfo from "./components/WalletInfo";

function AppContent() {
  const { account } = useContext(Web3Context);
  const [tab, setTab] = useState("market");

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white shadow p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎵 Audiomint</h1>
        <WalletInfo />
      </header>

      <nav className="flex justify-center space-x-4 bg-gray-200 py-3">
        <button
          onClick={() => setTab("market")}
          className={`px-4 py-2 rounded ${tab === "market" ? "bg-white shadow" : "hover:bg-gray-300"}`}
        >
          🛒 Marketplace
        </button>
        <button
          onClick={() => setTab("mint")}
          className={`px-4 py-2 rounded ${tab === "mint" ? "bg-white shadow" : "hover:bg-gray-300"}`}
        >
          🎤 Mint Songs
        </button>
        <button
          onClick={() => setTab("owned")}
          className={`px-4 py-2 rounded ${tab === "owned" ? "bg-white shadow" : "hover:bg-gray-300"}`}
        >
          🎧 Your NFTs
        </button>
      </nav>

      <main className="p-6 max-w-4xl mx-auto">
        {tab === "market" && <Marketplace />}
        {tab === "mint" && <Mint />}
        {tab === "owned" && <Owned wallet={account} />}

      </main>
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
}
