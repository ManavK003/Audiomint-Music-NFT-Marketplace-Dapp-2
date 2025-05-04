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

// ✅ CORS for frontend
app.use(cors({ origin: "*" }));
app.use(express.json());

// ✅ Upload route: Pinata IPFS
app.post('/upload', (req, res) => {
  const form = formidable({ multiples: false, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Form parsing error:", err);
      return res.status(500).json({ error: 'Upload error' });
    }

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

// ✅ Proxy route: safer with fallback gateways
app.get("/proxy/:cid", async (req, res) => {
  const cid = req.params.cid;
  console.log("🔍 Fetching IPFS CID:", cid);

  const gateways = [
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`
  ];

  try {
    let response;

    for (const url of gateways) {
      try {
        response = await fetch(url);
        if (response.ok) break;
        console.warn(`⚠️ Failed at ${url}: ${response.status}`);
      } catch (err) {
        console.warn(`⚠️ Fetch error from ${url}:`, err.message);
      }
    }

    if (!response || !response.ok) {
      throw new Error("All IPFS gateways failed");
    }

    const contentType = response.headers.get("content-type");
    if (!contentType.includes("application/json")) {
      return res.status(415).json({ error: "Unsupported content-type: " + contentType });
    }

    const json = await response.json();
    res.json(json);

  } catch (e) {
    console.error("❌ Proxy fetch failed:", e.message);
    res.status(500).json({ error: "Could not fetch metadata" });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
