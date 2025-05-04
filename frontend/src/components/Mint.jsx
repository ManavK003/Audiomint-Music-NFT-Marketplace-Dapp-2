import { useState } from "react";
import { BrowserProvider, Contract, parseUnits } from "ethers";
import {
  MUSICNFT_ABI,
  MUSICNFT_ADDRESS,
  MARKETPLACE_ABI,
  MARKETPLACE_ADDRESS,
  YODA_ABI,
  YODA_ADDRESS,
} from "../config";

export default function Mint({ wallet }) {
  const [name, setName] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [tokenURI, setTokenURI] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("");

  const uploadMetadataToIPFS = async () => {
    if (!file || !name || !artist || !description) {
      alert("Fill all metadata fields and select an audio file");
      return;
    }

    try {
      setStatus("⏳ Uploading audio + metadata to IPFS...");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("songName", name);
      formData.append("artist", artist);
      formData.append("description", description);

      const res = await fetch(`${process.env.REACT_APP_BACKEND}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.uri) throw new Error("Missing URI in response");

      setTokenURI(data.uri);
      setStatus("✅ Metadata uploaded. Ready to mint.");
    } catch (err) {
      console.error("❌ IPFS upload failed:", err);
      setStatus("❌ Upload failed. Check console.");
    }
  };

  const handleMint = async () => {
    if (!tokenURI || !price || isNaN(price) || Number(price) <= 0) {
      alert("Upload metadata and enter a valid price");
      return;
    }

    try {
      setStatus("⏳ Minting NFT...");

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const nft = new Contract(MUSICNFT_ADDRESS, MUSICNFT_ABI, signer);
      const yoda = new Contract(YODA_ADDRESS, YODA_ABI, signer);
      const market = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      // Mint NFT
      const mintTx = await nft.mintMusicNFT(tokenURI);
      await mintTx.wait();

      const tokenCounter = await nft.tokenCounter();
      const tokenId = tokenCounter - 1n;

      const currentUser = await signer.getAddress();
      const owner = await nft.ownerOf(tokenId);
      if (owner.toLowerCase() !== currentUser.toLowerCase()) {
        throw new Error("You are not the owner of the NFT");
      }

      // Approve marketplace
      const approved = await nft.getApproved(tokenId);
      if (approved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
        await nft.approve(MARKETPLACE_ADDRESS, tokenId);
      }

      // Ensure YODA token approval
      const priceInWei = parseUnits(price, 2);
      const allowance = await yoda.allowance(currentUser, MARKETPLACE_ADDRESS);
      if (allowance < priceInWei) {
        const approveYodaTx = await yoda.approve(MARKETPLACE_ADDRESS, priceInWei);
        await approveYodaTx.wait();
      }

      // List NFT
      const listTx = await market.listNFT(tokenId, priceInWei);
      await listTx.wait();

      setStatus("✅ NFT minted and listed!");
      setName(""); setArtist(""); setDescription(""); setFile(null); setPrice(""); setTokenURI("");

    } catch (err) {
      console.error("❌ Mint/list failed:", err);
      setStatus("❌ Mint or list failed. See console.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">🎤 Mint Song NFT</h2>

      <input type="text" placeholder="Song Name" className="border p-2 w-full" value={name} onChange={(e) => setName(e.target.value)} />
      <input type="text" placeholder="Artist" className="border p-2 w-full" value={artist} onChange={(e) => setArtist(e.target.value)} />
      <textarea placeholder="Description" className="border p-2 w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
      <input type="file" accept="audio/*" className="border p-2 w-full" onChange={(e) => setFile(e.target.files[0])} />

      {file && (
        <audio controls className="w-full mt-2">
          <source src={URL.createObjectURL(file)} type="audio/mpeg" />
        </audio>
      )}

      <input type="text" placeholder="Price in YODA" className="border p-2 w-full" value={price} onChange={(e) => setPrice(e.target.value)} />

      <div className="space-x-2">
        <button
          onClick={uploadMetadataToIPFS}
          disabled={status.includes("⏳")}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          Upload Metadata
        </button>

        <button
          onClick={handleMint}
          disabled={status.includes("⏳")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Mint & List
        </button>
      </div>

      <p className="text-sm text-gray-700">{status}</p>
    </div>
  );
}

