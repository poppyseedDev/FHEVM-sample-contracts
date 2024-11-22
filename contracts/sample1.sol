// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

contract EncryptedCounter1 {
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

    function getCounter() public view returns (euint8) {
        // Return the encrypted counter value
        return counter;
    }
}
