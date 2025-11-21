const hre = require("hardhat");

  async function main() {
    console.log("🚀 Iniciando deployment...\n");

    // Obtener signers (cuentas de prueba)
    const [deployer, owner1, owner2, owner3, panicOwner1, panicOwner2] = await hre.ethers.getSigners();

    console.log("📝 Deployer address:", deployer.address);
    console.log("💰 Deployer balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

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
      [owner1.address, owner2.address, owner3.address],
      2 // 2 de 3 confirmaciones requeridas
    );
    await multisigOwner.waitForDeployment();
    const multisigOwnerAddress = await multisigOwner.getAddress();
    console.log("✅ Multisig Owner deployed to:", multisigOwnerAddress);
    console.log("   Owners:", owner1.address, owner2.address, owner3.address);
    console.log("   Required confirmations: 2\n");

    // ============ 3. Deploy Multisig Panic ============
    console.log("📄 Deployando Multisig Panic (2 owners, 1 required)...");
    const multisigPanic = await Multisig.deploy(
      [panicOwner1.address, panicOwner2.address],
      1 // 1 de 2 confirmaciones requeridas (más rápido para emergencias)
    );
    await multisigPanic.waitForDeployment();
    const multisigPanicAddress = await multisigPanic.getAddress();
    console.log("✅ Multisig Panic deployed to:", multisigPanicAddress);
    console.log("   Owners:", panicOwner1.address, panicOwner2.address);
    console.log("   Required confirmations: 1\n");

    // ============ 4. Deploy DAO ============
    console.log("📄 Deployando DAO...");

    // Parámetros de la DAO
    const tokenPrice = hre.ethers.parseEther("0.001"); // 0.001 ETH por token
    const tokensPerVP = hre.ethers.parseEther("1000"); // 1000 tokens = 1 VP
    const minStakeToVote = hre.ethers.parseEther("100"); // Mínimo 100 tokens para votar
    const minStakeToPropose = hre.ethers.parseEther("500"); // Mínimo 500 tokens para proponer
    const stakingLockTime = 60 * 5; // 5 minutos (para testing)
    const proposalDuration = 60 * 10; // 10 minutos (para testing)

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


    // ============ 6. Resumen ============
    console.log("=" .repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETED!\n");
    console.log("📋 Contract Addresses:");
    console.log("   DAOToken:", tokenAddress);
    console.log("   Multisig Owner:", multisigOwnerAddress);
    console.log("   Multisig Panic:", multisigPanicAddress);
    console.log("   DAO:", daoAddress);
    console.log("\n👥 Test Accounts:");
    console.log("   Deployer:", deployer.address);
    console.log("   Owner 1:", owner1.address);
    console.log("   Owner 2:", owner2.address);
    console.log("   Owner 3:", owner3.address);
    console.log("   Panic Owner 1:", panicOwner1.address);
    console.log("   Panic Owner 2:", panicOwner2.address);
    console.log("=" .repeat(60));

    // Guardar addresses en un archivo para el frontend
    const fs = require('fs');
    const addresses = {
      token: tokenAddress,
      dao: daoAddress,
      multisigOwner: multisigOwnerAddress,
      multisigPanic: multisigPanicAddress,
      accounts: {
        deployer: deployer.address,
        owner1: owner1.address,
        owner2: owner2.address,
        owner3: owner3.address,
        panicOwner1: panicOwner1.address,
        panicOwner2: panicOwner2.address
      }
    };

    fs.writeFileSync(
      'deployed-addresses.json',
      JSON.stringify(addresses, null, 2)
    );
    console.log("\n💾 Addresses saved to deployed-addresses.json");
  }

  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });