import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the SecretNumberGame address").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { deployments } = hre;

  const secretNumberGame = await deployments.get("SecretNumberGame");

  console.log("SecretNumberGame address is " + secretNumberGame.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:game-status
 *   - npx hardhat --network sepolia task:game-status
 */
task("task:game-status", "Checks if the game is currently active")
  .addOptionalParam("address", "Optionally specify the SecretNumberGame contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const SecretNumberGameDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecretNumberGame");
    console.log(`SecretNumberGame: ${SecretNumberGameDeployment.address}`);

    const secretNumberGameContract = await ethers.getContractAt("SecretNumberGame", SecretNumberGameDeployment.address);

    const isActive = await secretNumberGameContract.getGameStatus();
    console.log(`Game Status: ${isActive ? "ACTIVE" : "INACTIVE"}`);

    const admin = await secretNumberGameContract.admin();
    console.log(`Game Admin: ${admin}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:set-secret --secret 42
 *   - npx hardhat --network sepolia task:set-secret --secret 42
 */
task("task:set-secret", "Sets the secret number for the game (admin only)")
  .addOptionalParam("address", "Optionally specify the SecretNumberGame contract address")
  .addParam("secret", "The secret number (1-100)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const secretValue = parseInt(taskArguments.secret);
    if (!Number.isInteger(secretValue) || secretValue < 1 || secretValue > 100) {
      throw new Error(`Secret must be an integer between 1 and 100`);
    }

    await fhevm.initializeCLIApi();

    const SecretNumberGameDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecretNumberGame");
    console.log(`SecretNumberGame: ${SecretNumberGameDeployment.address}`);

    const signers = await ethers.getSigners();

    const secretNumberGameContract = await ethers.getContractAt("SecretNumberGame", SecretNumberGameDeployment.address);

    // Encrypt the secret value
    const encryptedSecret = await fhevm
      .createEncryptedInput(SecretNumberGameDeployment.address, signers[0].address)
      .add8(secretValue)
      .encrypt();

    console.log(`Setting secret number (encrypted)...`);
    const tx = await secretNumberGameContract
      .connect(signers[0])
      .setSecretNumber(encryptedSecret.handles[0], encryptedSecret.inputProof);

    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`✅ Secret number set successfully! Game is now ACTIVE.`);
    console.log(`⚠️  The secret number is encrypted and cannot be viewed.`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:make-guess --guess 42
 *   - npx hardhat --network sepolia task:make-guess --guess 42
 */
task("task:make-guess", "Make a guess at the secret number")
  .addOptionalParam("address", "Optionally specify the SecretNumberGame contract address")
  .addParam("guess", "Your guess (1-100)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const guessValue = parseInt(taskArguments.guess);
    if (!Number.isInteger(guessValue) || guessValue < 1 || guessValue > 100) {
      throw new Error(`Guess must be an integer between 1 and 100`);
    }

    await fhevm.initializeCLIApi();

    const SecretNumberGameDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecretNumberGame");
    console.log(`SecretNumberGame: ${SecretNumberGameDeployment.address}`);

    const signers = await ethers.getSigners();

    const secretNumberGameContract = await ethers.getContractAt("SecretNumberGame", SecretNumberGameDeployment.address);

    // Check if game is active
    const isActive = await secretNumberGameContract.getGameStatus();
    if (!isActive) {
      console.log("❌ Game is not active! Admin needs to set a secret number first.");
      return;
    }

    // Check if player already won
    const stats = await secretNumberGameContract.connect(signers[0]).getMyStats();
    if (stats.won) {
      console.log("🎉 You already won this game! Wait for admin to reset.");
      return;
    }

    // Encrypt the guess
    const encryptedGuess = await fhevm
      .createEncryptedInput(SecretNumberGameDeployment.address, signers[0].address)
      .add8(guessValue)
      .encrypt();

    console.log(`Making guess: ${guessValue}...`);
    const tx = await secretNumberGameContract
      .connect(signers[0])
      .makeGuess(encryptedGuess.handles[0], encryptedGuess.inputProof);

    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    // Wait a moment for the callback to process
    console.log(`Waiting for result...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get updated stats
    const updatedStats = await secretNumberGameContract.connect(signers[0]).getMyStats();

    console.log(`\n📊 Result:`);
    console.log(`   Guess #${updatedStats.guesses}: ${updatedStats.correct ? "✅ CORRECT!" : "❌ Wrong"}`);
    console.log(`   Total Guesses: ${updatedStats.guesses}`);

    if (updatedStats.won) {
      console.log(`   🎉 CONGRATULATIONS! You won the game!`);
    } else {
      console.log(`   💡 Try again!`);
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:get-stats
 *   - npx hardhat --network sepolia task:get-stats
 */
task("task:get-stats", "Get your game statistics")
  .addOptionalParam("address", "Optionally specify the SecretNumberGame contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const SecretNumberGameDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecretNumberGame");
    console.log(`SecretNumberGame: ${SecretNumberGameDeployment.address}`);

    const signers = await ethers.getSigners();

    const secretNumberGameContract = await ethers.getContractAt("SecretNumberGame", SecretNumberGameDeployment.address);

    const stats = await secretNumberGameContract.connect(signers[0]).getMyStats();

    console.log(`\n📊 Your Statistics:`);
    console.log(`   Player Address: ${signers[0].address}`);
    console.log(`   Total Guesses: ${stats.guesses}`);
    console.log(`   Last Guess: ${stats.guesses > 0 ? (stats.correct ? "✅ Correct" : "❌ Wrong") : "No guesses yet"}`);
    console.log(`   Game Status: ${stats.won ? "🎉 WON!" : "🎮 Playing"}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:reset-game
 *   - npx hardhat --network sepolia task:reset-game
 */
task("task:reset-game", "Reset the game (admin only)")
  .addOptionalParam("address", "Optionally specify the SecretNumberGame contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const SecretNumberGameDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecretNumberGame");
    console.log(`SecretNumberGame: ${SecretNumberGameDeployment.address}`);

    const signers = await ethers.getSigners();

    const secretNumberGameContract = await ethers.getContractAt("SecretNumberGame", SecretNumberGameDeployment.address);

    console.log(`Resetting game...`);
    const tx = await secretNumberGameContract.connect(signers[0]).resetGame();

    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`✅ Game has been reset successfully!`);
    console.log(`💡 Use 'task:set-secret' to start a new game.`);
  });
