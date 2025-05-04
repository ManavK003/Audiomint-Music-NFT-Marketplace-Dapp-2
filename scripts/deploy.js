// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // ✅ YodaCoin deploy
  const YodaFactory = await hre.ethers.getContractFactory("YODA");
  const yoda = await YodaFactory.deploy("YodaCoin", "YODA", 1000000);
  // Wait for the transaction to be mined
  await yoda.waitForDeployment();
  console.log("✅ YodaCoin deployed at:", await yoda.getAddress());

  // ✅ MusicNFT deploy
  const MusicNFT = await hre.ethers.getContractFactory("MusicNFT");
  const musicNFT = await MusicNFT.deploy();
  // Wait for the transaction to be mined
  await musicNFT.waitForDeployment();
  console.log("✅ MusicNFT deployed at:", await musicNFT.getAddress());

  // ✅ Marketplace deploy
  const Marketplace = await hre.ethers.getContractFactory("MusicMarketplace");
  const market = await Marketplace.deploy(await yoda.getAddress(), await musicNFT.getAddress());
  // Wait for the transaction to be mined
  await market.waitForDeployment();
  console.log("✅ Marketplace deployed at:", await market.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});