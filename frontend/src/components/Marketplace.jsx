import { useEffect, useState } from "react";
import { BrowserProvider, Contract, formatUnits } from "ethers";
import {
  MARKETPLACE_ABI,
  MARKETPLACE_ADDRESS,
  MUSICNFT_ABI,
  MUSICNFT_ADDRESS,
} from "../config";

export default function Marketplace({ wallet }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);

  const loadListings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const provider = new BrowserProvider(window.ethereum);
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
    if (wallet) {
      loadListings();
    }
  }, [wallet]);

  const handleBuy = async (tokenId) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const market = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      // Get listing price before purchase
      const listing = await market.listings(tokenId);
      
      const tx = await market.buyNFT(tokenId, { value: listing.price });
      
      // Show pending notification
      alert("⏳ Transaction submitted! Waiting for confirmation...");
      
      await tx.wait();
      alert("✅ Purchase complete! You now own this NFT.");
      
      // Refresh listings
      await loadListings();
    } catch (err) {
      console.error("❌ Purchase failed:", err.message || err);
      alert("❌ Transaction failed. " + (err.message ? err.message : "See console for details."));
    }
  };

  const handlePlayAudio = (audioSrc, tokenId) => {
    if (playingAudio === tokenId) {
      setPlayingAudio(null); // Stop playing
    } else {
      setPlayingAudio(tokenId); // Start playing this one
    }
  };

  if (!wallet) {
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
                  {formatUnits(item.price, 18)} ETH
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
