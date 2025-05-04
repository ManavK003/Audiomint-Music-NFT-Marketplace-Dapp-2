import { createContext, useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import NFT_ABI from "../abis/MusicNFT.json";
import MARKET_ABI from "../abis/MusicMarketplace.json";
import YODA_ABI from "../abis/Yoda.json";

export const Web3Context = createContext();

const YODA_ADDRESS = "0x8F1772f19675aF3C5D675f1a93427d30939c32EE";
const MUSICNFT_ADDRESS = "0x6daB15f808Eb73529baA3E927e330Ae6797c71F1";
const MARKETPLACE_ADDRESS = "0xbAdE8aa58cB43257ae86F7Bcb80aa89990846038";

// ✅ YodaCoin deployed at: 0x8F1772f19675aF3C5D675f1a93427d30939c32EE
// ✅ MusicNFT deployed at: 0x6daB15f808Eb73529baA3E927e330Ae6797c71F1
// ✅ Marketplace deployed at: 0xbAdE8aa58cB43257ae86F7Bcb80aa89990846038

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({
    nft: { read: null, write: null },
    market: { read: null, write: null },
    yoda: { read: null, write: null },
  });

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return;

      const _provider = new BrowserProvider(window.ethereum);
      const _accounts = await _provider.send("eth_requestAccounts", []);
      const _signer = await _provider.getSigner();

      setAccount(_accounts[0]);
      setProvider(_provider);
      setSigner(_signer);

      setContracts({
        nft: {
          read: new Contract(MUSICNFT_ADDRESS, NFT_ABI.abi, _provider),
          write: new Contract(MUSICNFT_ADDRESS, NFT_ABI.abi, _signer),
        },
        market: {
          read: new Contract(MARKETPLACE_ADDRESS, MARKET_ABI.abi, _provider),
          write: new Contract(MARKETPLACE_ADDRESS, MARKET_ABI.abi, _signer),
        },
        yoda: {
          read: new Contract(YODA_ADDRESS, YODA_ABI.abi, _provider),
          write: new Contract(YODA_ADDRESS, YODA_ABI.abi, _signer),
        },
      });
    };

    init();
  }, []);

  return (
    <Web3Context.Provider value={{ account, provider, signer, ...contracts }}>
      {children}
    </Web3Context.Provider>
  );
};
