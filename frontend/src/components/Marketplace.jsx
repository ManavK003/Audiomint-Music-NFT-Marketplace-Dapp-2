import { useEffect, useState, useContext } from "react";
import { Contract, formatUnits } from "ethers";
import { Web3Context } from "../context/Web3Context";
import {
  MARKETPLACE_ABI,
  MARKETPLACE_ADDRESS,
  MUSICNFT_ABI,
  MUSICNFT_ADDRESS,
  YODA_ABI,
  YODA_ADDRESS,
} from "../config";

export default function Marketplace() {
  const { account, provider, yoda } = useContext(Web3Context);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);

  const loadListings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use provider from context instead of creating a new one
      const market = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
      const nft = new Contract(MUSICNFT_ADDRESS, MUSICNFT_ABI, provider);
      
      const tempListings = [];
      let tokenId = 0;
      let consecutiveErrors = 0;

      // Keep fetching until we hit 3 consecutive errors (likely the end of listings)
      while (consecutiveErrors < 3 && tokenId < 100) {
        try {
          const listing = await market.listings(tokenId);
          
          if (listing.price > 0n) {
            const tokenURI = await nft.tokenURI(tokenId);
            const cid = tokenURI.split("ipfs://")[1];

            // Fetch metadata from Express proxy
            const res = await fetch(`http://localhost:4000/proxy/${cid}`);
            
            if (!res.ok) {
              throw new Error(`Failed to fetch metadata: ${res.status}`);
            }
            
            const metadata = await res.json();
            
            // Get audio CID from metadata
            const audioCid = metadata.properties?.audio?.split("ipfs://")[1];
            
            tempListings.push({
              tokenId,
              uri: tokenURI,
              price: listing.price,
              seller: listing.seller,
              name: metadata.name || `Track #${tokenId}`,
              artist: metadata.properties?.artist || "Unknown Artist",
              description: metadata.description || "No description available",
              audio: audioCid ? `http://localhost:4000/proxy/${audioCid}` : null,
            });
            
            consecutiveErrors = 0; // Reset counter on success
          }
          
        } catch (err) {
          console.warn(`Error loading token ${tokenId}:`, err.message);
          consecutiveErrors++;
        }
        
        tokenId++;
      }

      setListings(tempListings);
    } catch (err) {
      console.error("Failed to load marketplace listings:", err);
      setError("Failed to load marketplace listings. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (provider && account) {
      loadListings();
    }
  }, [provider, account]);

  const handleBuy = async (tokenId) => {
    try {
      if (!provider) {
        throw new Error("Provider not connected");
      }
      
      const signer = await provider.getSigner();
      if (!signer) {
        throw new Error("Failed to get signer");
      }
      
      // Explicitly recreate contract instances with the signer
      const market = new Contract(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        signer
      );
      
      // No need to recreate yoda contract since we already have it from context
      if (!yoda) {
        throw new Error("YODA token contract not available");
      }
      
      // Log contract information for debugging
      console.log("🔍 Market contract address:", MARKETPLACE_ADDRESS);
      console.log("🔍 Contract interface:", market.interface ? "Available" : "Not available");
      
      // Check if contract has buyNFT function directly - safer approach
      try {
        // Check if the function exists by trying to access it
        if (typeof market.buyNFT !== 'function') {
          console.error("buyNFT function not found on contract");
          throw new Error("Contract is missing the buyNFT function");
        }
        console.log("✅ buyNFT function found on contract");
      } catch (err) {
        console.error("Error checking contract functions:", err);
        throw new Error("Failed to validate contract interface");
      }
  
      const listing = await market.listings(tokenId);
      const price = listing.price;
  
      // 1. Approve YODA token if needed
      const allowance = await yoda.read.allowance(account, MARKETPLACE_ADDRESS);
      console.log("Current allowance:", formatUnits(allowance, 2), "YODA");
      
      if (allowance < price) {
        console.log("Approving tokens:", formatUnits(price, 2), "YODA");
        const approveTx = await yoda.write.approve(MARKETPLACE_ADDRESS, price);
        console.log("Approval transaction:", approveTx.hash);
        await approveTx.wait();
        console.log("Approval confirmed");
      }
  
      // 2. Execute the buy transaction
      console.log("Executing buyNFT for token:", tokenId);
      const tx = await market.buyNFT(tokenId);
      console.log("Purchase transaction:", tx.hash);
      await tx.wait();
      console.log("Purchase confirmed");
  
      alert("✅ Purchase complete! You now own this NFT.");
      await loadListings();
    } catch (err) {
      console.error("❌ Purchase failed:", err);
      alert("❌ Transaction failed: " + (err.reason || err.message || "Unknown error"));
    }
  };
  
  const handlePlayAudio = (audioSrc, tokenId) => {
    if (playingAudio === tokenId) {
      setPlayingAudio(null); // Stop playing
    } else {
      setPlayingAudio(tokenId); // Start playing this one
    }
  };

  if (!account) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-4">🛒 Marketplace</h2>
        <p>Please connect your wallet to browse music NFTs</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">🛒 Music NFT Marketplace</h2>
      
      {/* Removed the duplicate YODA balance display since it's already shown in the TokenBalance component */}
      
      {loading && (
        <div className="text-center py-8">
          <p>Loading marketplace listings...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={loadListings}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && listings.length === 0 && (
        <div className="text-center py-8 bg-gray-100 rounded-lg">
          <p className="text-lg">No listings found in the marketplace.</p>
          <p className="mt-2 text-gray-600">Be the first to mint and list your music NFT!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((item) => (
          <div key={item.tokenId} className="border rounded-lg overflow-hidden shadow-md bg-white">
            <div className="p-4">
              <h3 className="text-xl font-bold truncate">{item.name}</h3>
              <p className="text-gray-600">Artist: {item.artist}</p>
              
              <div className="my-3 h-16 overflow-y-auto text-sm text-gray-700">
                <p>{item.description}</p>
              </div>
              
              <div className="mt-3 mb-4">
                {item.audio ? (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handlePlayAudio(item.audio, item.tokenId)}
                      className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
                    >
                      {playingAudio === item.tokenId ? "⏹️" : "▶️"}
                    </button>
                    {playingAudio === item.tokenId && (
                      <audio
                        src={item.audio}
                        autoPlay
                        controls
                        onEnded={() => setPlayingAudio(null)}
                        className="w-full"
                      >
                        Your browser does not support the audio element.
                      </audio>
                    )}
                  </div>
                ) : (
                  <p className="text-red-500 text-sm">Audio not available</p>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <p className="font-bold text-lg">
                {Number(formatUnits(item.price, 2)).toFixed(2)} YODA
                </p>
                <button
                  onClick={() => handleBuy(item.tokenId)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                  Buy NFT
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}