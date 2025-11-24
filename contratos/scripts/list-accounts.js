const hre = require("hardhat");

async function main() {
    console.log("=" .repeat(80));
    console.log("🔑 CUENTAS DE HARDHAT - LISTA COMPLETA");
    console.log("=" .repeat(80));
    console.log("\n");

    const signers = await hre.ethers.getSigners();

    // Tabla de información
    console.log("📋 INFORMACIÓN GENERAL:");
    console.log(`   Total de cuentas: ${signers.length}`);
    console.log(`   Balance inicial: 10,000 ETH cada una`);
    console.log(`   Network: Hardhat Local (Chain ID: ${hre.network.config.chainId || 31337})\n`);

    console.log("=" .repeat(80));
    console.log("\n");

    // Listar todas las cuentas
    for (let i = 0; i < signers.length; i++) {
        const signer = signers[i];
        const address = await signer.getAddress();
        const balance = await hre.ethers.provider.getBalance(address);

        console.log(`Account #${i}`);
        console.log(`   Address:     ${address}`);

        // Para obtener la private key necesitamos acceder al wallet
        // En Hardhat, podemos obtenerla así:
        if (signer._signingKey) {
            console.log(`   Private Key: ${signer._signingKey().privateKey}`);
        } else if (signer.privateKey) {
            console.log(`   Private Key: ${signer.privateKey}`);
        }

        console.log(`   Balance:     ${hre.ethers.formatEther(balance)} ETH`);
        console.log("");
    }

    console.log("=" .repeat(80));
    console.log("\n");

    // Información específica de roles (según deploy.js)
    const addresses = require('../deployed-addresses.json');

    console.log("👥 ROLES ASIGNADOS:");
    console.log("\n🏛️  Multisig Owner (controla la DAO):");
    console.log("   Account #1 (Owner 1):", addresses.accounts.owner1);
    console.log("   Account #2 (Owner 2):", addresses.accounts.owner2);
    console.log("   Account #3 (Owner 3):", addresses.accounts.owner3);
    console.log("   Requiere: 2 de 3 confirmaciones\n");

    console.log("🚨 Multisig Panic (pánico/tranquilidad):");
    console.log("   Account #4 (Panic Owner 1):", addresses.accounts.panicOwner1);
    console.log("   Account #5 (Panic Owner 2):", addresses.accounts.panicOwner2);
    console.log("   Requiere: 1 de 2 confirmaciones\n");

    console.log("👤 Otras cuentas:");
    console.log("   Account #0 (Deployer):    ", addresses.accounts.deployer);
    console.log("   Account #6-19: Usuarios normales (sin rol asignado)\n");

    console.log("=" .repeat(80));
    console.log("\n");

    console.log("💡 PARA IMPORTAR A METAMASK:");
    console.log("   1. MetaMask → Ícono circular → 'Import account'");
    console.log("   2. Pega la Private Key de la cuenta que quieras");
    console.log("   3. Ponle un nombre descriptivo (ej: 'Hardhat #1 - Owner')");
    console.log("\n");

    console.log("⚠️  ADVERTENCIA:");
    console.log("   Estas private keys son SOLO para desarrollo local.");
    console.log("   NUNCA las uses en mainnet o con fondos reales.");
    console.log("\n");
    console.log("=" .repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
