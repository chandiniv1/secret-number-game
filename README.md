# Building a Secret Number Guessing Game with Fully Homomorphic Encryption (FHE)

> **A Complete "Hello FHEVM" Tutorial for Web3 Developers**
> 
> Learn how to build your first confidential dApp on Ethereum using Zama's FHEVM protocol. No prior FHE or cryptography knowledge required!

## 🎯 What You'll Learn

By following this tutorial, you will:

1. ✅ Understand the basics of FHEVM and why confidential smart contracts matter
2. ✅ Set up a complete development environment for building FHE-enabled dApps
3. ✅ Deploy and interact with a fully functional FHEVM smart contract
4. ✅ Experience the complete **encryption → computation → decryption** workflow
5. ✅ Gain confidence to start building your own confidential applications

## 📋 Prerequisites

Before starting, you should have:

- **Node.js**: Version 20 or higher
- **npm or yarn/pnpm**: Package manager
- **Metamask**: Browser wallet extension
- **Git**: For cloning the repository

## Introduction

Privacy on the blockchain has always been a challenge. Traditional smart contracts expose all data publicly, making it impossible to create truly private games or applications. Enter **Fully Homomorphic Encryption (FHE)** – a revolutionary cryptographic technique that allows computations on encrypted data without ever decrypting it.

In this tutorial, we'll build a **Secret Number Guessing Game** smart contract using Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine), demonstrating how you can create engaging, private gaming experiences on Ethereum where even the game's secret remains completely hidden.

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

### Why Does This Matter?

Traditional blockchains are transparent by design - every transaction and state change is visible to everyone. While this transparency is great for auditability, it creates major problems for:

- 🎮 **Gaming**: Players can see game state and cheat
- 🗳️ **Voting**: Votes can be tracked and manipulated
- 💰 **Auctions**: Bids are visible, eliminating fair competition
- 🏥 **Healthcare**: Patient data needs privacy
- 💼 **Finance**: Trading strategies get front-run

**FHEVM solves this by allowing smart contracts to work with encrypted data**, creating a new world of truly private, confidential applications on public blockchains.

## The Problem We're Solving

Imagine you want to create a guessing game on-chain where players try to guess a secret number (1-100), but you want to ensure:

- The secret number remains completely hidden (even from miners and validators)
- Players can verify if their guess is correct without revealing the secret
- Each player's guesses remain private
- The game is provably fair without exposing the answer

Traditional smart contracts can't provide this level of privacy because all state variables are visible on the blockchain. With FHE, we can solve this problem elegantly.

## 🎮 Project Overview

The Secret Number Game is a confidential guessing game that demonstrates the power of Fully Homomorphic Encryption on the blockchain. An admin sets a secret number (1-100), and players try to guess it. All comparisons happen on encrypted data, keeping the secret truly secret until someone guesses it correctly!

### Key Features

- **Fully Private Secret**: The secret number is encrypted and never revealed
- **Confidential Comparisons**: Guess verification happens on encrypted data
- **Player Privacy**: Track your guesses without exposing them to others
- **Provably Fair**: Results are verifiable without compromising the secret
- **Multi-Player Support**: Multiple players can play simultaneously with independent tracking

### The Complete Encryption → Computation → Decryption Flow

This tutorial demonstrates the full FHEVM workflow:

1. **Encryption** (Client-side): Player encrypts their guess using fhevmjs
2. **Computation** (On-chain): Smart contract compares encrypted guess with encrypted secret
3. **Decryption** (Via KMS): Result is decrypted by Zama's Key Management System
4. **Callback** (On-chain): Decrypted result updates player stats

## 🚀 Quick Start

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/chandiniv1/secret-number-game.git
cd secret-number-game

# Install dependencies
npm install
```

### Step 2: Set Up Environment Variables

For local development:

```bash
# The mnemonic for local testing is already set in hardhat.config.ts
# No additional setup needed for localhost!
```

For testnet deployment (optional):

```bash
# Set your wallet mnemonic
npx hardhat vars set MNEMONIC

# Set your Infura API key for network access
npx hardhat vars set INFURA_API_KEY

# Optional: Set Etherscan API key for contract verification
npx hardhat vars set ETHERSCAN_API_KEY
```

### Step 3: Compile and Test

```bash
# Compile the contract
npx hardhat compile

# Run tests to verify everything works
npx hardhat test
```

You should see output similar to:

```
  SecretNumberGame
    Deployment
      ✔ should set the correct admin
      ✔ should have game inactive initially
    Setting Secret Number
      ✔ admin should be able to set secret number and activate game
      ✔ non-admin should not be able to set secret number
    Making Guesses
      ✔ should revert when game is not active
      ✔ should allow player to make a guess and increment counter
      ✔ should correctly identify wrong guess
      ✔ should prevent players from guessing after they won
      ✔ should track multiple guesses from the same player
      ✔ should track different players independently
    Game Statistics
      ✔ should return correct stats for player
      ✔ should return default stats for player who hasn't guessed
    Reset Game
      ✔ admin should be able to reset game
      ✔ non-admin should not be able to reset game
      ✔ should deactivate game after reset
    Request Tracking
      ✔ should track request player
      ✔ should mark request as processed after callback
```

### Step 4: Start Local Network

```bash
# Start a local FHEVM-ready node
npx hardhat node
```

Keep this terminal running - it's your local blockchain!

### Step 5: Deploy the Contract

In a **new terminal**, deploy to your local network:

```bash
# Deploy to local network
npx hardhat deploy --network localhost
```

You'll see output like:

```
✅ SecretNumberGame deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   Admin address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Save that contract address!** You'll need it for the next steps.

## 🎯 Playing the Game (Step-by-Step)

Now let's play the game! We'll walk through the complete workflow.

### Step 1: Check Contract Address

```bash
npx hardhat --network localhost task:address
```

### Step 2: Check Game Status

```bash
npx hardhat --network localhost task:game-status
```

You should see:

```
🎮 Game Status: INACTIVE
   The admin needs to set a secret number first.
```

### Step 3: Set Secret Number (Admin Only)

The admin sets the secret number that players will try to guess:

```bash
npx hardhat --network localhost task:set-secret --secret 42
```

**What's happening behind the scenes:**

1. Your number (42) is **encrypted on the client** using fhevmjs
2. A zero-knowledge proof is generated to prove valid encryption
3. The encrypted value is sent to the smart contract
4. The contract stores the encrypted number and activates the game

You should see:

```
✅ Secret number set successfully! Game is now ACTIVE.
```

### Step 4: Make Your First Guess

Now let's try guessing! Start with 50:

```bash
npx hardhat --network localhost task:make-guess --guess 50
```

**What's happening:**

1. Your guess (50) is **encrypted client-side**
2. The contract performs an **encrypted comparison** between your guess and the secret
3. A decryption request is sent to Zama's KMS
4. The callback updates your stats with the result

After a moment, you'll see:

```
📊 Result:
   Guess #1: ❌ Wrong
   Total Guesses: 1
```

### Step 5: Keep Guessing!

Try different numbers:

```bash
# Try 70
npx hardhat --network localhost task:make-guess --guess 70

# Try 35
npx hardhat --network localhost task:make-guess --guess 35

# Try the secret number!
npx hardhat --network localhost task:make-guess --guess 42
```

When you guess correctly:

```
📊 Result:
   Guess #3: ✅ Correct! You won!
   Total Guesses: 3

🎉 Congratulations! You found the secret number!
```

### Step 6: Check Your Statistics

At any time, check your game stats:

```bash
npx hardhat --network localhost task:get-stats
```

Output:

```
📊 Your Statistics:
   Total Guesses: 3
   Last Guess: ✅ Correct
   Game Status: 🏆 Winner!
```

### Step 7: Reset the Game (Admin Only)

The admin can reset for a new round:

```bash
npx hardhat --network localhost task:reset-game
```

## 📁 Project Structure

```
secret-number-game/
├── contracts/                    # Smart contract source files
│   └── SecretNumberGame.sol      # Main FHE guessing game contract
├── deploy/                       # Deployment scripts
├── tasks/                        # Hardhat custom tasks
│   └── FHESecretNumberGuess.ts   # Task definitions for interaction
├── test/                         # Test files
│   └── FHESecretNumberGame.ts    # Contract tests
├── hardhat.config.ts             # Hardhat configuration
└── package.json                  # Dependencies and scripts
```

## 🔍 Understanding the Contract

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

**Understanding the Encryption Flow:**

- The admin encrypts "42" on their device using fhevmjs
- The encrypted value + proof is sent to the blockchain
- No one (not even miners or validators) can see what number was encrypted
- The contract can still use this encrypted value for comparisons!

### 4. Making a Guess (The Magic Happens Here!)

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

1. **Encrypted Input**: Player's guess arrives already encrypted from their device
2. **Homomorphic Comparison**: `FHE.eq(playerGuess, secretNumber)` compares two encrypted values **without decrypting them**
3. **Encrypted Result**: The result is an encrypted boolean (`ebool`)
4. **Asynchronous Decryption**: We request the comparison result to be decrypted by Zama's KMS
5. **Request Tracking**: We store who made the request so we can update their stats later

**Why Asynchronous?**

FHE decryption requires interaction with Zama's Key Management System (KMS). This happens in two steps:

1. **Request decryption** (this function) - Ask the KMS to decrypt the result
2. **Receive the result via callback** (next function) - KMS sends back the decrypted value

This design keeps the heavy cryptographic work off-chain while maintaining trustlessness through cryptographic proofs.

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

1. **KMS Callback**: Zama's Key Management System calls this function with the decrypted result
2. **Signature Verification**: Ensures the decryption result comes from the legitimate KMS (trustless!)
3. **Result Processing**: Updates the player's statistics based on whether they guessed correctly
4. **Winner Detection**: Marks players who found the secret number

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

## 🌐 Deploying to Zama Testnet

Ready to deploy your dApp to the public testnet?

### Step 1: Get Testnet Tokens

Visit the [Zama Faucet](https://faucet.zama.ai/) to get testnet tokens.

### Step 2: Configure Your Environment

```bash
# Set your wallet mnemonic
npx hardhat vars set MNEMONIC

# Set your Infura API key
npx hardhat vars set INFURA_API_KEY
```

### Step 3: Deploy

```bash
# Deploy to Sepolia testnet
npx hardhat deploy --network sepolia

# Verify contract on Etherscan (optional)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Step 4: Play on Testnet

All the same commands work - just replace `localhost` with `sepolia`:

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

## 🛡️ Contract Functions Reference

### Admin Functions

#### `setSecretNumber(externalEuint8 inputEuint8, bytes calldata inputProof)`

Sets the encrypted secret number and activates the game. Only the admin can call this function.

**Parameters:**

- `inputEuint8`: Encrypted secret number (1-100)
- `inputProof`: Zero-knowledge proof of valid encryption

#### `resetGame()`

Deactivates the game. Admin can call this to end the current round. Player statistics are preserved but the game becomes inactive.

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

## 🎓 Key Concepts You've Learned

By completing this tutorial, you now understand:

### 1. **Encrypted State Storage**
- How to store encrypted values on-chain using `euint8`
- The secret number lives encrypted forever on the blockchain

### 2. **Homomorphic Operations**
- Using `FHE.eq()` to compare encrypted values without decrypting them
- Performing computations on encrypted data

### 3. **Asynchronous Decryption Pattern**
- Requesting decryption from Zama's KMS
- Handling callbacks with decrypted results
- Verifying cryptographic proofs for trustlessness

### 4. **Access Permissions**
- Using `FHE.allowThis()` to grant contract operations on encrypted data
- Managing who can read/use encrypted values

### 5. **Proof Verification**
- How `FHE.fromExternal()` validates encrypted inputs
- Zero-knowledge proofs ensure data integrity

## 🔒 Security Features

This dApp demonstrates real-world security properties:

- **End-to-End Encryption**: The secret number never exists in plaintext on-chain
- **Homomorphic Comparisons**: Guess verification without decryption
- **KMS Verification**: All decryption results are cryptographically signed by Zama's KMS
- **Access Control**: Only admin can set secrets and reset the game
- **Player Privacy**: Individual guesses remain private
- **Trustless Decryption**: Cryptographic proofs verify all decrypted results

## 📊 Complete Game Flow Diagram

```
┌─────────────┐
│   Player    │
│   Device    │
└──────┬──────┘
       │ 1. Encrypt guess with fhevmjs
       │    (42 → encrypted blob + proof)
       ▼
┌─────────────────────────────────────────────┐
│          Smart Contract (On-chain)          │
│                                             │
│  2. Receive encrypted guess + proof         │
│  3. Verify proof with FHE.fromExternal()    │
│  4. Compare: FHE.eq(guess, secret)          │
│     → Result is encrypted boolean           │
│  5. Request decryption from KMS             │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│    Zama Key Management System (KMS)         │
│                                             │
│  6. Decrypt the comparison result           │
│  7. Sign the result with cryptographic proof│
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│       Smart Contract (Callback)             │
│                                             │
│  8. Receive decrypted result + signature    │
│  9. Verify KMS signature                    │
│  10. Update player stats (won/lost)         │
└─────────────────────────────────────────────┘
```

## 🌟 Real-World Use Cases

This Secret Number Game template demonstrates patterns that can be adapted for:

### Gaming & Entertainment
- 🎲 Private lottery systems
- 🎰 Provably fair casino games
- 🏴‍☠️ Treasure hunt games with hidden clues
- 🎮 RPG games with hidden stats

### Finance & Trading
- 💰 Confidential auctions (sealed-bid)
- 📈 Private prediction markets
- 🔐 Anonymous trading systems
- 💱 Dark pool implementations

### Governance & Voting
- 🗳️ Secret ballot voting
- 🏛️ Private governance mechanisms
- 👥 Anonymous polling systems

### Social & Matching
- ❤️ Anonymous matching systems
- 🤝 Private recommendation engines
- 🎯 Confidential skill-based matchmaking

### Learning More About FHE
- [What is Fully Homomorphic Encryption?](https://www.zama.ai/post/what-is-homomorphic-encryption)
- [Zama Blog - FHE Use Cases](https://www.zama.ai/blog)
- [Zama dApp Examples](https://github.com/zama-ai/fhevm-contracts)

### Developer Tools
- [Hardhat Documentation](https://hardhat.org/docs)
- [fhevmjs Library](https://github.com/zama-ai/fhevmjs)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm)



## 🎉 Congratulations!

You've successfully built and deployed your first confidential smart contract using Fully Homomorphic Encryption!

**What makes this special:**
- ✅ You've created a truly private application on a public blockchain
- ✅ You understand the complete encryption → computation → decryption workflow
- ✅ You can now build more complex confidential dApps
- ✅ You're ready to explore the exciting world of blockchain privacy

Happy building! 🚀🔐
