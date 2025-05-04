import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import axios from 'axios';
import FormData from 'form-data';
import { formidable } from 'formidable';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;
const __dirname = path.resolve();

// Validate API key is available
const PINATA_JWT = process.env.PINATA_JWT;
console.log("🔑 PINATA_JWT loaded:", !!PINATA_JWT);

if (!PINATA_JWT) {
  console.error("❌ Missing Pinata JWT in .env");
  process.exit(1);
}

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// In-memory cache for IPFS responses
const ipfsCache = new Map();

// Clear cache every 10 minutes
setInterval(() => {
  ipfsCache.clear();
  console.log("🧹 IPFS cache cleared");
}, 1000 * 60 * 10);

/**
 * Upload audio file to IPFS and create metadata
 * POST /upload
 */
app.post('/upload', (req, res) => {
  const form = formidable({ 
    multiples: false, 
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024 // 50MB limit
  });
  
  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        console.error("❌ Form parsing error:", err);
        return res.status(400).json({ error: "Error parsing form data" });
      }
      
      const file = files.file?.[0];
      if (!file) return res.status(400).json({ error: "No file uploaded" });
      
      // Upload audio file to IPFS
      const audioForm = new FormData();
      audioForm.append("file", fs.createReadStream(file.filepath));
      
      const audioRes = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS", 
        audioForm, 
        {
          maxBodyLength: Infinity,
          headers: {
            ...audioForm.getHeaders(),
            Authorization: `Bearer ${PINATA_JWT}`,
          },
        }
      );
      
      const audioCID = audioRes.data.IpfsHash;
      const audioURL = `ipfs://${audioCID}`;
      
      // Create and upload metadata JSON
      const metadata = {
        name: fields.songName?.[0] || "Untitled",
        description: fields.description?.[0] || "",
        properties: {
          artist: fields.artist?.[0] || "Unknown",
          audio: audioURL,
        },
      };
      
      const metadataRes = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        metadata,
        {
          headers: {
            Authorization: `Bearer ${PINATA_JWT}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      const metadataCID = metadataRes.data.IpfsHash;
      res.json({ 
        success: true,
        uri: `ipfs://${metadataCID}`,
        audioCID,
        metadataCID
      });
      
      // Clean up temporary file
      fs.unlink(file.filepath, (err) => {
        if (err) console.warn("⚠️ Failed to remove temp file:", err);
      });
      
    } catch (e) {
      console.error("❌ Upload failed:", e.message);
      res.status(500).json({ error: "Upload failed", message: e.message });
    }
  });
});

/**
 * Proxy IPFS content through multiple gateways
 * GET /proxy/:cid
 */
app.get("/proxy/:cid", async (req, res) => {
  const cid = req.params.cid;
  console.log("🔍 Fetching IPFS CID:", cid);
  
  // Return cached response if available
  if (ipfsCache.has(cid)) {
    console.log("⚡ Serving from cache");
    return res.json(ipfsCache.get(cid));
  }
  
  const gateways = [
    `https://nftstorage.link/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
    `https://ipfs.infura.io/ipfs/${cid}`,
  ];
  
  try {
    let response;
    for (const url of gateways) {
      console.log("🌐 Trying", url);
      try {
        response = await fetch(url, {
          timeout: 10000,  // 10 second timeout
          headers: { 'Accept': 'application/json,*/*' }
        });
        
        if (response.ok) {
          console.log(`✅ Success from ${url}`);
          break;
        }
        console.warn(`⚠️ Failed at ${url}: ${response.status}`);
      } catch (err) {
        console.warn(`⚠️ Fetch error at ${url}:`, err.message);
      }
    }
    
    if (!response || !response.ok) {
      throw new Error("All IPFS gateways failed");
    }
    
    const contentType = response.headers.get("content-type") || "";
    
    // Handle JSON response
    if (contentType.includes("application/json")) {
      const data = await response.json();
      ipfsCache.set(cid, data); // Cache the response
      return res.json(data);
    }
    
    // For non-JSON responses (like audio files), proxy the raw content
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', contentType);
    return res.send(Buffer.from(buffer));
    
  } catch (e) {
    console.error("❌ Proxy fetch failed:", e.message);
    res.status(500).json({ error: "Could not fetch from IPFS", message: e.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});