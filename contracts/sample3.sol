// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/gateway/GatewayCaller.sol";

contract EncryptedCounter3 is GatewayCaller {
    /// @dev Decrypted state variable
    euint8 counter;
    uint8 public decryptedCounter;

    constructor() {
        TFHE.setFHEVM(FHEVMConfig.defaultConfig());
        Gateway.setGateway(Gateway.defaultGatewayAddress());

        // Initialize counter with an encrypted zero value
        counter = TFHE.asEuint8(0);
        TFHE.allowThis(counter);
    }

    function increment() public {
        // Perform encrypted addition to increment the counter
        counter = TFHE.add(counter, TFHE.asEuint8(1));

        // Ensure this contract has access to the updated counter value
        TFHE.allowThis(counter);
    }

    function incrementBy(einput amount, bytes calldata inputProof) public {
        // Convert input to euint8 and add to counter
        euint8 incrementAmount = TFHE.asEuint8(amount, inputProof);
        counter = TFHE.add(counter, incrementAmount);
        TFHE.allowThis(counter);
    }

    function getCounter() public view returns (euint8) {
        // Return the encrypted counter value
        return counter;
    }

    /// @notice Request decryption of the counter value
    function requestDecryptCounter() public {
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(counter);
        Gateway.requestDecryption(cts, this.callbackCounter.selector, 0, block.timestamp + 100, false);
    }

    /// @notice Callback function for counter decryption
    /// @param decryptedInput The decrypted counter value
    /// @return The decrypted value
    function callbackCounter(uint256, uint8 decryptedInput) public onlyGateway returns (uint8) {
        decryptedCounter = decryptedInput;
        return decryptedInput;
    }

    /// @notice Get the decrypted counter value
    /// @return The decrypted counter value
    function getDecryptedCounter() public view returns (uint8) {
        return decryptedCounter;
    }
}
