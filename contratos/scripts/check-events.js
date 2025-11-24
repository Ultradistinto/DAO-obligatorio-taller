const hre = require("hardhat");

async function main() {
    console.log("🔍 Revisando eventos del multisig\n");

    const addresses = require('../deployed-addresses.json');
    const multisig = await hre.ethers.getContractAt("SimpleMultiSig", addresses.multisigOwner);

    // Ver eventos de confirmación
    console.log("📋 Eventos TransactionConfirmed:");
    const confirmFilter = multisig.filters.TransactionConfirmed();
    const confirmEvents = await multisig.queryFilter(confirmFilter);

    for (const event of confirmEvents) {
        console.log(`   TxId: ${event.args.txId}, Owner: ${event.args.owner}`);
    }

    console.log("\n📋 Eventos TransactionSubmitted:");
    const submitFilter = multisig.filters.TransactionSubmitted();
    const submitEvents = await multisig.queryFilter(submitFilter);

    for (const event of submitEvents) {
        console.log(`   TxId: ${event.args.txId}`);
        console.log(`   To: ${event.args.to}`);
        console.log(`   Value: ${event.args.value}`);
        console.log(`   Data: ${event.args.data}`);
    }

    console.log("\n📋 Eventos TransactionExecuted:");
    const execFilter = multisig.filters.TransactionExecuted();
    const execEvents = await multisig.queryFilter(execFilter);

    if (execEvents.length === 0) {
        console.log("   ❌ NINGUNO - La transacción NO se ejecutó");
    } else {
        for (const event of execEvents) {
            console.log(`   TxId: ${event.args.txId}`);
        }
    }

    // Ahora vamos a intentar ejecutar manualmente para ver el error
    console.log("\n🧪 Intentando ejecutar la transacción manualmente...");

    const [deployer, owner1, owner2] = await hre.ethers.getSigners();

    try {
        const tx = await multisig.connect(owner1).executeTransaction(0);
        await tx.wait();
        console.log("   ✅ Ejecución exitosa");
    } catch (error) {
        console.log("   ❌ Error al ejecutar:");
        console.log("   ", error.message);

        // Ver si podemos decodificar el error
        if (error.data) {
            console.log("\n   Error data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
