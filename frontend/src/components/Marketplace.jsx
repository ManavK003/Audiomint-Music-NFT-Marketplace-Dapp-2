// ✅ Updated Marketplace.jsx
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

  const loadListings = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const market = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
    const nft = new Contract(MUSICNFT_ADDRESS, MUSICNFT_ABI, provider);

    const temp = [];
    for (let i = 0; i < 100; i++) {
      try {
        const listing = await market.listings(i);
        if (listing.price > 0n) {
          const tokenURI = await nft.tokenURI(i);
          temp.push({
            tokenId: i,
            uri: tokenURI,
            price: listing.price,
            seller: listing.seller,
          });
        }
      } catch {
        break;
      }
    }
    setListings(temp);
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleBuy = async (tokenId, price) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const market = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const tx = await market.buyNFT(tokenId);
      await tx.wait();
      alert("✅ Purchase complete");
      await loadListings();
    } catch (err) {
      console.error("❌ Purchase failed:", err.message || err);
      alert("❌ Transaction failed. See console for details.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">🛒 Marketplace</h2>
      {listings.length === 0 && <p>No listings found.</p>}
      {listings.map((item, i) => (
        <div key={i} className="border p-3 rounded-lg shadow-sm">
          <p><strong>Token:</strong> {item.tokenId}</p>
          <audio controls className="w-full mt-2">
            <source
              src={`https://nftstorage.link/ipfs/${item.uri.split("ipfs://")[1]}`}
              type="audio/mpeg"
            />
            Your browser does not support the audio element.
          </audio>
          <p><strong>Price:</strong> {formatUnits(item.price, 2)} YODA</p>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={() => handleBuy(item.tokenId, item.price)}
          >
            Buy
          </button>
        </div>
      ))}
    </div>
  );
}