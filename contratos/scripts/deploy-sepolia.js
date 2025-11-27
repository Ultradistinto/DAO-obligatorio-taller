const hre = require("hardhat");

async function main() {
  console.log("🚀 Iniciando deployment en Sepolia...\n");

  // En Sepolia solo tenemos 1 signer (tu wallet)
  const [deployer] = await hre.ethers.getSigners();

  console.log("📝 Deployer address:", deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // IMPORTANTE: Para testing en Sepolia, usaremos TU address para todos los roles
  // En producción real, usarías diferentes addresses controladas por diferentes personas
  const owner1 = deployer.address;
  const owner2 = deployer.address; // En producción: otra persona
  const owner3 = deployer.address; // En producción: otra persona
  const panicOwner1 = deployer.address;
  const panicOwner2 = deployer.address; // En producción: otra persona

  console.log("⚠️  NOTA: Usando la misma address para todos los owners (testing en Sepolia)");
  console.log("   En producción real, deberías usar addresses diferentes.\n");

  // ============ 1. Deploy Token ============
  console.log("📄 Deployando DAOToken...");
  const DAOToken = await hre.ethers.getContractFactory("DAOToken");
  const token = await DAOToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ DAOToken deployed to:", tokenAddress, "\n");

  // ============ 2. Deploy Multisig Owner ============
  console.log("📄 Deployando Multisig Owner (3 owners, 2 required)...");
  const Multisig = await hre.ethers.getContractFactory("SimpleMultiSig");
  const multisigOwner = await Multisig.deploy(
    [owner1, owner2, owner3],
    2 // 2 de 3 confirmaciones requeridas
  );
  await multisigOwner.waitForDeployment();
  const multisigOwnerAddress = await multisigOwner.getAddress();
  console.log("✅ Multisig Owner deployed to:", multisigOwnerAddress);
  console.log("   Owners:", owner1, owner2, owner3);
  console.log("   Required confirmations: 2\n");

  // ============ 3. Deploy Multisig Panic ============
  console.log("📄 Deployando Multisig Panic (2 owners, 1 required)...");
  const multisigPanic = await Multisig.deploy(
    [panicOwner1, panicOwner2],
    1 // 1 de 2 confirmaciones requeridas (más rápido para emergencias)
  );
  await multisigPanic.waitForDeployment();
  const multisigPanicAddress = await multisigPanic.getAddress();
  console.log("✅ Multisig Panic deployed to:", multisigPanicAddress);
  console.log("   Owners:", panicOwner1, panicOwner2);
  console.log("   Required confirmations: 1\n");

  // ============ 4. Deploy DAO ============
  console.log("📄 Deployando DAO...");

  // Parámetros de la DAO (ajustados para Sepolia testnet)
  const tokenPrice = hre.ethers.parseEther("0.0001"); // 0.0001 ETH por token (más barato para testing)
  const tokensPerVP = hre.ethers.parseEther("100"); // 100 tokens = 1 VP (más accesible)
  const minStakeToVote = hre.ethers.parseEther("10"); // Mínimo 10 tokens para votar
  const minStakeToPropose = hre.ethers.parseEther("50"); // Mínimo 50 tokens para proponer
  const stakingLockTime = 60 * 2; // 2 minutos (para testing rápido en Sepolia)
  const proposalDuration = 60 * 5; // 5 minutos (para testing rápido en Sepolia)

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

  // ============ 5. Configurar Ownership ============
  console.log("⚙️  Configurando ownership...");

  // PRIMERO: Configurar panic wallet ANTES de transferir ownership
  console.log("⚙️  Configurando panic wallet...");
  const txPanic = await dao.setPanicWallet(multisigPanicAddress);
  await txPanic.wait();
  console.log("✅ Panic wallet configured");
  console.log("✅ DAO is now operational (not paused)\n");

  // SEGUNDO: Transferir ownership del token al DAO (para que pueda mintear)
  const txToken = await token.transferOwnership(daoAddress);
  await txToken.wait();
  console.log("✅ Token ownership transferred to DAO");

  // TERCERO: Transferir ownership del DAO al Multisig
  const txDAO = await dao.transferOwnership(multisigOwnerAddress);
  await txDAO.wait();
  console.log("✅ DAO ownership transferred to Multisig Owner\n");

  // ============ 6. Mintear tokens iniciales al DAO ============
  console.log("💰 Minteando tokens iniciales...");
  // El DAO aún puede mintear porque el token le pertenece
  // Minteamos al deployer para testing
  const initialMint = hre.ethers.parseEther("100000"); // 100k tokens

  // Necesitamos hacerlo a través del multisig ahora que el DAO le pertenece
  // Por ahora, solo registramos que hay que hacerlo manualmente
  console.log("⚠️  Nota: Necesitarás mintear tokens manualmente usando el AdminPanel");
  console.log("   Cantidad recomendada inicial:", hre.ethers.formatEther(initialMint), "DAOG\n");

  // ============ 7. Resumen ============
  console.log("=".repeat(60));
  console.log("🎉 DEPLOYMENT EN SEPOLIA COMPLETADO!\n");
  console.log("📋 Contract Addresses:");
  console.log("   DAOToken:", tokenAddress);
  console.log("   Multisig Owner:", multisigOwnerAddress);
  console.log("   Multisig Panic:", multisigPanicAddress);
  console.log("   DAO:", daoAddress);
  console.log("\n👤 Account:");
  console.log("   Deployer (tú):", deployer.address);
  console.log("\n📝 Next Steps:");
  console.log("   1. Verificar contratos en Etherscan");
  console.log("   2. Actualizar frontend con estas addresses");
  console.log("   3. Mintear tokens iniciales usando AdminPanel");
  console.log("   4. Comprar tokens y testear funcionalidad");
  console.log("=".repeat(60));

  // Guardar addresses en un archivo para el frontend
  const fs = require('fs');
  const addresses = {
    network: "sepolia",
    token: tokenAddress,
    dao: daoAddress,
    multisigOwner: multisigOwnerAddress,
    multisigPanic: multisigPanicAddress,
    deployer: deployer.address,
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
