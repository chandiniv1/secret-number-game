import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { SecretNumberGame } from "../types";
import { expect } from "chai";

type Signers = {
  admin: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("SecretNumberGame");
  const secretNumberGameContract = (await factory.deploy()) as SecretNumberGame;
  const secretNumberGameContractAddress = await secretNumberGameContract.getAddress();
  return { secretNumberGameContract, secretNumberGameContractAddress };
}

// Helper function to wait for decryption and process callback
async function waitForDecryptionAndCallback(contract: SecretNumberGame, requestId: bigint) {
  // Wait for the decryption oracle
  await fhevm.awaitDecryptionOracle();

  // Give some time for callback processing
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Verify the request was processed
  const isProcessed = await contract.isRequestProcessed(requestId);
  if (!isProcessed) {
    console.warn(`Warning: Request ${requestId} was not processed by callback`);
  }

  return isProcessed;
}

describe("SecretNumberGame", function () {
  let signers: Signers;
  let secretNumberGameContract: SecretNumberGame;
  let secretNumberGameContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      admin: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ secretNumberGameContract, secretNumberGameContractAddress } = await deployFixture());
  });

  describe("Deployment", function () {
    it("should set the correct admin", async function () {
      const admin = await secretNumberGameContract.admin();
      expect(admin).to.eq(signers.admin.address);
    });

    it("should have game inactive initially", async function () {
      const isActive = await secretNumberGameContract.getGameStatus();
      expect(isActive).to.equal(false);
    });
  });

  describe("Setting Secret Number", function () {
    it("admin should be able to set secret number and activate game", async function () {
      const secretValue = 42;
      const encryptedSecret = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.admin.address)
        .add8(secretValue)
        .encrypt();

      const tx = await secretNumberGameContract
        .connect(signers.admin)
        .setSecretNumber(encryptedSecret.handles[0], encryptedSecret.inputProof);

      await expect(tx).to.emit(secretNumberGameContract, "GameStarted");

      const isActive = await secretNumberGameContract.getGameStatus();
      expect(isActive).to.equal(true);
    });

    it("non-admin should not be able to set secret number", async function () {
      const secretValue = 42;
      const encryptedSecret = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(secretValue)
        .encrypt();

      await expect(
        secretNumberGameContract
          .connect(signers.alice)
          .setSecretNumber(encryptedSecret.handles[0], encryptedSecret.inputProof),
      ).to.be.revertedWith("Only admin can set secret number");
    });
  });

  describe("Making Guesses", function () {
    beforeEach(async function () {
      // Set up a game with secret number 42
      const secretValue = 42;
      const encryptedSecret = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.admin.address)
        .add8(secretValue)
        .encrypt();

      await secretNumberGameContract
        .connect(signers.admin)
        .setSecretNumber(encryptedSecret.handles[0], encryptedSecret.inputProof);
    });

    it("should revert when game is not active", async function () {
      // Reset the game first
      await secretNumberGameContract.connect(signers.admin).resetGame();

      const guessValue = 50;
      const encryptedGuess = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(guessValue)
        .encrypt();

      await expect(
        secretNumberGameContract.connect(signers.alice).makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof),
      ).to.be.revertedWith("Game not active");
    });

    it("should allow player to make a guess and increment counter", async function () {
      const guessValue = 50;
      const encryptedGuess = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(guessValue)
        .encrypt();

      const tx = await secretNumberGameContract
        .connect(signers.alice)
        .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

      await expect(tx).to.emit(secretNumberGameContract, "GuessMade");

      const totalGuesses = await secretNumberGameContract.totalGuesses(signers.alice.address);
      expect(totalGuesses).to.eq(1);
    });

    it("should correctly identify wrong guess", async function () {
      const wrongGuess = 50; // secret is 42
      const encryptedGuess = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(wrongGuess)
        .encrypt();

      const tx = await secretNumberGameContract
        .connect(signers.alice)
        .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

      const receipt = await tx.wait();

      // Get the requestId from the event
      const event = receipt?.logs.find((log: any) => log.fragment && log.fragment.name === "GuessMade");
      expect(event).to.not.be.undefined;

      if (event && "args" in event) {
        const requestId = event.args[2];
        console.log("Request ID:", requestId.toString());

        // Wait for decryption and callback
        const processed = await waitForDecryptionAndCallback(secretNumberGameContract, requestId);
        console.log("Callback processed:", processed);
      }

      // Check the stats
      const stats = await secretNumberGameContract.getMyStats();
      console.log("Stats:", {
        correct: stats.correct,
        guesses: stats.guesses.toString(),
        won: stats.won,
      });

      expect(stats.correct).to.equal(false);
      expect(stats.guesses).to.eq(1);
      expect(stats.won).to.equal(false);
    });

    it("should correctly identify correct guess", async function () {
      const correctGuess = 42; // secret is 42
      const encryptedGuess = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(correctGuess)
        .encrypt();

      const tx = await secretNumberGameContract
        .connect(signers.alice)
        .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

      const receipt = await tx.wait();

      // Get the requestId from the event
      const event = receipt?.logs.find((log: any) => log.fragment && log.fragment.name === "GuessMade");
      expect(event).to.not.be.undefined;

      if (event && "args" in event) {
        const requestId = event.args[2];
        console.log("Request ID:", requestId.toString());

        // Wait for decryption and callback
        const processed = await waitForDecryptionAndCallback(secretNumberGameContract, requestId);
        console.log("Callback processed:", processed);
      }

      const stats = await secretNumberGameContract.getMyStats();
      console.log("Stats:", {
        correct: stats.correct,
        guesses: stats.guesses.toString(),
        won: stats.won,
      });

      expect(stats.correct).to.equal(true);
      expect(stats.guesses).to.eq(1);
      expect(stats.won).to.equal(true);
    });

    it("should prevent players from guessing after they won", async function () {
      const correctGuess = 42;
      const encryptedGuess = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(correctGuess)
        .encrypt();

      const tx = await secretNumberGameContract
        .connect(signers.alice)
        .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

      const receipt = await tx.wait();

      // Get requestId and wait for callback
      const event = receipt?.logs.find((log: any) => log.fragment && log.fragment.name === "GuessMade");
      if (event && "args" in event) {
        const requestId = event.args[2];
        await waitForDecryptionAndCallback(secretNumberGameContract, requestId);
      }

      const encryptedGuess2 = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(correctGuess)
        .encrypt();

      await expect(
        secretNumberGameContract
          .connect(signers.alice)
          .makeGuess(encryptedGuess2.handles[0], encryptedGuess2.inputProof),
      ).to.be.revertedWith("You already won!");
    });

    it("should track multiple guesses from the same player", async function () {
      const wrongGuess1 = 30;
      const wrongGuess2 = 50;
      const wrongGuess3 = 60;

      for (const guess of [wrongGuess1, wrongGuess2, wrongGuess3]) {
        const encryptedGuess = await fhevm
          .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
          .add8(guess)
          .encrypt();

        const tx = await secretNumberGameContract
          .connect(signers.alice)
          .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

        const receipt = await tx.wait();

        // Get requestId and wait for callback
        const event = receipt?.logs.find((log: any) => log.fragment && log.fragment.name === "GuessMade");
        if (event && "args" in event) {
          const requestId = event.args[2];
          await waitForDecryptionAndCallback(secretNumberGameContract, requestId);
        }
      }

      const totalGuesses = await secretNumberGameContract.totalGuesses(signers.alice.address);
      expect(totalGuesses).to.eq(3);
    });

    it("should track different players independently", async function () {
      // Alice makes 2 guesses
      for (let i = 0; i < 2; i++) {
        const encryptedGuess = await fhevm
          .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
          .add8(50)
          .encrypt();

        const tx = await secretNumberGameContract
          .connect(signers.alice)
          .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

        const receipt = await tx.wait();
        const event = receipt?.logs.find((log: any) => log.fragment && log.fragment.name === "GuessMade");
        if (event && "args" in event) {
          const requestId = event.args[2];
          await waitForDecryptionAndCallback(secretNumberGameContract, requestId);
        }
      }

      // Bob makes 3 guesses
      for (let i = 0; i < 3; i++) {
        const encryptedGuess = await fhevm
          .createEncryptedInput(secretNumberGameContractAddress, signers.bob.address)
          .add8(60)
          .encrypt();

        const tx = await secretNumberGameContract
          .connect(signers.bob)
          .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

        const receipt = await tx.wait();
        const event = receipt?.logs.find((log: any) => log.fragment && log.fragment.name === "GuessMade");
        if (event && "args" in event) {
          const requestId = event.args[2];
          await waitForDecryptionAndCallback(secretNumberGameContract, requestId);
        }
      }

      const aliceGuesses = await secretNumberGameContract.totalGuesses(signers.alice.address);
      const bobGuesses = await secretNumberGameContract.totalGuesses(signers.bob.address);

      expect(aliceGuesses).to.eq(2);
      expect(bobGuesses).to.eq(3);
    });
  });

  describe("Game Statistics", function () {
    beforeEach(async function () {
      const secretValue = 42;
      const encryptedSecret = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.admin.address)
        .add8(secretValue)
        .encrypt();

      await secretNumberGameContract
        .connect(signers.admin)
        .setSecretNumber(encryptedSecret.handles[0], encryptedSecret.inputProof);
    });

    it("should return correct stats for player", async function () {
      const guessValue = 42;
      const encryptedGuess = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(guessValue)
        .encrypt();

      const tx = await secretNumberGameContract
        .connect(signers.alice)
        .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

      const receipt = await tx.wait();

      // Get requestId and wait for callback
      const event = receipt?.logs.find((log: any) => log.fragment && log.fragment.name === "GuessMade");
      if (event && "args" in event) {
        const requestId = event.args[2];
        await waitForDecryptionAndCallback(secretNumberGameContract, requestId);
      }

      const stats = await secretNumberGameContract.connect(signers.alice).getMyStats();

      expect(stats.correct).to.equal(true);
      expect(stats.guesses).to.eq(1);
      expect(stats.won).to.equal(true);
    });

    it("should return default stats for player who hasn't guessed", async function () {
      const stats = await secretNumberGameContract.connect(signers.bob).getMyStats();

      expect(stats.correct).to.equal(false);
      expect(stats.guesses).to.eq(0);
      expect(stats.won).to.equal(false);
    });
  });

  describe("Reset Game", function () {
    beforeEach(async function () {
      const secretValue = 42;
      const encryptedSecret = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.admin.address)
        .add8(secretValue)
        .encrypt();

      await secretNumberGameContract
        .connect(signers.admin)
        .setSecretNumber(encryptedSecret.handles[0], encryptedSecret.inputProof);
    });

    it("admin should be able to reset game", async function () {
      const tx = await secretNumberGameContract.connect(signers.admin).resetGame();

      await expect(tx).to.emit(secretNumberGameContract, "GameReset");

      const isActive = await secretNumberGameContract.getGameStatus();
      expect(isActive).to.equal(false);
    });

    it("non-admin should not be able to reset game", async function () {
      await expect(secretNumberGameContract.connect(signers.alice).resetGame()).to.be.revertedWith(
        "Only admin can reset",
      );
    });

    it("should deactivate game after reset", async function () {
      await secretNumberGameContract.connect(signers.admin).resetGame();

      const guessValue = 42;
      const encryptedGuess = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(guessValue)
        .encrypt();

      await expect(
        secretNumberGameContract.connect(signers.alice).makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof),
      ).to.be.revertedWith("Game not active");
    });
  });

  describe("Request Tracking", function () {
    beforeEach(async function () {
      const secretValue = 42;
      const encryptedSecret = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.admin.address)
        .add8(secretValue)
        .encrypt();

      await secretNumberGameContract
        .connect(signers.admin)
        .setSecretNumber(encryptedSecret.handles[0], encryptedSecret.inputProof);
    });

    it("should track request player", async function () {
      const guessValue = 50;
      const encryptedGuess = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(guessValue)
        .encrypt();

      const tx = await secretNumberGameContract
        .connect(signers.alice)
        .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

      const receipt = await tx.wait();

      // Find the GuessMade event to get the requestId
      const event = receipt?.logs.find((log: any) => log.fragment && log.fragment.name === "GuessMade");

      if (event && "args" in event) {
        const requestId = event.args[2];
        const player = await secretNumberGameContract.getRequestPlayer(requestId);
        expect(player).to.eq(signers.alice.address);
      }
    });

    it("should mark request as processed after callback", async function () {
      const guessValue = 42;
      const encryptedGuess = await fhevm
        .createEncryptedInput(secretNumberGameContractAddress, signers.alice.address)
        .add8(guessValue)
        .encrypt();

      const tx = await secretNumberGameContract
        .connect(signers.alice)
        .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

      const receipt = await tx.wait();

      // Get requestId and wait for callback
      const event = receipt?.logs.find((log: any) => log.fragment && log.fragment.name === "GuessMade");

      if (event && "args" in event) {
        const requestId = event.args[2];
        await waitForDecryptionAndCallback(secretNumberGameContract, requestId);

        const isProcessed = await secretNumberGameContract.isRequestProcessed(requestId);
        expect(isProcessed).to.equal(true);
      }
    });
  });
});
