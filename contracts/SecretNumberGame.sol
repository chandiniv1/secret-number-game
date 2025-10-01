// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title SecretNumberGame
 * @notice A simple guessing game where players try to guess a secret number (1-100)
 * @dev Demonstrates FHEVM's encrypted computations: encrypted secret, encrypted guesses, public results
 */
contract SecretNumberGame is SepoliaConfig {
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

    // Events
    event GameStarted(uint256 timestamp);
    event GuessMade(address indexed player, uint8 guessCount, uint256 requestId);
    event GuessResult(address indexed player, bool correct, uint8 totalGuesses);
    event GameReset(uint256 timestamp);

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Admin sets the secret number to start the game
     * @param inputEuint8 Encrypted number input from off-chain
     * @param inputProof Zero-knowledge proof for the encrypted input
     */
    function setSecretNumber(externalEuint8 inputEuint8, bytes calldata inputProof) external {
        require(msg.sender == admin, "Only admin can set secret number");

        // Convert external encrypted input to euint8 with proof verification
        secretNumber = FHE.fromExternal(inputEuint8, inputProof);

        // CRITICAL: Allow contract to use the encrypted value for comparisons
        FHE.allowThis(secretNumber);

        isGameActive = true;
        emit GameStarted(block.timestamp);
    }

    /**
     * @notice Player makes a guess
     * @param inputEuint8 Encrypted guess from off-chain
     * @param inputProof Zero-knowledge proof for the encrypted guess
     * @return requestId The decryption request ID
     */
    function makeGuess(externalEuint8 inputEuint8, bytes calldata inputProof) external returns (uint256 requestId) {
        require(isGameActive, "Game not active");
        require(!hasWon[msg.sender], "You already won!");

        // Convert external encrypted input to euint8 with proof verification
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

    /**
     * @notice Callback for decryption result
     * @param requestId The decryption request ID
     * @param cleartexts The decrypted values
     * @param decryptionProof The proof from KMS
     */
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

    /**
     * @notice Check your game statistics
     * @return correct Whether your last guess was correct
     * @return guesses Total number of guesses you've made
     * @return won Whether you've won the game
     */
    function getMyStats() external view returns (bool correct, uint8 guesses, bool won) {
        return (lastGuessCorrect[msg.sender], totalGuesses[msg.sender], hasWon[msg.sender]);
    }

    /**
     * @notice Check if a decryption request has been processed
     * @param requestId The request ID to check
     * @return processed Whether the request has been processed
     */
    function isRequestProcessed(uint256 requestId) external view returns (bool) {
        return processedRequests[requestId];
    }

    /**
     * @notice Get the player associated with a request
     * @param requestId The request ID
     * @return player The player's address
     */
    function getRequestPlayer(uint256 requestId) external view returns (address) {
        return pendingRequests[requestId];
    }

    /**
     * @notice Reset the game (admin only)
     * @dev Clears all player stats and deactivates the game
     */
    function resetGame() external {
        require(msg.sender == admin, "Only admin can reset");

        isGameActive = false;

        emit GameReset(block.timestamp);
    }

    /**
     * @notice Check if game is currently active
     * @return active The game status
     */
    function getGameStatus() external view returns (bool active) {
        return isGameActive;
    }
}
