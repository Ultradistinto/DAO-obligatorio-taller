const hre = require("hardhat");
const { formatEther } = require("ethers");

async function main() {
  const daoAddress = "0x71d49935402aaab22F2c60123D63fe8Bd206dA7B";
  const tokenAddress = "0x3EeC1007885beBfA9a810121490dCD876edaa7eb";

  console.log("\n🔍 Verificando estado de los contratos en Sepolia...\n");

  const DAO = await hre.ethers.getContractAt("DAO", daoAddress);
  const Token = await hre.ethers.getContractAt("DAOToken", tokenAddress);

  try {
    console.log("📊 Parámetros de la DAO:");
    console.log("=".repeat(50));

    const tokenPrice = await DAO.tokenPrice();
    console.log(`Token Price: ${formatEther(tokenPrice)} ETH`);

    const tokensPerVP = await DAO.tokensPerVotingPower();
    console.log(`Tokens per Voting Power: ${formatEther(tokensPerVP)}`);

    const minStakeToVote = await DAO.minStakeToVote();
    console.log(`Min Stake to Vote: ${formatEther(minStakeToVote)} DAOG`);

    const minStakeToPropose = await DAO.minStakeToPropose();
    console.log(`Min Stake to Propose: ${formatEther(minStakeToPropose)} DAOG`);

    const stakingLockTime = await DAO.stakingLockTime();
    console.log(`Staking Lock Time: ${stakingLockTime.toString()} seconds (${Number(stakingLockTime) / 60} minutes)`);

    const proposalDuration = await DAO.proposalDuration();
    console.log(`Proposal Duration: ${proposalDuration.toString()} seconds (${Number(proposalDuration) / 86400} days)`);

    console.log("\n🚨 Estado de Pánico:");
    console.log("=".repeat(50));

    const panicWallet = await DAO.panicWallet();
    console.log(`Panic Wallet: ${panicWallet}`);

    const isPaused = await DAO.isPaused();
    console.log(`DAO está pausada: ${isPaused ? "SÍ ⚠️" : "NO ✅"}`);

    console.log("\n💰 Información de Tokens:");
    console.log("=".repeat(50));

    const daoBalance = await Token.balanceOf(daoAddress);
    console.log(`Balance del DAO: ${formatEther(daoBalance)} DAOG`);

    const treasuryBalance = await hre.ethers.provider.getBalance(daoAddress);
    console.log(`Treasury (ETH): ${formatEther(treasuryBalance)} ETH`);

    console.log("\n📝 Propuestas:");
    console.log("=".repeat(50));

    const proposalCount = await DAO.proposalCount();
    console.log(`Total de propuestas: ${proposalCount.toString()}`);

    console.log("\n✅ Verificación completada!\n");

  } catch (error) {
    console.error("❌ Error al leer el contrato:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
