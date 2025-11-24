const hre = require("hardhat");

async function main() {
    console.log("🏦 Mintear tokens via Multisig\n");

    // Cargar addresses deployadas
    const addresses = require('../deployed-addresses.json');

    // Obtener los signers (owner1 y owner2 son owners del multisig)
    const [deployer, owner1, owner2, owner3] = await hre.ethers.getSigners();

    console.log("📋 Información:");
    console.log("   Multisig Owner:", addresses.multisigOwner);
    console.log("   DAO:", addresses.dao);
    console.log("   Token:", addresses.token);
    console.log("   Owner1:", owner1.address);
    console.log("   Owner2:", owner2.address);
    console.log("\n");

    // Conectar a los contratos
    const multisig = await hre.ethers.getContractAt("SimpleMultiSig", addresses.multisigOwner);
    const dao = await hre.ethers.getContractAt("DAO", addresses.dao);
    const token = await hre.ethers.getContractAt("DAOToken", addresses.token);

    // Verificar que el DAO es el owner del token
    const tokenOwner = await token.owner();
    console.log("✅ Token owner:", tokenOwner);
    console.log("✅ DAO address:", addresses.dao);
    console.log("✅ Matches:", tokenOwner === addresses.dao, "\n");

    // Verificar que el Multisig es el owner del DAO
    const daoOwner = await dao.owner();
    console.log("✅ DAO owner:", daoOwner);
    console.log("✅ Multisig address:", addresses.multisigOwner);
    console.log("✅ Matches:", daoOwner === addresses.multisigOwner, "\n");

    // ============ MINTEAR 1,000,000 TOKENS AL DAO ============

    const amountToMint = hre.ethers.parseEther("1000000"); // 1 millón de tokens

    console.log("💰 Minteando", hre.ethers.formatEther(amountToMint), "tokens al DAO...\n");

    // Preparar la llamada: mintTokens(to, amount)
    const mintData = dao.interface.encodeFunctionData("mintTokens", [
        addresses.dao,  // Mintear al DAO
        amountToMint
    ]);

    // PASO 1: Owner1 propone la transacción
    console.log("🔹 Paso 1: Owner1 propone la transacción...");
    const tx1 = await multisig.connect(owner1).submitTransaction(
        addresses.dao,  // target: DAO
        0,              // value: 0 ETH
        mintData        // data: llamada a mintTokens()
    );
    const receipt1 = await tx1.wait();
    console.log("   ✅ Transacción propuesta. Hash:", receipt1.hash);

    // Obtener el ID de la transacción (es el último índice)
    const txCount = await multisig.transactionCount();
    const txId = txCount - 1n;
    console.log("   📝 Transaction ID:", txId.toString(), "\n");

    // PASO 2: Owner1 confirma su propia transacción (primera confirmación)
    console.log("🔹 Paso 2: Owner1 confirma la transacción...");
    const tx2 = await multisig.connect(owner1).confirmTransaction(txId);
    const receipt2 = await tx2.wait();
    console.log("   ✅ Primera confirmación (1 de 2). Hash:", receipt2.hash, "\n");

    // PASO 3: Owner2 confirma la transacción (segunda confirmación - ejecuta automáticamente)
    console.log("🔹 Paso 3: Owner2 confirma la transacción...");
    const tx3 = await multisig.connect(owner2).confirmTransaction(txId);
    const receipt3 = await tx3.wait();
    console.log("   ✅ Segunda confirmación (2 de 2). Hash:", receipt3.hash);
    console.log("   ✅ Transacción ejecutada automáticamente\n");

    // Verificar el balance del DAO
    const daoBalance = await token.balanceOf(addresses.dao);
    console.log("=" .repeat(60));
    console.log("🎉 ¡MINTEO COMPLETADO!");
    console.log("   Balance del DAO:", hre.ethers.formatEther(daoBalance), "DAOG");
    console.log("   Total Supply:", hre.ethers.formatEther(await token.totalSupply()), "DAOG");
    console.log("=" .repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
