const hre = require("hardhat");

async function main() {
  console.log("🚀 Iniciando deployment en Sepolia...\n");

  const [deployer] = await hre.ethers.getSigners();

  console.log("📝 Deployer address:", deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  const OWNER_1 = "0xB35E992E30c75905031c95BdC8d8dd3Fda8fD812";
  const OWNER_2 = "0xD02F42E9FA0224eE688f99bCfEDB8e600682F9A4";
  const OWNER_3 = "0xed3fBfA06b1fb1a872B29e4298409CE726EAA037";

  console.log("👥 Multisig Owners configurados:");
  console.log("   Owner 1:", OWNER_1);
  console.log("   Owner 2:", OWNER_2);
  console.log("   Owner 3:", OWNER_3, "\n");

  console.log("📄 Deployando DAOToken...");
  const DAOToken = await hre.ethers.getContractFactory("DAOToken");
  const token = await DAOToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ DAOToken deployed to:", tokenAddress, "\n");

  console.log("📄 Deployando Multisig Owner (3 owners, 2 required)...");
  const Multisig = await hre.ethers.getContractFactory("SimpleMultiSig");
  const multisigOwner = await Multisig.deploy(
    [OWNER_1, OWNER_2, OWNER_3],
    2
  );
  await multisigOwner.waitForDeployment();
  const multisigOwnerAddress = await multisigOwner.getAddress();
  console.log("✅ Multisig Owner deployed to:", multisigOwnerAddress);
  console.log("   Owners:", OWNER_1, OWNER_2, OWNER_3);
  console.log("   Required confirmations: 2\n");

  console.log("📄 Deployando Multisig Panic (2 owners, 1 required)...");
  const multisigPanic = await Multisig.deploy(
    [OWNER_1, OWNER_2],
    1
  );
  await multisigPanic.waitForDeployment();
  const multisigPanicAddress = await multisigPanic.getAddress();
  console.log("✅ Multisig Panic deployed to:", multisigPanicAddress);
  console.log("   Owners:", OWNER_1, OWNER_2);
  console.log("   Required confirmations: 1\n");

  console.log("📄 Deployando DAO...");

  const tokenPrice = hre.ethers.parseEther("0.0001");
  const tokensPerVP = hre.ethers.parseEther("100");
  const minStakeToVote = hre.ethers.parseEther("10");
  const minStakeToPropose = hre.ethers.parseEther("50");
  const stakingLockTime = 60 * 2;
  const proposalDuration = 60 * 5;

  const DAO = await hre.ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(
    tokenAddress,
    tokenPrice,
    tokensPerVP,
    minStakeToVote,
    minStakeToPropose,
    stakingLockTime,
    proposalDuration
  );
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("✅ DAO deployed to:", daoAddress);
  console.log("   Token Price:", hre.ethers.formatEther(tokenPrice), "ETH");
  console.log("   Tokens per VP:", hre.ethers.formatEther(tokensPerVP));
  console.log("   Min stake to vote:", hre.ethers.formatEther(minStakeToVote));
  console.log("   Min stake to propose:", hre.ethers.formatEther(minStakeToPropose));
  console.log("   Staking lock time:", stakingLockTime, "seconds");
  console.log("   Proposal duration:", proposalDuration, "seconds\n");

  console.log("⚙️  Configurando ownership...");

  console.log("⚙️  Configurando panic wallet...");
  const txPanic = await dao.setPanicWallet(multisigPanicAddress);
  await txPanic.wait();
  console.log("✅ Panic wallet configured");
  console.log("✅ DAO is now operational (not paused)\n");

  const txToken = await token.transferOwnership(daoAddress);
  await txToken.wait();
  console.log("✅ Token ownership transferred to DAO");

  const txDAO = await dao.transferOwnership(multisigOwnerAddress);
  await txDAO.wait();
  console.log("✅ DAO ownership transferred to Multisig Owner\n");

  console.log("=".repeat(60));
  console.log("🎉 DEPLOYMENT EN SEPOLIA COMPLETADO!\n");
  console.log("📋 Contract Addresses:");
  console.log("   DAOToken:", tokenAddress);
  console.log("   Multisig Owner:", multisigOwnerAddress);
  console.log("   Multisig Panic:", multisigPanicAddress);
  console.log("   DAO:", daoAddress);
  console.log("\n👥 Multisig Owners:");
  console.log("   Owner 1:", OWNER_1);
  console.log("   Owner 2:", OWNER_2);
  console.log("   Owner 3:", OWNER_3);
  console.log("\n📝 Next Steps:");
  console.log("   1. Verificar contratos en Etherscan");
  console.log("   2. Actualizar frontend con estas addresses");
  console.log("   3. Mintear tokens iniciales usando AdminPanel");
  console.log("   4. Probar funcionalidad completa");
  console.log("=".repeat(60));

  const fs = require('fs');
  const addresses = {
    network: "sepolia",
    chainId: 11155111,
    token: tokenAddress,
    dao: daoAddress,
    multisigOwner: multisigOwnerAddress,
    multisigPanic: multisigPanicAddress,
    owners: {
      owner1: OWNER_1,
      owner2: OWNER_2,
      owner3: OWNER_3
    },
    deployedAt: new Date().toISOString(),
    explorerUrls: {
      token: `https://sepolia.etherscan.io/address/${tokenAddress}`,
      dao: `https://sepolia.etherscan.io/address/${daoAddress}`,
      multisigOwner: `https://sepolia.etherscan.io/address/${multisigOwnerAddress}`,
      multisigPanic: `https://sepolia.etherscan.io/address/${multisigPanicAddress}`
    }
  };

  fs.writeFileSync(
    'deployed-addresses-sepolia.json',
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n💾 Addresses saved to deployed-addresses-sepolia.json");
  console.log("\n🔗 Etherscan URLs:");
  console.log("   Token:", addresses.explorerUrls.token);
  console.log("   DAO:", addresses.explorerUrls.dao);
  console.log("   Multisig Owner:", addresses.explorerUrls.multisigOwner);
  console.log("   Multisig Panic:", addresses.explorerUrls.multisigPanic);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
