const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAOToken", function () {
  let daoToken;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Obtener signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy del token
    const DAOToken = await ethers.getContractFactory("DAOToken");
    daoToken = await DAOToken.deploy();
  });

  describe("Deployment", function () {
    it("Debería tener el nombre correcto", async function () {
      expect(await daoToken.name()).to.equal("DAO Governance Token");
    });

    it("Debería tener el símbolo correcto", async function () {
      expect(await daoToken.symbol()).to.equal("DAOG");
    });

    it("Debería tener 18 decimales", async function () {
      expect(await daoToken.decimals()).to.equal(18);
    });

    it("Debería iniciar con supply 0", async function () {
      expect(await daoToken.totalSupply()).to.equal(0);
    });

    it("El owner debería ser quien deployó", async function () {
      expect(await daoToken.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("El owner debería poder mintear tokens", async function () {
      const mintAmount = ethers.parseEther("1000");

      await daoToken.mint(addr1.address, mintAmount);

      expect(await daoToken.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await daoToken.totalSupply()).to.equal(mintAmount);
    });

    it("Debería emitir evento Transfer al mintear", async function () {
      const mintAmount = ethers.parseEther("500");

      await expect(daoToken.mint(addr1.address, mintAmount))
        .to.emit(daoToken, "Transfer")
        .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);
    });

    it("NO debería permitir a non-owner mintear", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(
        daoToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(daoToken, "OwnableUnauthorizedAccount");
    });

    it("Debería permitir mintear múltiples veces", async function () {
      await daoToken.mint(addr1.address, ethers.parseEther("500"));
      await daoToken.mint(addr1.address, ethers.parseEther("300"));

      expect(await daoToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("800"));
    });

    it("Debería mintear a múltiples addresses", async function () {
      await daoToken.mint(addr1.address, ethers.parseEther("500"));
      await daoToken.mint(addr2.address, ethers.parseEther("300"));

      expect(await daoToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("500"));
      expect(await daoToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("300"));
      expect(await daoToken.totalSupply()).to.equal(ethers.parseEther("800"));
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      // Mintear tokens a addr1 para poder transferir
      await daoToken.mint(addr1.address, ethers.parseEther("1000"));
    });

    it("Debería permitir transferir tokens", async function () {
      const transferAmount = ethers.parseEther("100");

      await daoToken.connect(addr1).transfer(addr2.address, transferAmount);

      expect(await daoToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("900"));
      expect(await daoToken.balanceOf(addr2.address)).to.equal(transferAmount);
    });

    it("Debería emitir evento Transfer", async function () {
      const transferAmount = ethers.parseEther("100");

      await expect(daoToken.connect(addr1).transfer(addr2.address, transferAmount))
        .to.emit(daoToken, "Transfer")
        .withArgs(addr1.address, addr2.address, transferAmount);
    });

    it("Debería revertir si no hay suficiente balance", async function () {
      const transferAmount = ethers.parseEther("2000"); // Más de lo que tiene

      await expect(
        daoToken.connect(addr1).transfer(addr2.address, transferAmount)
      ).to.be.revertedWithCustomError(daoToken, "ERC20InsufficientBalance");
    });

    it("Debería permitir transferir todo el balance", async function () {
      const totalBalance = await daoToken.balanceOf(addr1.address);

      await daoToken.connect(addr1).transfer(addr2.address, totalBalance);

      expect(await daoToken.balanceOf(addr1.address)).to.equal(0);
      expect(await daoToken.balanceOf(addr2.address)).to.equal(totalBalance);
    });
  });

  describe("Allowances", function () {
    beforeEach(async function () {
      await daoToken.mint(addr1.address, ethers.parseEther("1000"));
    });

    it("Debería permitir aprobar allowance", async function () {
      const approveAmount = ethers.parseEther("500");

      await daoToken.connect(addr1).approve(addr2.address, approveAmount);

      expect(await daoToken.allowance(addr1.address, addr2.address)).to.equal(approveAmount);
    });

    it("Debería emitir evento Approval", async function () {
      const approveAmount = ethers.parseEther("500");

      await expect(daoToken.connect(addr1).approve(addr2.address, approveAmount))
        .to.emit(daoToken, "Approval")
        .withArgs(addr1.address, addr2.address, approveAmount);
    });

    it("Debería permitir transferFrom con allowance", async function () {
      const approveAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("100");

      await daoToken.connect(addr1).approve(addr2.address, approveAmount);
      await daoToken.connect(addr2).transferFrom(addr1.address, addr2.address, transferAmount);

      expect(await daoToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("900"));
      expect(await daoToken.balanceOf(addr2.address)).to.equal(transferAmount);
    });

    it("Debería revertir transferFrom sin allowance", async function () {
      const transferAmount = ethers.parseEther("100");

      await expect(
        daoToken.connect(addr2).transferFrom(addr1.address, addr2.address, transferAmount)
      ).to.be.revertedWithCustomError(daoToken, "ERC20InsufficientAllowance");
    });

    it("Debería decrementar allowance después de transferFrom", async function () {
      const approveAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("100");

      await daoToken.connect(addr1).approve(addr2.address, approveAmount);
      await daoToken.connect(addr2).transferFrom(addr1.address, addr2.address, transferAmount);

      expect(await daoToken.allowance(addr1.address, addr2.address))
        .to.equal(ethers.parseEther("400"));
    });
  });

  describe("Ownership", function () {
    it("Debería permitir transferir ownership", async function () {
      await daoToken.transferOwnership(addr1.address);

      expect(await daoToken.owner()).to.equal(addr1.address);
    });

    it("Nuevo owner debería poder mintear", async function () {
      await daoToken.transferOwnership(addr1.address);

      await daoToken.connect(addr1).mint(addr2.address, ethers.parseEther("100"));

      expect(await daoToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Viejo owner NO debería poder mintear después de transferir", async function () {
      await daoToken.transferOwnership(addr1.address);

      await expect(
        daoToken.connect(owner).mint(addr2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(daoToken, "OwnableUnauthorizedAccount");
    });

    it("Debería permitir renunciar ownership", async function () {
      await daoToken.renounceOwnership();

      expect(await daoToken.owner()).to.equal(ethers.ZeroAddress);
    });
  });
});
