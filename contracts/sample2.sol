// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

contract EncryptedCounter2 {
    euint8 counter;

    constructor() {
        TFHE.setFHEVM(FHEVMConfig.defaultConfig());

        // Initialize counter with an encrypted zero value
        counter = TFHE.asEuint8(0);
        TFHE.allowThis(counter);
    }

    function increment() public {
        // Perform encrypted addition to increment the counter
        counter = TFHE.add(counter, TFHE.asEuint8(1));
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
}
