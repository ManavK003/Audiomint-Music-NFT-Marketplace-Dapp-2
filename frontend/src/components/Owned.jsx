import { useEffect, useState } from "react";
import { BrowserProvider, Contract, parseUnits } from "ethers";
import {
  MUSICNFT_ABI,
  MUSICNFT_ADDRESS,
  MARKETPLACE_ABI,
  MARKETPLACE_ADDRESS,
} from "../config";

export default function Owned({ wallet }) {
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [listingPrices, setListingPrices] = useState({});

  const loadOwnedAndListed = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const nft = new Contract(MUSICNFT_ADDRESS, MUSICNFT_ABI, provider);
    const market = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

    const temp = [];

    for (let i = 0; i < 100; i++) {
      try {
        const tokenURI = await nft.tokenURI(i);
        const owner = await nft.ownerOf(i);
        const listing = await market.listings(i);

        const lowerWallet = wallet.toLowerCase();

        if (
          owner.toLowerCase() === lowerWallet ||
          (listing?.seller?.toLowerCase() === lowerWallet &&
            owner.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase())
        ) {
          // 👇 Fetch metadata.json from IPFS
          const ipfsCid = tokenURI.split("ipfs://")[1];
          const metaRes = await fetch(`http://localhost:4000/proxy/${ipfsCid}`);
          const metadata = await metaRes.json();

          temp.push({
            tokenId: i,
            uri: tokenURI,
            owner,
            listed: owner.toLowerCase() !== lowerWallet,
            ...metadata, // name, description, properties: { artist, audio }
          });
        }
      } catch {
        break;
      }
    }

    setOwnedNFTs(temp);
  };

  useEffect(() => {
    if (wallet) {
      loadOwnedAndListed();
    }
  }, [wallet]);

  const listForSale = async (tokenId) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const nft = new Contract(MUSICNFT_ADDRESS, MUSICNFT_ABI, signer);
      const market = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const priceInWei = parseUnits(listingPrices[tokenId], 2);
      await nft.approve(MARKETPLACE_ADDRESS, tokenId);
      await market.listNFT(tokenId, priceInWei);
      alert("✅ Listed for sale");
      await loadOwnedAndListed();
    } catch (err) {
      console.error("❌ Listing failed:", err);
      alert("❌ Listing failed. Make sure you're the NFT owner.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">🎧 Your Songs</h2>
      {ownedNFTs.length === 0 && (
        <p className="text-gray-500">You don't own or control any NFTs.</p>
      )}
      {ownedNFTs.map((nft, i) => (
        <div key={i} className="border p-3 rounded-lg shadow-sm">
          <p><strong>Token:</strong> {nft.tokenId}</p>
          <p><strong>Name:</strong> {nft.name || "Untitled"}</p>
          <p><strong>Artist:</strong> {nft.properties?.artist || "Unknown"}</p>
          <p><strong>Description:</strong> {nft.description || "No description provided."}</p>
          <audio controls className="w-full mt-2">
            <source
              src={`http://localhost:4000/proxy/${nft.properties?.audio?.split("ipfs://")[1]}`}
              type="audio/mpeg"
            />
            Your browser does not support the audio element.
          </audio>
          {nft.listed ? (
            <p className="text-yellow-600 font-semibold">🛒 Already listed</p>
          ) : nft.owner.toLowerCase() === wallet.toLowerCase() ? (
            <>
              <input
                type="text"
                className="border p-1 rounded w-1/2"
                placeholder="List price (YODA)"
                onChange={(e) =>
                  setListingPrices({ ...listingPrices, [nft.tokenId]: e.target.value })
                }
              />
              <button
                className="ml-2 bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                onClick={() => listForSale(nft.tokenId)}
              >
                List
              </button>
            </>
          ) : (
            <p className="text-red-600">⚠️ You are not the owner</p>
          )}
        </div>
      ))}
    </div>
  );
}
