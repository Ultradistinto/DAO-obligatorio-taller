const hre = require("hardhat");

async function main() {
    const addresses = require('../deployed-addresses.json');

    const [deployer, owner1, owner2] = await hre.ethers.getSigners();

    const multisig = await hre.ethers.getContractAt("SimpleMultiSig", addresses.multisigOwner);

    const dao = await hre.ethers.getContractAt("DAO", addresses.dao);

    const mintData = dao.interface.encodeFunctionData("mintTokens", [
        addresses.dao,
        hre.ethers.parseEther("1000000")
    ]);

    console.log("🔹 Owner1 propone transacción...");
    const tx1 = await multisig.connect(owner1).submitTransaction(
        addresses.dao,
        0,        
        mintData
    );
    await tx1.wait();

    console.log("🔹 Owner2 confirma transacción...");
    const tx2 = await multisig.connect(owner2).confirmTransaction(0);
    await tx2.wait();

    console.log("✅ Tokens minteados!");
}

main();
