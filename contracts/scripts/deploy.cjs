const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1. Token Kontratını Deploy Et
  const Token = await ethers.getContractFactory(
    "contracts/ScepticToken.sol:ScepticToken"
  );
  const token = await Token.deploy();
  console.log("Token Address:", token.target);

  // 2. Audit Kontratını Deploy Et
  const Audit = await ethers.getContractFactory(
    "contracts/ScepticAudit.sol:ScepticAudit"
  );
  const audit = await Audit.deploy(
    token.target,
    ethers.parseEther("100"),
    66
  );
  console.log("Audit Address:", audit.target);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 