const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Contract = await ethers.getContractFactory("ScepticSimple");
  const contract = await Contract.deploy("Sceptic MVP");
  
  console.log("Contract Address:", await contract.getAddress());
  console.log("Tx Hash:", contract.deploymentTransaction().hash);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 