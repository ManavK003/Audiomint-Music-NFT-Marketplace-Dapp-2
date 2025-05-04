// /pages/api/upload.js
import formidable from "formidable";
import fs from "fs";
import { NFTStorage, File } from "nft.storage";

export const config = {
  api: {
    bodyParser: false,
  },
};

const NFT_STORAGE_API_KEY = process.env.NFT_STORAGE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload error" });

    const { songName, artist, description } = fields;
    const audioPath = files.audioFile.filepath;
    const audioData = fs.readFileSync(audioPath);

    const client = new NFTStorage({ token: NFT_STORAGE_API_KEY });

    const metadata = await client.store({
      name: songName,
      description,
      image: new File([audioData], files.audioFile.originalFilename, {
        type: files.audioFile.mimetype,
      }),
      properties: {
        artist,
        type: "audio",
      },
    });

    return res.status(200).json({ ipfsUrl: `ipfs://${metadata.ipnft}/metadata.json` });
  });
}
