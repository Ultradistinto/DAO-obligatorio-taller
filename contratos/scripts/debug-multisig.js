const hre = require("hardhat");

async function main() {
    console.log("🔍 Diagnóstico de la transacción multisig\n");

    const addresses = require('../deployed-addresses.json');
    const [deployer, owner1, owner2] = await hre.ethers.getSigners();

    const multisig = await hre.ethers.getContractAt("SimpleMultiSig", addresses.multisigOwner);
    const dao = await hre.ethers.getContractAt("DAO", addresses.dao);
    const token = await hre.ethers.getContractAt("DAOToken", addresses.token);

    // Ver el estado de la transacción 0
    const txCount = await multisig.transactionCount();
    console.log("📊 Total de transacciones en multisig:", txCount.toString());

    if (txCount > 0n) {
        // Obtener detalles de la primera transacción (índice 0)
        // Como no hay un getter público, vamos a intentar obtener la info del evento

        const filter = multisig.filters.TransactionExecuted();
        const events = await multisig.queryFilter(filter);

        if (events.length > 0) {
            console.log("✅ Evento TransactionExecuted encontrado:");
            console.log("   TxId:", events[0].args.txId.toString());
            console.log("   Hash:", events[0].transactionHash);
        } else {
            console.log("❌ NO se encontró evento TransactionExecuted");
            console.log("   Esto significa que la transacción NO se ejecutó correctamente\n");
        }

        // Ver si hubo errores
        const failFilter = multisig.filters.ExecutionFailed?.();
        if (failFilter) {
            const failEvents = await multisig.queryFilter(failFilter);
            if (failEvents.length > 0) {
                console.log("❌ Error encontrado:");
                console.log(failEvents[0]);
            }
        }
    }

    // Verificar ownership
    console.log("\n📋 Verificación de ownership:");
    const tokenOwner = await token.owner();
    const daoOwner = await dao.owner();

    console.log("   Token owner:", tokenOwner);
    console.log("   DAO address:", addresses.dao);
    console.log("   ¿DAO es owner del token?", tokenOwner === addresses.dao);

    console.log("\n   DAO owner:", daoOwner);
    console.log("   Multisig address:", addresses.multisigOwner);
    console.log("   ¿Multisig es owner del DAO?", daoOwner === addresses.multisigOwner);

    // Intentar mintear directamente desde el deployer para ver el error
    console.log("\n🧪 Intentando mintear directamente (esto debería fallar):");
    try {
        const tx = await dao.connect(deployer).mintTokens(addresses.dao, hre.ethers.parseEther("100"));
        await tx.wait();
        console.log("   ✅ Minteo exitoso (raro...)");
    } catch (error) {
        console.log("   ❌ Error esperado:", error.message.split('\n')[0]);
    }

    console.log("\n📊 Balances actuales:");
    console.log("   DAO balance:", hre.ethers.formatEther(await token.balanceOf(addresses.dao)), "DAOG");
    console.log("   Total supply:", hre.ethers.formatEther(await token.totalSupply()), "DAOG");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
