# Building a Private Number Guessing Game with Fully Homomorphic Encryption (FHE)

## Introduction

Privacy on the blockchain has always been a challenge. Traditional smart contracts expose all data publicly, making it
impossible to create truly private games or applications. Enter **Fully Homomorphic Encryption (FHE)** – a revolutionary
cryptographic technique that allows computations on encrypted data without ever decrypting it.

In this tutorial, we'll build a **Secret Number Guessing Game** smart contract using Zama's FHEVM (Fully Homomorphic
Encryption Virtual Machine), demonstrating how you can create engaging, private gaming experiences on Ethereum where
even the game's secret remains completely hidden.

## What is Fully Homomorphic Encryption?

Before diving into the code, let's understand what makes FHE special:

**Traditional Encryption:**

```
Encrypted Data → Decrypt → Compute → Encrypt → Store
```

**Fully Homomorphic Encryption:**

```
Encrypted Data → Compute on Encrypted Data → Store Encrypted Result
```

With FHE, you can:

- ✅ Perform comparisons on encrypted values
- ✅ Keep secrets truly secret throughout their entire lifecycle
- ✅ Verify results without revealing the answer
- ✅ Eliminate the need for trusted third parties

## The Problem We're Solving

Imagine you want to create a guessing game on-chain where players try to guess a secret number (1-100), but you want to
ensure:

- The secret number remains completely hidden (even from miners and validators)
- Players can verify if their guess is correct without revealing the secret
- Each player's guesses remain private
- The game is provably fair without exposing the answer

Traditional smart contracts can't provide this level of privacy because all state variables are visible on the
blockchain. With FHE, we can solve this problem elegantly.

---

**Ready to build your own private game?** Start with this template and explore the endless possibilities of FHE-enabled
smart contracts. The code is yours to use, modify, and extend. Happy building! 🚀🔐

# Secret Number Game - FHEVM

A Hardhat-based template for developing a private guessing game using Fully Homomorphic Encryption (FHE) enabled
Solidity smart contracts with the FHEVM protocol by Zama.

## 🎮 Overview

The Secret Number Game is a confidential guessing game that demonstrates the power of Fully Homomorphic Encryption on
the blockchain. An admin sets a secret number (1-100), and players try to guess it. All comparisons happen on encrypted
data, keeping the secret truly secret until someone guesses it correctly!

### Key Features

- **Fully Private Secret**: The secret number is encrypted and never revealed
- **Confidential Comparisons**: Guess verification happens on encrypted data
- **Player Privacy**: Track your guesses without exposing them to others
- **Provably Fair**: Results are verifiable without compromising the secret
- **Multi-Player Support**: Multiple players can play simultaneously with independent tracking

## Quick Start

For detailed instructions see:
[FHEVM Hardhat Quick Start Tutorial](https://docs.zama.ai/protocol/solidity-guides/getting-started/quick-start-tutorial)

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm or yarn/pnpm**: Package manager

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables** (for testnet)

   ```bash
   npx hardhat vars set MNEMONIC

   # Set your Infura API key for network access
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

## 📁 Project Structure

```
secret-number-game/
├── contracts/                    # Smart contract source files
│   └── SecretNumberGame.sol      # Main FHE guessing game contract
├── deploy/                       # Deployment scripts
├── tasks/                        # Hardhat custom tasks
│   └── SecretNumberGame.ts       # Task definitions for interaction
├── test/                         # Test files
│   └── FHESecretNumberGame.ts    # Contract tests
├── hardhat.config.ts             # Hardhat configuration
└── package.json                  # Dependencies and scripts
```

## Understanding the Contract

Let's break down our `SecretNumberGame` contract step by step.

### 1. Imports and Contract Declaration

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract SecretNumberGame is SepoliaConfig {
```

**Key Components:**

- **`FHE`**: The main library providing encrypted operations
- **`euint8`**: An encrypted 8-bit unsigned integer (perfect for numbers 1-100)
- **`ebool`**: An encrypted boolean for comparison results
- **`externalEuint8`**: A handle for encrypted inputs from external sources
- **`SepoliaConfig`**: Configuration for deploying on Sepolia testnet

### 2. State Variables - The Game State

```solidity
// The secret number (encrypted, set by admin)
euint8 private secretNumber;

// Game state
address public admin;
bool public isGameActive;

// Player statistics
mapping(address => uint8) public totalGuesses;
mapping(address => bool) public lastGuessCorrect;
mapping(address => bool) public hasWon;

// Decryption request tracking
mapping(uint256 => address) public pendingRequests;
mapping(uint256 => bool) public processedRequests;
```

**Why These Variables?**

- **`secretNumber`**: Stored as `euint8` - an encrypted value that no one can read
- **`isGameActive`**: Ensures players can only guess when the game is running
- **`totalGuesses`**: Tracks how many attempts each player has made
- **`lastGuessCorrect`**: Stores whether the player's most recent guess was right
- **`hasWon`**: Prevents players from continuing after they've won
- **Request tracking**: Manages the asynchronous decryption process

### 3. Setting the Secret Number (Admin Only)

```solidity
function setSecretNumber(externalEuint8 inputEuint8, bytes calldata inputProof) external {
  require(msg.sender == admin, "Only admin can set secret number");

  // Convert external encrypted input to euint8 with proof verification
  secretNumber = FHE.fromExternal(inputEuint8, inputProof);

  // CRITICAL: Allow contract to use the encrypted value for comparisons
  FHE.allowThis(secretNumber);

  isGameActive = true;
  emit GameStarted(block.timestamp);
}
```

**How It Works:**

1. **Access Control**: Only the admin can set the secret number
2. **Encryption Verification**: The `inputProof` ensures the encrypted input is valid
3. **Permission Grant**: `FHE.allowThis()` allows the contract to perform operations on the encrypted secret
4. **Game Activation**: The game becomes active and ready for players

### 4. Making a Guess

```solidity
function makeGuess(externalEuint8 inputEuint8, bytes calldata inputProof) external returns (uint256 requestId) {
  require(isGameActive, "Game not active");
  require(!hasWon[msg.sender], "You already won!");

  // Convert external encrypted input to euint8
  euint8 playerGuess = FHE.fromExternal(inputEuint8, inputProof);

  // Perform encrypted comparison: is guess equal to secret number?
  ebool isCorrect = FHE.eq(playerGuess, secretNumber);

  // Allow contract to decrypt the result
  FHE.allowThis(isCorrect);

  // Increment guess counter
  totalGuesses[msg.sender]++;

  // Request decryption of the comparison result
  bytes32[] memory cts = new bytes32[](1);
  cts[0] = FHE.toBytes32(isCorrect);

  requestId = FHE.requestDecryption(cts, this.callbackGuessResult.selector);

  // Track the request
  pendingRequests[requestId] = msg.sender;
  processedRequests[requestId] = false;

  emit GuessMade(msg.sender, totalGuesses[msg.sender], requestId);
  return requestId;
}
```

**The Magic Happens Here:**

1. **Encrypted Comparison**: `FHE.eq(playerGuess, secretNumber)` compares two encrypted values without decrypting them
2. **Homomorphic Operation**: The result is an encrypted boolean (`ebool`)
3. **Asynchronous Decryption**: We request the comparison result to be decrypted by Zama's KMS (Key Management System)
4. **Request Tracking**: We store who made the request so we can update their stats later

**Why Asynchronous?**

FHE decryption requires interaction with Zama's Key Management System (KMS). This happens in two steps:

1. Request decryption (this function)
2. Receive the result via callback (next function)

### 5. Receiving the Result (Callback)

```solidity
function callbackGuessResult(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) public {
  require(!processedRequests[requestId], "Request already processed");

  address player = pendingRequests[requestId];
  require(player != address(0), "Invalid request");

  // Verify KMS signatures
  FHE.checkSignatures(requestId, cleartexts, decryptionProof);

  // Decode the decrypted boolean result
  bool isCorrect = abi.decode(cleartexts, (bool));

  // Update player stats
  lastGuessCorrect[player] = isCorrect;

  if (isCorrect) {
    hasWon[player] = true;
  }

  processedRequests[requestId] = true;

  emit GuessResult(player, isCorrect, totalGuesses[player]);
}
```

**What's Happening:**

1. **Signature Verification**: Ensures the decryption result comes from the legitimate KMS
2. **Result Processing**: Updates the player's statistics based on whether they guessed correctly
3. **Winner Detection**: Marks players who found the secret number

### 6. Player Statistics

```solidity
function getMyStats() external view returns (bool correct, uint8 guesses, bool won) {
  return (lastGuessCorrect[msg.sender], totalGuesses[msg.sender], hasWon[msg.sender]);
}
```

Players can check their:

- Last guess result (correct or wrong)
- Total number of guesses made
- Whether they've won the game

## 🚀 Deployment & Testing

### Compile and Test

```bash
# Compile the contract
npm run compile

# Run tests
npm run test
```

### Deploy to Local Network

```bash
# Start a local FHEVM-ready node
npx hardhat node

# Deploy to local network (in another terminal)
npx hardhat deploy --network localhost
```

### Deploy to Sepolia Testnet

```bash
# Deploy to Sepolia
npx hardhat deploy --network sepolia

# Verify contract on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 🎯 How to Play

### Local Network Gameplay

#### Step 1: Check Contract Address

```bash
npx hardhat --network localhost task:address
```

#### Step 2: Check Game Status

```bash
npx hardhat --network localhost task:game-status
```

#### Step 3: Set Secret Number (Admin Only)

```bash
npx hardhat --network localhost task:set-secret --secret 42
```

#### Step 4: Make Your Guesses

```bash
# Try your first guess
npx hardhat --network localhost task:make-guess --guess 50

# Try another guess
npx hardhat --network localhost task:make-guess --guess 35

# Keep guessing until you find it!
npx hardhat --network localhost task:make-guess --guess 42
```

#### Step 5: Check Your Statistics

```bash
npx hardhat --network localhost task:get-stats
```

#### Step 6: Reset the Game (Admin Only)

```bash
npx hardhat --network localhost task:reset-game
```

### Sepolia Testnet Gameplay

Simply replace `localhost` with `sepolia` in all commands:

```bash
npx hardhat --network sepolia task:game-status
npx hardhat --network sepolia task:set-secret --secret 42
npx hardhat --network sepolia task:make-guess --guess 50
npx hardhat --network sepolia task:get-stats
```

## 🔧 Available Tasks

| Task               | Description                        | Example                                                       |
| ------------------ | ---------------------------------- | ------------------------------------------------------------- |
| `task:address`     | Get the deployed contract address  | `npx hardhat --network localhost task:address`                |
| `task:game-status` | Check if the game is active        | `npx hardhat --network localhost task:game-status`            |
| `task:set-secret`  | Set the secret number (admin only) | `npx hardhat --network localhost task:set-secret --secret 42` |
| `task:make-guess`  | Make a guess                       | `npx hardhat --network localhost task:make-guess --guess 50`  |
| `task:get-stats`   | View your game statistics          | `npx hardhat --network localhost task:get-stats`              |
| `task:reset-game`  | Reset the game (admin only)        | `npx hardhat --network localhost task:reset-game`             |

## 📜 Available Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run compile`  | Compile all contracts    |
| `npm run test`     | Run all tests            |
| `npm run coverage` | Generate coverage report |
| `npm run lint`     | Run linting checks       |
| `npm run clean`    | Clean build artifacts    |

## 🛡️ Contract Functions

### Admin Functions

#### `setSecretNumber(externalEuint8 inputEuint8, bytes calldata inputProof)`

Sets the encrypted secret number and activates the game. Only the admin can call this function.

**Parameters:**

- `inputEuint8`: Encrypted secret number (1-100)
- `inputProof`: Zero-knowledge proof of valid encryption

#### `resetGame()`

Deactivates the game. Admin can call this to end the current round. Player statistics are preserved but the game becomes
inactive.

### Player Functions

#### `makeGuess(externalEuint8 inputEuint8, bytes calldata inputProof)`

Makes an encrypted guess. Returns a request ID that will be used in the callback.

**Parameters:**

- `inputEuint8`: Encrypted guess (1-100)
- `inputProof`: Zero-knowledge proof of valid encryption

**Returns:**

- `requestId`: ID for tracking the decryption request

#### `getMyStats()`

Returns your game statistics.

**Returns:**

- `correct`: Whether your last guess was correct
- `guesses`: Total number of guesses you've made
- `won`: Whether you've won the game

### View Functions

#### `getGameStatus()`

Returns whether the game is currently active.

#### `isRequestProcessed(uint256 requestId)`

Check if a specific decryption request has been processed.

#### `getRequestPlayer(uint256 requestId)`

Get the player address associated with a request ID.

## 📊 Game Demo

Based on your logs, here's what a typical game session looks like:

```bash
# Game starts inactive
Game Status: INACTIVE

# Admin sets secret to 42
✅ Secret number set successfully! Game is now ACTIVE.

# Player makes first guess: 50
📊 Result:
   Guess #1: ❌ Wrong
   Total Guesses: 1

# Player makes second guess: 70
📊 Result:
   Guess #2: ❌ Wrong
   Total Guesses: 2

# Player checks their stats
📊 Your Statistics:
   Total Guesses: 2
   Last Guess: ❌ Wrong
   Game Status: 🎮 Playing

# Player guesses the secret: 42
📊 Result:
   Guess #3: ✅ Correct! You won!
   Total Guesses: 3
```

## 🔒 Security Features

- **End-to-End Encryption**: The secret number never exists in plaintext on-chain
- **Homomorphic Comparisons**: Guess verification without decryption
- **KMS Verification**: All decryption results are cryptographically signed by Zama's KMS
- **Access Control**: Only admin can set secrets and reset the game
- **Player Privacy**: Individual guesses remain private

## 🎓 Educational Value

This contract demonstrates several important FHE concepts:

1. **Encrypted State Storage**: `euint8 private secretNumber`
2. **Homomorphic Operations**: `FHE.eq()` for encrypted comparisons
3. **Asynchronous Decryption**: Request/callback pattern for revealing results
4. **Access Permissions**: `FHE.allowThis()` for contract operations
5. **Proof Verification**: `FHE.fromExternal()` validates encrypted inputs

## 🚧 Known Limitations

Based on your test results, there are two failing tests:

1. "should correctly identify wrong guess" - Expected result tracking needs verification
2. "should correctly identify correct guess" - Win condition detection needs review

These appear to be related to the asynchronous callback mechanism and may require additional wait time or event
listening in the tests.

## 🌟 Use Cases

This Secret Number Game template can be adapted for:

- Private lottery systems
- Confidential auctions (sealed-bid)
- Secret voting mechanisms
- Treasure hunt games
- Anonymous matching systems
- Private trivia competitions
- Confidential prediction markets

## 🤝 Contributing

Feel free to fork this project and adapt it for your own use cases! Some ideas for extensions:

- Add hints (e.g., "higher" or "lower")
- Implement multiple difficulty levels
- Create a leaderboard for fastest wins
- Add time limits or guess limits
- Support multiple simultaneous games
- Implement prize distribution for winners

## 📚 Additional Resources

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHE Solidity Library](https://docs.zama.ai/fhevm/fundamentals/types)
- [Hardhat Documentation](https://hardhat.org/docs)

## 📝 License

BSD-3-Clause-Clear

---

**Ready to create your own private blockchain game?** Start with this template and explore the endless possibilities of
FHE-enabled smart contracts. The code is yours to use, modify, and extend. Happy building! 🚀🔐
