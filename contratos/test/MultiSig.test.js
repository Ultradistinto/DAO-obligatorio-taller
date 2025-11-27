const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleMultiSig", function () {
  let multiSig;
  let owner1, owner2, owner3, nonOwner;
  let targetContract;

  beforeEach(async function () {
    [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();

    // Deploy multisig con 3 owners, 2 confirmaciones requeridas
    const MultiSig = await ethers.getContractFactory("SimpleMultiSig");
    multiSig = await MultiSig.deploy(
      [owner1.address, owner2.address, owner3.address],
      2 // requiredConfirmations
    );

    // Deploy un contrato simple para testear llamadas
    const MockToken = await ethers.getContractFactory("DAOToken");
    targetContract = await MockToken.deploy();
  });

  describe("Deployment", function () {
    it("Debería configurar los owners correctamente", async function () {
      const owners = await multiSig.owners();
      expect(owners).to.have.lengthOf(3);
      expect(owners).to.include(owner1.address);
      expect(owners).to.include(owner2.address);
      expect(owners).to.include(owner3.address);
    });

    it("Debería configurar required confirmations", async function () {
      expect(await multiSig._requiredConfirmations()).to.equal(2);
    });

    it("Debería revertir si no hay owners", async function () {
      const MultiSig = await ethers.getContractFactory("SimpleMultiSig");
      await expect(
        MultiSig.deploy([], 1)
      ).to.be.revertedWithCustomError(multiSig, "OwnersRequired");
    });

    it("Debería revertir si required es 0", async function () {
      const MultiSig = await ethers.getContractFactory("SimpleMultiSig");
      await expect(
        MultiSig.deploy([owner1.address], 0)
      ).to.be.revertedWithCustomError(multiSig, "InvalidRequiredConfirmations");
    });

    it("Debería revertir si required > owners", async function () {
      const MultiSig = await ethers.getContractFactory("SimpleMultiSig");
      await expect(
        MultiSig.deploy([owner1.address], 2)
      ).to.be.revertedWithCustomError(multiSig, "InvalidRequiredConfirmations");
    });
  });

  describe("Submit Transaction", function () {
    it("Owner debería poder proponer transacción", async function () {
      const data = targetContract.interface.encodeFunctionData("mint", [
        owner1.address,
        ethers.parseEther("100")
      ]);

      await expect(
        multiSig.connect(owner1).submitTransaction(targetContract.target, 0, data)
      ).to.emit(multiSig, "TransactionSubmitted")
        .withArgs(0, targetContract.target, 0, data);

      expect(await multiSig.transactionCount()).to.equal(1);
    });

    it("Non-owner NO debería poder proponer", async function () {
      const data = "0x";

      await expect(
        multiSig.connect(nonOwner).submitTransaction(owner1.address, 0, data)
      ).to.be.revertedWithCustomError(multiSig, "NotAnOwner");
    });

    it("Debería permitir proponer múltiples transacciones", async function () {
      await multiSig.connect(owner1).submitTransaction(owner1.address, 0, "0x");
      await multiSig.connect(owner2).submitTransaction(owner2.address, 0, "0x");

      expect(await multiSig.transactionCount()).to.equal(2);
    });
  });

  describe("Confirm Transaction", function () {
    beforeEach(async function () {
      // Proponer una transacción
      await multiSig.connect(owner1).submitTransaction(owner1.address, 0, "0x");
    });

    it("Owner debería poder confirmar transacción", async function () {
      await expect(
        multiSig.connect(owner1).confirmTransaction(0)
      ).to.emit(multiSig, "TransactionConfirmed")
        .withArgs(0, owner1.address);

      expect(await multiSig.confirmations(0)).to.equal(1);
    });

    it("Non-owner NO debería poder confirmar", async function () {
      await expect(
        multiSig.connect(nonOwner).confirmTransaction(0)
      ).to.be.revertedWithCustomError(multiSig, "NotAnOwner");
    });

    it("Debería revertir si tx no existe", async function () {
      await expect(
        multiSig.connect(owner1).confirmTransaction(999)
      ).to.be.revertedWithCustomError(multiSig, "InvalidTransaction");
    });

    it("Múltiples owners deberían poder confirmar", async function () {
      await multiSig.connect(owner1).confirmTransaction(0);
      await multiSig.connect(owner2).confirmTransaction(0);

      expect(await multiSig.confirmations(0)).to.equal(2);
    });

    it("Mismo owner puede confirmar solo una vez", async function () {
      await multiSig.connect(owner1).confirmTransaction(0);
      await multiSig.connect(owner1).confirmTransaction(0);

      // Confirmaciones no deberían incrementar
      expect(await multiSig.confirmations(0)).to.equal(1);
    });
  });

  describe("Execute Transaction", function () {
    it("Debería ejecutar cuando tenga suficientes confirmaciones", async function () {
      // Enviar ETH al multisig
      await owner1.sendTransaction({
        to: multiSig.target,
        value: ethers.parseEther("1.0")
      });

      // Proponer enviar ETH
      const txId = 0;
      await multiSig.connect(owner1).submitTransaction(
        nonOwner.address,
        ethers.parseEther("0.5"),
        "0x"
      );

      // Confirmar con 2 owners
      await multiSig.connect(owner1).confirmTransaction(txId);

      const balanceBefore = await ethers.provider.getBalance(nonOwner.address);

      // La segunda confirmación debería auto-ejecutar
      await expect(
        multiSig.connect(owner2).confirmTransaction(txId)
      ).to.emit(multiSig, "TransactionExecuted")
        .withArgs(txId);

      const balanceAfter = await ethers.provider.getBalance(nonOwner.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.5"));
    });

    it("NO debería ejecutar sin suficientes confirmaciones", async function () {
      await multiSig.connect(owner1).submitTransaction(owner1.address, 0, "0x");
      await multiSig.connect(owner1).confirmTransaction(0);

      await expect(
        multiSig.connect(owner1).executeTransaction(0)
      ).to.be.revertedWithCustomError(multiSig, "NotEnoughConfirmations");
    });

    it("NO debería ejecutar tx ya ejecutada", async function () {
      // Enviar ETH al multisig
      await owner1.sendTransaction({
        to: multiSig.target,
        value: ethers.parseEther("1.0")
      });

      await multiSig.connect(owner1).submitTransaction(owner1.address, 0, "0x");
      await multiSig.connect(owner1).confirmTransaction(0);
      await multiSig.connect(owner2).confirmTransaction(0);

      // Intentar ejecutar de nuevo
      await expect(
        multiSig.connect(owner1).executeTransaction(0)
      ).to.be.revertedWithCustomError(multiSig, "AlreadyExecuted");
    });

    it("Debería ejecutar llamada a contrato externo", async function () {
      // Transferir ownership del token al multisig
      await targetContract.transferOwnership(multiSig.target);

      // Preparar data para mint
      const mintData = targetContract.interface.encodeFunctionData("mint", [
        owner1.address,
        ethers.parseEther("1000")
      ]);

      // Proponer mint
      await multiSig.connect(owner1).submitTransaction(
        targetContract.target,
        0,
        mintData
      );

      // Confirmar y ejecutar
      await multiSig.connect(owner1).confirmTransaction(0);
      await multiSig.connect(owner2).confirmTransaction(0);

      // Verificar que se minteó
      expect(await targetContract.balanceOf(owner1.address))
        .to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Get Transaction Details", function () {
    it("Debería retornar detalles de transacción", async function () {
      const to = owner1.address;
      const value = ethers.parseEther("1.0");
      const data = "0x1234";

      await multiSig.connect(owner1).submitTransaction(to, value, data);

      const [txTo, txValue, txData, executed] = await multiSig.getTransaction(0);

      expect(txTo).to.equal(to);
      expect(txValue).to.equal(value);
      expect(txData).to.equal(data);
      expect(executed).to.equal(false);
    });
  });

  describe("Receive ETH", function () {
    it("Debería poder recibir ETH", async function () {
      await expect(
        owner1.sendTransaction({
          to: multiSig.target,
          value: ethers.parseEther("1.0")
        })
      ).to.not.be.reverted;

      expect(await ethers.provider.getBalance(multiSig.target))
        .to.equal(ethers.parseEther("1.0"));
    });
  });

  describe("Edge Cases", function () {
    it("Debería manejar required = 1 correctamente", async function () {
      const MultiSig = await ethers.getContractFactory("SimpleMultiSig");
      const singleSig = await MultiSig.deploy([owner1.address], 1);

      await singleSig.connect(owner1).submitTransaction(owner1.address, 0, "0x");

      // Debería auto-ejecutar con 1 confirmación
      await expect(
        singleSig.connect(owner1).confirmTransaction(0)
      ).to.emit(singleSig, "TransactionExecuted");
    });

    it("Debería manejar required = total owners", async function () {
      const MultiSig = await ethers.getContractFactory("SimpleMultiSig");
      const strictSig = await MultiSig.deploy(
        [owner1.address, owner2.address],
        2
      );

      await strictSig.connect(owner1).submitTransaction(owner1.address, 0, "0x");
      await strictSig.connect(owner1).confirmTransaction(0);

      // No debería ejecutar con solo 1 de 2
      const [,,, executed] = await strictSig.getTransaction(0);
      expect(executed).to.equal(false);

      // Debería ejecutar con ambos
      await expect(
        strictSig.connect(owner2).confirmTransaction(0)
      ).to.emit(strictSig, "TransactionExecuted");
    });
  });
});
