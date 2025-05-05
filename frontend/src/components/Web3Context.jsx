import { createContext, useState, useEffect } from "react";
import { BrowserProvider, Contract } from "ethers";
import { YODA_ABI, YODA_ADDRESS } from "../config";

// Create the context
export const Web3Context = createContext();

// Provider component
export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [yoda, setYoda] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);

  // Connect wallet on component mount
  useEffect(() => {
    const connectWallet = async () => {
      setIsConnecting(true);
      setError(null);
      
      try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
          throw new Error("Please install MetaMask to use this application");
        }
        
        // Get provider and accounts
        const ethersProvider = new BrowserProvider(window.ethereum);
        setProvider(ethersProvider);
        
        // Initialize YODA token contract
        const yodaContract = new Contract(YODA_ADDRESS, YODA_ABI, ethersProvider);
        setYoda(yodaContract);
        
        // Request accounts access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          
          // Get signer after accounts are connected
          const ethersSigner = await ethersProvider.getSigner();
          setSigner(ethersSigner);
        } else {
          throw new Error("No accounts found. Please unlock MetaMask and try again.");
        }
      } catch (err) {
        console.error("Failed to connect wallet:", err);
        setError(err.message);
      } finally {
        setIsConnecting(false);
      }
    };

    connectWallet();

    // Set up event listeners for account/network changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
        // Refresh page to ensure all contract instances get updated
        window.location.reload();
      });

      window.ethereum.on('chainChanged', () => {
        // Refresh page on network change
        window.location.reload();
      });
    }

    // Cleanup event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return (
    <Web3Context.Provider 
      value={{
        account,
        provider,
        signer,
        yoda,
        isConnecting,
        error
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Provider;