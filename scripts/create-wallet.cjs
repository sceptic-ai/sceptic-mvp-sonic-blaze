const { ethers } = require("hardhat");

async function main() {
  // Yeni cüzdan oluştur
  const wallet = ethers.Wallet.createRandom();
  
  // Cüzdan bilgilerini göster
  console.log("Yeni Cüzdan Bilgileri:");
  console.log("Adres:      ", wallet.address);
  console.log("Private Key:", wallet.privateKey);
  console.log("Mnemonic:   ", wallet.mnemonic.phrase);

  // .env dosyasına kaydet
  const fs = require('fs');
  const envContent = `
DEPLOYER_ADDRESS=${wallet.address}
DEPLOYER_PRIVATE_KEY=${wallet.privateKey}
MNEMONIC="${wallet.mnemonic.phrase}"
`.trim();

  fs.writeFileSync('.env', envContent);
  console.log("\n.env dosyası güncellendi!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 