import { createContext, useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import NFT_ABI from "../abis/MusicNFT.json";
import MARKET_ABI from "../abis/MusicMarketplace.json";
import YODA_ABI from "../abis/Yoda.json";

export const Web3Context = createContext();

const YODA_ADDRESS = "0xf65c04029C5AB4AFb6A924788194734A73dF3092";
const MUSICNFT_ADDRESS = "0xb36110186d4CD88D9dFa4B1d71EB244017A0660A";
const MARKETPLACE_ADDRESS = "0xdb654885711D0Cf92f0D39748Af72b7DeC49a6B3";

// ✅ YodaCoin deployed at: 0xf65c04029C5AB4AFb6A924788194734A73dF3092
// ✅ MusicNFT deployed at: 0xb36110186d4CD88D9dFa4B1d71EB244017A0660A
// ✅ Marketplace deployed at: 0xdb654885711D0Cf92f0D39748Af72b7DeC49a6B3

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
