import { useState, useContext } from "react";
import { Contract, parseUnits } from "ethers";
import { Web3Context } from "../context/Web3Context";
import {
  MUSICNFT_ABI,
  MUSICNFT_ADDRESS,
  MARKETPLACE_ABI,
  MARKETPLACE_ADDRESS,
  YODA_ABI,
  YODA_ADDRESS,
} from "../config";

export default function MintPage() {
  const { account, provider } = useContext(Web3Context);
  const [name, setName] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [tokenURI, setTokenURI] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const uploadMetadataToIPFS = async () => {
    if (!file || !name || !artist || !description) {
      alert("Please fill all metadata fields and select an audio file");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("⏳ Uploading audio + metadata to IPFS...");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("songName", name);
      formData.append("artist", artist);
      formData.append("description", description);

      const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";
      const res = await fetch(`${BACKEND}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.uri) throw new Error("Missing URI in response");

      setTokenURI(data.uri);
      setStatus("✅ Metadata uploaded to IPFS. Ready to mint.");
    } catch (err) {
      console.error("❌ IPFS upload failed:", err);
      setStatus("❌ Upload failed. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMint = async () => {
    if (!tokenURI || !price || isNaN(price) || Number(price) <= 0) {
      alert("Please upload metadata and enter a valid price");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("⏳ Minting NFT...");

      const signer = await provider.getSigner();

      const nft = new Contract(MUSICNFT_ADDRESS, MUSICNFT_ABI, signer);
      const yoda = new Contract(YODA_ADDRESS, YODA_ABI, signer);
      const market = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      // Mint NFT
      setStatus("⏳ Creating your NFT on the blockchain...");
      const mintTx = await nft.mintMusicNFT(tokenURI);
      await mintTx.wait();

      const tokenCounter = await nft.tokenCounter();
      const tokenId = tokenCounter - 1n;

      // Verify ownership
      const owner = await nft.ownerOf(tokenId);
      if (owner.toLowerCase() !== account.toLowerCase()) {
        throw new Error("You are not the owner of the NFT");
      }

      // Approve marketplace
      setStatus("⏳ Approving marketplace to transfer your NFT...");
      const approved = await nft.getApproved(tokenId);
      if (approved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
        const approveTx = await nft.approve(MARKETPLACE_ADDRESS, tokenId);
        await approveTx.wait();
      }

      // Ensure YODA token approval
      const priceInWei = parseUnits(price, 2);
      const allowance = await yoda.allowance(account, MARKETPLACE_ADDRESS);
      if (allowance < priceInWei) {
        setStatus("⏳ Approving YODA tokens for marketplace use...");
        const approveYodaTx = await yoda.approve(MARKETPLACE_ADDRESS, priceInWei);
        await approveYodaTx.wait();
      }

      // List NFT
      setStatus("⏳ Listing your NFT for sale...");
      const listTx = await market.listNFT(tokenId, priceInWei);
      await listTx.wait();

      setStatus(`✅ Success! Your NFT (ID: ${tokenId}) is minted and listed for ${price} YODA`);
      
      // Reset form
      setName(""); 
      setArtist(""); 
      setDescription(""); 
      setFile(null); 
      setPrice(""); 
      setTokenURI("");

    } catch (err) {
      console.error("❌ Mint/list failed:", err);
      setStatus(`❌ Error: ${err.message || "Transaction failed"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-4">🎤 Mint Song NFT</h2>
        <p>Please connect your wallet to mint NFTs</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">🎤 Mint Your Song NFT</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1">Song Name</label>
          <input 
            type="text" 
            placeholder="Enter the song name" 
            className="border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">Artist</label>
          <input 
            type="text" 
            placeholder="Artist name" 
            className="border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" 
            value={artist} 
            onChange={(e) => setArtist(e.target.value)} 
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">Description</label>
          <textarea 
            placeholder="Description of your song" 
            className="border rounded-lg p-2 w-full h-24 focus:outline-none focus:ring-2 focus:ring-purple-500" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">Audio File</label>
          <input 
            type="file" 
            accept="audio/*" 
            className="border rounded-lg p-2 w-full" 
            onChange={(e) => setFile(e.target.files[0])} 
            disabled={isLoading}
          />
        </div>

        {file && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">Preview:</p>
            <audio controls className="w-full">
              <source src={URL.createObjectURL(file)} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
        
        <div>
          <label className="block text-gray-700 mb-1">Price (YODA tokens)</label>
          <input 
            type="text" 
            placeholder="Price in YODA tokens" 
            className="border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" 
            value={price} 
            onChange={(e) => setPrice(e.target.value)} 
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-6">
          <button
            onClick={uploadMetadataToIPFS}
            disabled={isLoading || !file || !name || !artist || !description}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex-1"
          >
            1. Upload to IPFS
          </button>

          <button
            onClick={handleMint}
            disabled={isLoading || !tokenURI || !price}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex-1"
          >
            2. Mint & List NFT
          </button>
        </div>

        {status && (
          <div className={`mt-4 p-3 rounded-lg ${status.includes("❌") ? "bg-red-50 text-red-700" : status.includes("✅") ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}