import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import axios from 'axios';
import FormData from 'form-data';
import { formidable } from 'formidable';

dotenv.config();

const app = express();
const PORT = 4000;
const __dirname = path.resolve();

const PINATA_JWT = process.env.PINATA_JWT;
console.log("🔑 PINATA_JWT loaded:", !!PINATA_JWT);

if (!PINATA_JWT) {
  console.error("❌ Missing Pinata JWT in .env");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// ✅ Upload Route using Pinata
app.post('/upload', (req, res) => {
  const form = formidable({ multiples: false, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Form parsing error:", err);
      return res.status(500).json({ error: 'Upload error' });
    }

    console.log("📤 Fields:", fields);
    console.log("📤 Files:", files);

    try {
      const file = files.file?.[0];
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const data = new FormData();
      data.append('file', fs.createReadStream(file.filepath));

      const metadata = JSON.stringify({
        name: fields.songName?.[0] || "Untitled",
        keyvalues: {
          artist: fields.artist?.[0] || "Unknown",
          description: fields.description?.[0] || ""
        }
      });

      data.append('pinataMetadata', metadata);

      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
        maxBodyLength: Infinity,
        headers: {
          ...data.getHeaders(),
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      });

      const cid = response.data.IpfsHash;
      console.log("✅ Uploaded to Pinata with CID:", cid);
      res.json({ uri: `ipfs://${cid}` });

    } catch (e) {
      console.error("❌ Pinata upload error:", e.message || e);
      res.status(500).json({ error: "Failed to upload to Pinata" });
    }
  });
});

// ✅ Proxy Route for IPFS metadata
app.get("/proxy/:cid", async (req, res) => {
  const cid = req.params.cid;
  console.log("🔍 Fetching IPFS CID:", cid);
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    if (!response.ok) throw new Error("Fetch failed");
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error("❌ Proxy fetch failed:", e.message);
    res.status(500).json({ error: "Could not fetch metadata" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
