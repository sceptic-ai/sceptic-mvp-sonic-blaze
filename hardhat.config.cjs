require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

task("create-wallet", "Yeni cüzdan oluşturur")
  .setAction(async () => {
    const wallet = ethers.Wallet.createRandom();
    console.log("Adres:", wallet.address);
    console.log("Private Key:", wallet.privateKey);
    console.log("Mnemonic:", wallet.mnemonic.phrase);
  });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    blaze: {
      url: "https://rpc.blaze.soniclabs.com",
      chainId: 57054,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: {
      sonicTestnet: process.env.SONICSCAN_API_KEY,
      sonicMainnet: process.env.SONICSCAN_API_KEY
    },
    customChains: [
      {
        network: "sonicTestnet",
        chainId: 57054,
        urls: {
          apiURL: "https://api-testnet.sonicscan.org/api",
          browserURL: "https://testnet.sonicscan.org"
        }
      },
      {
        network: "sonicMainnet",
        chainId: 146,
        urls: {
          apiURL: "https://api.sonicscan.org/api",
          browserURL: "https://sonicscan.org"
        }
      }
    ]
  },
  paths: {
    artifacts: "./backend/blockchain/abi"
  }
};
