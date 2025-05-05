import { useEffect, useState, useContext } from "react";
import { Contract,formatUnits, parseUnits } from "ethers";
import { Web3Context } from "../context/Web3Context";
import {
  MUSICNFT_ABI,
  MUSICNFT_ADDRESS,
  MARKETPLACE_ABI,
  MARKETPLACE_ADDRESS,
} from "../config";

export default function CollectionPage() {
  const { account, provider } = useContext(Web3Context);
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [listingPrices, setListingPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [error, setError] = useState(null);

  const loadOwnedAndListed = async () => {
    if (!account || !provider) return;
  
    setLoading(true);
    setError(null);
  
    try {
      const nft = new Contract(MUSICNFT_ADDRESS, MUSICNFT_ABI, provider);
      const market = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
  
      const ownedTokens = [];
      const lowerAccount = account.toLowerCase();
  
      // ✅ Use total minted tokens from tokenCounter()
      const totalMinted = await nft.tokenCounter();
  
      for (let tokenId = 0; tokenId < totalMinted; tokenId++) {
        try {
          const owner = await nft.ownerOf(tokenId);
          const tokenURI = await nft.tokenURI(tokenId);
          const listing = await market.listings(tokenId);
  
          const isListedByUser = listing?.seller?.toLowerCase() === lowerAccount &&
                                 owner.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase();
  
          const isOwnedByUser = owner.toLowerCase() === lowerAccount;
  
          if (isOwnedByUser || isListedByUser) {
            const ipfsCid = tokenURI.split("ipfs://")[1];
            const metaRes = await fetch(`http://localhost:4000/proxy/${ipfsCid}`);
            if (!metaRes.ok) throw new Error(`Failed to fetch metadata: ${metaRes.status}`);
            const metadata = await metaRes.json();
  
            const audioCid = metadata.properties?.audio?.split("ipfs://")[1];
  
            ownedTokens.push({
              tokenId,
              uri: tokenURI,
              owner,
              listed: !isOwnedByUser,
              name: metadata.name || `Track #${tokenId}`,
              description: metadata.description || "No description available",
              artist: metadata.properties?.artist || "Unknown Artist",
              audio: audioCid ? `http://localhost:4000/proxy/${audioCid}` : null,
              price: listing?.price > 0n ? listing.price : 0n,
            });
          }
        } catch (err) {
          const msg = err?.error?.message || err?.message || "";
  
          const isMissingToken =
            msg.includes("execution reverted") ||
            (err?.data && err.data.startsWith("0x7e273289"));
  
          if (!isMissingToken) {
            console.warn(`Unexpected error at token ${tokenId}:`, err);
          }
  
          // If missing token, just skip silently
          continue;
        }
      }
  
      setOwnedNFTs(ownedTokens);
    } catch (err) {
      console.error("❌ Failed to load NFT collection:", err);
      setError("Failed to load your NFT collection. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  
  

  useEffect(() => {
    if (account && provider) {
      loadOwnedAndListed();
    }
  }, [account, provider]);

  const handlePlayAudio = (tokenId) => {
    if (playingAudio === tokenId) {
      setPlayingAudio(null); // Stop playing
    } else {
      setPlayingAudio(tokenId); // Start playing this one
    }
  };

  const listForSale = async (tokenId) => {
    const price = listingPrices[tokenId];
    if (!price || isNaN(price) || Number(price) <= 0) {
      alert("Please enter a valid price");
      return;
    }
    
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const nft = new Contract(MUSICNFT_ADDRESS, MUSICNFT_ABI, signer);
      const market = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      // First approve the marketplace to transfer the NFT
      const approveTx = await nft.approve(MARKETPLACE_ADDRESS, tokenId);
      await approveTx.wait();
      
      // Then list the NFT for sale
      const priceInWei = parseUnits(price, 2);
      const listTx = await market.listNFT(tokenId, priceInWei);
      await listTx.wait();
      
      alert(`✅ NFT #${tokenId} listed for ${price} YODA`);
      await loadOwnedAndListed();
    } catch (err) {
      console.error("❌ Listing failed:", err);
      alert(`❌ Listing failed: ${err.message || "Transaction error"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-4">🎧 Your Collection</h2>
        <p>Please connect your wallet to view your NFTs</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🎧 Your Music Collection</h2>
        <button 
          onClick={loadOwnedAndListed}
          disabled={loading}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {loading && (
        <div className="text-center py-8">
          <p>Loading your collection...</p>
        </div>
      )}
      
      {!loading && ownedNFTs.length === 0 && (
        <div className="text-center py-8 bg-gray-100 rounded-lg">
          <p className="text-lg">You don't own or have listed any NFTs yet.</p>
          <p className="mt-2 text-gray-600">Head to the Mint page to create your first music NFT!</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ownedNFTs.map((nft) => (
          <div key={nft.tokenId} className="border rounded-lg overflow-hidden shadow-md bg-white">
            <div className="p-4">
              <h3 className="text-xl font-bold truncate">{nft.name}</h3>
              <p className="text-gray-600">Artist: {nft.artist}</p>
              
              <div className="my-3 h-16 overflow-y-auto text-sm text-gray-700">
                <p>{nft.description}</p>
              </div>
              
              <div className="mt-3 mb-4">
                {nft.audio ? (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handlePlayAudio(nft.tokenId)}
                      className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
                    >
                      {playingAudio === nft.tokenId ? "⏹️" : "▶️"}
                    </button>
                    {playingAudio === nft.tokenId && (
                      <audio
                        src={nft.audio}
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
              
              <div className="mt-4 pt-3 border-t">
                {nft.listed ? (
                  <div className="flex justify-between items-center">
                    <p className="text-yellow-600 font-semibold">
                      🛒 Listed for {Number(formatUnits(nft.price, 2)).toFixed(2)} YODA
                    </p>
                    <span className="text-xs text-gray-500">
                      (Token ID: {nft.tokenId})
                    </span>
                  </div>
                ) : nft.owner.toLowerCase() === account.toLowerCase() ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      className="border rounded p-2 flex-1"
                      placeholder="List price (YODA)"
                      onChange={(e) =>
                        setListingPrices({ ...listingPrices, [nft.tokenId]: e.target.value })
                      }
                      disabled={loading}
                    />
                    <button
                      className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                      onClick={() => listForSale(nft.tokenId)}
                      disabled={loading || !listingPrices[nft.tokenId]}
                    >
                      List for Sale
                    </button>
                  </div>
                ) : (
                  <p className="text-red-600">⚠️ You are not the owner of this NFT</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}